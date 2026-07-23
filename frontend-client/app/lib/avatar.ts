const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_STORED_BYTES = 256 * 1024;
const MAX_EDGE = 512;

function decodedBytes(dataUrl: string): number {
    const encoded = dataUrl.split(",", 2)[1] || "";
    const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
}

async function loadImage(file: File): Promise<HTMLImageElement> {
    const objectUrl = URL.createObjectURL(file);
    try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new window.Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Could not read the selected image"));
            image.src = objectUrl;
        });
    } finally {
        // Image data has already been decoded when onload resolves.
        URL.revokeObjectURL(objectUrl);
    }
}

/**
 * Resize and compress an avatar before it crosses the network. The backend
 * repeats all trust-boundary checks and never relies on these client checks.
 */
export async function prepareAvatar(file: File): Promise<string> {
    if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error("UNSUPPORTED_TYPE");
    }
    if (file.size === 0 || file.size > MAX_SOURCE_BYTES) {
        throw new Error("SOURCE_TOO_LARGE");
    }

    const image = await loadImage(file);
    if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error("INVALID_IMAGE");
    }

    let scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("IMAGE_PROCESSING_FAILED");

    for (let attempt = 0; attempt < 8; attempt += 1) {
        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const quality = Math.max(0.5, 0.86 - attempt * 0.06);
        const dataUrl = canvas.toDataURL("image/webp", quality);
        if (decodedBytes(dataUrl) <= MAX_STORED_BYTES) {
            return dataUrl;
        }

        scale *= 0.84;
        width = Math.max(1, Math.round(image.naturalWidth * scale));
        height = Math.max(1, Math.round(image.naturalHeight * scale));
    }

    throw new Error("COMPRESSED_TOO_LARGE");
}
