// ===============================================
// 🔐 Password utilities
// ===============================================

import crypto from 'crypto';

/**
 * Generate a strong temporary password. The fixed `A` prefix and `9` suffix
 * guarantee an uppercase letter and a digit so the value always satisfies the
 * User schema password validator (min length + uppercase + number).
 *
 * The result is meant to be shown to an admin exactly once (e.g. after a
 * password reset) and never logged or persisted in plaintext.
 */
export function generateTempPassword(): string {
    const raw = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '');
    return `A${raw}9`;
}
