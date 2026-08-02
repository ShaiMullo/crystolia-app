// ===============================================
// 🏦 Bank-detail normalization & validation
// ===============================================
// Pure helpers shared by the settings save route and its tests. Bank details
// are business-critical payment instructions: a typo here sends customer
// money to the wrong place, so an enabled bank-transfer method is validated
// structurally (IBAN mod-97, SWIFT format) and cross-checked (an Israeli
// IBAN embeds the branch and account number — they must agree with the
// separately entered fields) before it can be saved.

/** Uppercase and strip all whitespace — the stored canonical IBAN form. */
export function normalizeIban(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

/** Uppercase and strip all whitespace — the stored canonical SWIFT/BIC form. */
export function normalizeSwift(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

/** ISO 13616 check: structure + mod-97 checksum over the rearranged IBAN. */
export function isValidIban(iban: string): boolean {
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let remainder = 0;
    for (const ch of rearranged) {
        const part = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
        for (const digit of part) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
}

/** ISO 9362: 4 letters (bank) + 2 letters (country) + 2 alnum + optional 3-alnum branch. */
export function isValidSwift(swift: string): boolean {
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);
}

export interface IlIbanParts {
    bankCode: string;
    branch: string;
    accountNumber: string;
}

/** The bank/branch/account components embedded in an Israeli IBAN
 *  (IL + 2 check digits + 3 bank + 3 branch + 13 account), or null when the
 *  IBAN is not a structurally valid Israeli one. */
export function ilIbanParts(iban: string): IlIbanParts | null {
    const match = iban.match(/^IL\d{2}(\d{3})(\d{3})(\d{13})$/);
    if (!match) return null;
    return { bankCode: match[1], branch: match[2], accountNumber: match[3] };
}

function digitsOf(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Precise reason an Israeli IBAN disagrees with the separately entered
 * branch / account-number fields, or null when they agree (or cannot be
 * compared because a field contains no digits). Comparison ignores
 * formatting and leading zeros.
 */
export function ilIbanMismatch(iban: string, branch: string, accountNumber: string): string | null {
    const parts = ilIbanParts(iban);
    if (!parts) return null;
    const branchDigits = digitsOf(branch);
    if (branchDigits && Number(branchDigits) !== Number(parts.branch)) {
        return `IBAN branch (${Number(parts.branch)}) does not match the branch field (${branch})`;
    }
    const accountDigits = digitsOf(accountNumber);
    if (accountDigits && Number(accountDigits) !== Number(parts.accountNumber)) {
        return `IBAN account (${Number(parts.accountNumber)}) does not match the account-number field (${accountNumber})`;
    }
    return null;
}
