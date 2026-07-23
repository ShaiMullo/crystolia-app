// ===============================================
// 🖼️ Avatar validation helpers
// ===============================================
// Uploaded avatars are stored as small data URLs on the User document. This
// keeps them durable across container deployments without introducing a
// separate object-storage dependency. Only raster formats are accepted.

export const MAX_AVATAR_BYTES = 256 * 1024;
export const MAX_AVATAR_DATA_URL_LENGTH = 360_000;

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function hasExpectedSignature(mime: string, bytes: Buffer): boolean {
    if (mime === 'image/jpeg') {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (mime === 'image/png') {
        const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        return bytes.length >= png.length && png.every((value, index) => bytes[index] === value);
    }
    if (mime === 'image/webp') {
        return bytes.length >= 12
            && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
            && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
}

export function normalizeUploadedAvatar(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > MAX_AVATAR_DATA_URL_LENGTH) {
        return null;
    }

    const match = DATA_URL_PATTERN.exec(value);
    if (!match) return null;

    const [, mime, encoded] = match;
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES || !hasExpectedSignature(mime, bytes)) {
        return null;
    }

    // Re-encode to make the stored value canonical and reject malformed base64
    // that Node's permissive decoder might otherwise partially accept.
    if (bytes.toString('base64') !== encoded) return null;
    return `data:${mime};base64,${encoded}`;
}

export function normalizeGoogleAvatarUrl(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length > 2048) return undefined;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.hostname !== 'lh3.googleusercontent.com' || url.username || url.password) {
            return undefined;
        }
        return url.toString();
    } catch {
        return undefined;
    }
}

export function isGoogleAvatarUrl(value: unknown): boolean {
    return normalizeGoogleAvatarUrl(value) !== undefined;
}
