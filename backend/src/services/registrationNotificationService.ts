// ===============================================
// Registration Notifications (best-effort)
// ===============================================
// Sends the customer emails and the admin SMS for the business-registration
// flow and records delivery outcomes on the user document. Every function
// here is best-effort by contract: a provider outage must never fail or roll
// back a registration, an approval or a rejection. No customer PII or
// credentials are ever written to logs — only delivery status codes.

import { User, IUser } from '../models/User.js';
import { config } from '../config/index.js';
import {
    isEmailConfigured,
    sendRegistrationPendingEmail,
    sendRegistrationApprovedEmail,
    sendRegistrationRejectedEmail,
    type SendEmailResult,
} from './emailService.js';
import {
    buildRegistrationNotificationSms,
    isSmsConfigured,
    sendSms,
    type SendSmsResult,
} from './smsService.js';
import { countryNameHe } from '../utils/countries.js';

export type RegistrationEmailKind = 'pending' | 'approved' | 'rejected';

type NotificationStatus = 'sent' | 'failed' | 'skipped';

function outcome(result: { success: boolean; error?: string }): NotificationStatus {
    if (result.success) return 'sent';
    return result.error === 'Configuration missing' ? 'skipped' : 'failed';
}

/** Persist a delivery outcome without touching anything else on the user. */
async function recordNotification(
    userId: string,
    field: 'pendingEmail' | 'approvedEmail' | 'rejectedEmail' | 'adminSms',
    status: NotificationStatus,
): Promise<void> {
    try {
        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    [`registrationNotifications.${field}Status`]: status,
                    [`registrationNotifications.${field}At`]: new Date(),
                },
            },
        );
    } catch {
        // Bookkeeping only — never surface.
    }
}

/**
 * Send (or resend) one of the customer-facing registration emails and record
 * the outcome. Returns the provider result so callers can report it.
 */
export async function sendRegistrationEmail(
    user: Pick<IUser, 'email' | 'name' | 'preferredLocale'> & { _id: unknown },
    kind: RegistrationEmailKind,
    options: { companyName?: string; reason?: string } = {},
): Promise<SendEmailResult> {
    const details = {
        to: user.email,
        name: user.name,
        companyName: options.companyName,
        locale: user.preferredLocale ?? 'he',
    };

    let result: SendEmailResult;
    if (!isEmailConfigured()) {
        result = { success: false, error: 'Configuration missing' };
    } else if (kind === 'pending') {
        result = await sendRegistrationPendingEmail(details);
    } else if (kind === 'approved') {
        result = await sendRegistrationApprovedEmail(details);
    } else {
        result = await sendRegistrationRejectedEmail({ ...details, reason: options.reason });
    }

    await recordNotification(String(user._id), `${kind}Email`, outcome(result));
    return result;
}

/**
 * Notify the administrator by SMS about a new registration request. Fired
 * AFTER the registration is safely persisted; failures are recorded on the
 * user document and never propagated.
 */
export async function notifyAdminOfRegistration(user: IUser): Promise<SendSmsResult> {
    const registrationUrl =
        `${config.adminFrontendUrl.replace(/\/$/, '')}/admin/registrations/${user._id}`;

    let result: SendSmsResult;
    if (!isSmsConfigured()) {
        result = { success: false, error: 'Configuration missing' };
    } else {
        const message = buildRegistrationNotificationSms({
            contactName: user.name,
            companyName: user.registrationCompany?.name ?? '',
            vatNumber: user.registrationCompany?.vatNumber ?? '',
            phone: user.phone ?? '',
            email: user.email,
            country: countryNameHe(user.registrationCompany?.country ?? ''),
            method: user.registrationMethod === 'google' ? 'google' : 'password',
            registrationUrl,
        });
        result = await sendSms(config.adminPhone, message);
    }

    await recordNotification(String(user._id), 'adminSms', outcome(result));
    return result;
}
