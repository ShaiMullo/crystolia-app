// ===============================================
// ⚙️ Settings Router
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { isDemoPaymentUrl, paymentConfigError } from '../utils/paymentOptions.js';
import {
    bankDetailsFingerprint,
    ilIbanMismatch,
    isValidIban,
    isValidSwift,
    normalizeIban,
    normalizeSwift,
} from '../utils/bankDetails.js';
import { getBankVerificationState, getPaymentMethodsStatus } from '../services/payments/paymentStatusService.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/settings - Get business settings
// 🔒 Protected: All Authenticated Users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await Settings.findOne({ key: 'business' }).lean();

        // Verification metadata is an admin concern — customers get the
        // payment instructions themselves, not the governance trail.
        if (settings && req.user?.role !== 'admin') {
            delete (settings as Record<string, unknown>).bankVerification;
        }

        if (!settings) {
            // No document written yet — return hardcoded defaults so the
            // frontend always gets a valid shape before the first admin save.
            return res.json({
                success: true,
                data: {
                    key: 'business',
                    minimumOrderAmount: 0,
                    boxPrices: [],
                    currency: 'ILS',
                    paymentOptions: {
                        bankTransfer: { enabled: false },
                        creditCard: { enabled: false },
                    },
                },
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUT /api/settings - Upsert business settings
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { minimumOrderAmount, boxPrices, currency, paymentOptions } = req.body;

        if (minimumOrderAmount !== undefined && (typeof minimumOrderAmount !== 'number' || minimumOrderAmount < 0)) {
            throw new AppError('minimumOrderAmount must be a non-negative number', 400);
        }

        const update: Record<string, any> = {
            updatedBy: req.user?._id,
        };

        if (minimumOrderAmount !== undefined) update.minimumOrderAmount = minimumOrderAmount;
        if (currency !== undefined) update.currency = currency;
        if (paymentOptions !== undefined) {
            if (!paymentOptions || typeof paymentOptions !== 'object') {
                throw new AppError('paymentOptions must be an object', 400);
            }
            const bank = paymentOptions.bankTransfer || {};
            const card = paymentOptions.creditCard || {};
            const iban = normalizeIban(bank.iban);
            const swift = normalizeSwift(bank.swift);
            if (bank.enabled) {
                const requiredBankFields = ['bankName', 'branch', 'accountNumber', 'accountName'] as const;
                if (requiredBankFields.some((field) => !String(bank[field] || '').trim())) {
                    throw new AppError('Enabled bank transfer requires bank, branch, account number and account name', 400);
                }
                if (!iban) {
                    throw new AppError('Enabled bank transfer requires an IBAN — approval emails must carry complete transfer instructions', 400);
                }
            }
            if (iban && !isValidIban(iban)) {
                throw new AppError('The IBAN is invalid (failed the ISO 13616 structure/checksum test) — check it against the official bank document', 400);
            }
            if (iban) {
                const mismatch = ilIbanMismatch(iban, String(bank.branch || ''), String(bank.accountNumber || ''));
                if (mismatch) {
                    throw new AppError(`Bank details are inconsistent: ${mismatch}`, 400);
                }
            }
            if (swift && !isValidSwift(swift)) {
                throw new AppError('The SWIFT/BIC code is invalid (expected 8 or 11 characters, e.g. BANKILITXXX)', 400);
            }
            if (card.enabled && !String(card.paymentUrl || '').trim()) {
                throw new AppError('Enabled credit-card payment requires a payment URL', 400);
            }
            if (card.enabled) {
                let parsed: URL;
                try {
                    parsed = new URL(String(card.paymentUrl));
                } catch {
                    throw new AppError('Credit-card payment URL is invalid', 400);
                }
                if (parsed.protocol !== 'https:') {
                    throw new AppError('Credit-card payment URL must use HTTPS', 400);
                }
                if (isDemoPaymentUrl(card.paymentUrl)) {
                    throw new AppError(
                        'The demo payment page cannot be saved as the credit-card provider URL. '
                        + 'Enter a real provider URL, or disable the credit-card method.',
                        400,
                    );
                }
            }
            // A demo-page URL on a DISABLED card method is stale demo residue:
            // drop it on save so it can never resurface if the flag is later
            // re-enabled. (An enabled card with a demo URL was rejected above.)
            const cardUrl = String(card.paymentUrl || '').trim();
            update.paymentOptions = {
                bankTransfer: {
                    enabled: Boolean(bank.enabled),
                    bankName: String(bank.bankName || '').trim(),
                    branch: String(bank.branch || '').trim(),
                    accountNumber: String(bank.accountNumber || '').trim(),
                    accountName: String(bank.accountName || '').trim(),
                    iban,
                    swift,
                    bankAddress: String(bank.bankAddress || '').trim(),
                },
                creditCard: {
                    enabled: Boolean(card.enabled),
                    paymentUrl: !card.enabled && isDemoPaymentUrl(cardUrl) ? '' : cardUrl,
                },
            };
        }
        if (boxPrices !== undefined) {
            if (!Array.isArray(boxPrices)) {
                throw new AppError('boxPrices must be an array', 400);
            }
            update.boxPrices = boxPrices;
        }

        // Owner verification attests a specific fingerprint of the bank
        // fields. If this save changes them away from the verified
        // fingerprint, the verification is invalidated in the SAME write —
        // a stale attestation must never survive a detail change.
        let invalidatedVerification = false;
        if (update.paymentOptions) {
            const existing = await Settings.findOne({ key: 'business' })
                .select('bankVerification')
                .lean();
            if (
                existing?.bankVerification
                && bankDetailsFingerprint(update.paymentOptions.bankTransfer) !== existing.bankVerification.fingerprint
            ) {
                update.bankVerification = null;
                invalidatedVerification = true;
            }
        }

        const settings = await Settings.findOneAndUpdate(
            { key: 'business' },
            { $set: update },
            { upsert: true, new: true, runValidators: true }
        ).lean();

        await logAudit({
            action: 'UPDATE',
            entity: 'Settings',
            entityId: 'business',
            req,
            details: { updatedFields: Object.keys(update).filter(k => k !== 'updatedBy') },
        });
        if (invalidatedVerification) {
            // Field names only — never bank values or the old fingerprint's
            // underlying data.
            await logAudit({
                action: 'BANK_VERIFICATION_INVALIDATED',
                entity: 'Settings',
                entityId: 'business',
                req,
                severity: 'warning',
                details: { reason: 'bank details changed after owner verification' },
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/settings/payment-status - Provider/configuration health
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/payment-status', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await Settings.findOne({ key: 'business' }).select('paymentOptions bankVerification').lean();
        res.json({
            success: true,
            data: {
                ...getPaymentMethodsStatus(settings?.paymentOptions),
                bankVerification: getBankVerificationState(settings),
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/settings/bank-verification - Owner attests the saved bank details
// 🔒 Protected: Admin Only + password re-authentication + rate limited
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// The admin confirms, against the official bank document, that the CURRENTLY
// saved details are correct. The stored record is a fingerprint (hash) of
// those fields — never a copy — so a later change to any covered field breaks
// the match and readiness drops back to "owner confirmation required".
router.post('/bank-verification', authLimiter, protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { password, fingerprint } = req.body ?? {};
        if (typeof password !== 'string' || !password) {
            throw new AppError('Password is required to verify bank details', 400);
        }
        if (typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint)) {
            throw new AppError('The confirmed bank-details fingerprint is required', 400);
        }

        // Re-authentication (same pattern as password change): the session
        // cookie alone is not enough for a financial attestation.
        const user = await User.findById(req.user?._id).select('+password registrationMethod');
        if (!user) throw new AppError('User not found', 404);
        // Google-registered accounts hold an unguessable placeholder password
        // (GOOGLE_OAUTH_…) the owner does not know, so password re-auth is
        // impossible for them by construction.
        if (!user.password || user.registrationMethod === 'google') {
            throw new AppError(
                'This account signs in with Google and has no usable password. Verify with a password-based admin account.',
                409,
            );
        }
        if (!(await user.comparePassword(password))) {
            await logAudit({
                action: 'BANK_VERIFICATION_DENIED',
                entity: 'Settings',
                entityId: 'business',
                req,
                severity: 'warning',
                details: { reason: 'password re-authentication failed' },
            });
            throw new AppError('Password is incorrect', 401);
        }

        const settings = await Settings.findOne({ key: 'business' }).lean();
        const bank = settings?.paymentOptions?.bankTransfer;
        const configError = paymentConfigError('bank_transfer', settings?.paymentOptions);
        if (!settings || configError) {
            throw new AppError(configError || 'Bank transfer is not configured', 409);
        }

        const currentFingerprint = bankDetailsFingerprint(bank);
        if (fingerprint !== currentFingerprint) {
            throw new AppError(
                'The saved bank details changed since you reviewed them — refresh and review again before verifying',
                409,
            );
        }

        const verification = {
            fingerprint: currentFingerprint,
            verifiedAt: new Date(),
            verifiedBy: user._id,
        };
        // CAS on updatedAt: if ANY settings write landed between our read and
        // this write, the attestation may cover stale fields — refuse.
        const updated = await Settings.updateOne(
            { key: 'business', updatedAt: settings.updatedAt },
            { $set: { bankVerification: verification } },
            { timestamps: false },
        );
        if (updated.modifiedCount !== 1) {
            throw new AppError(
                'The settings changed while verifying — refresh and review again before verifying',
                409,
            );
        }

        // Fingerprint only — the audit trail must never hold bank values.
        await logAudit({
            action: 'BANK_DETAILS_VERIFIED',
            entity: 'Settings',
            entityId: 'business',
            req,
            details: { fingerprint: currentFingerprint },
        });

        res.json({
            success: true,
            data: {
                status: 'verified',
                fingerprint: currentFingerprint,
                verifiedAt: verification.verifiedAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
