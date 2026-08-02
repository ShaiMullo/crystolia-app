// ===============================================
// ⚙️ Settings Router
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Settings from '../models/Settings.js';
import { protect, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { isDemoPaymentUrl } from '../utils/paymentOptions.js';
import {
    ilIbanMismatch,
    isValidIban,
    isValidSwift,
    normalizeIban,
    normalizeSwift,
} from '../utils/bankDetails.js';
import { getPaymentMethodsStatus } from '../services/payments/paymentStatusService.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/settings - Get business settings
// 🔒 Protected: All Authenticated Users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await Settings.findOne({ key: 'business' }).lean();

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
                    paymentUrl: String(card.paymentUrl || '').trim(),
                },
            };
        }
        if (boxPrices !== undefined) {
            if (!Array.isArray(boxPrices)) {
                throw new AppError('boxPrices must be an array', 400);
            }
            update.boxPrices = boxPrices;
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
        const settings = await Settings.findOne({ key: 'business' }).select('paymentOptions').lean();
        res.json({ success: true, data: getPaymentMethodsStatus(settings?.paymentOptions) });
    } catch (error) {
        next(error);
    }
});

export default router;
