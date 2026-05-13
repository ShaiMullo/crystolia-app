// Lightweight class combiner. We deliberately avoid clsx / tailwind-merge
// to keep the bundle lean — components must not emit conflicting Tailwind
// classes in the first place.

export type ClassValue =
    | string
    | number
    | bigint
    | null
    | undefined
    | boolean
    | Record<string, boolean | null | undefined>
    | ClassValue[];

export function cn(...values: ClassValue[]): string {
    const out: string[] = [];

    const push = (v: ClassValue) => {
        if (!v && v !== 0) return;
        if (typeof v === "string" || typeof v === "number") {
            out.push(String(v));
            return;
        }
        if (Array.isArray(v)) {
            for (const inner of v) push(inner);
            return;
        }
        if (typeof v === "object") {
            for (const key in v) {
                if (v[key]) out.push(key);
            }
        }
    };

    for (const v of values) push(v);
    return out.join(" ");
}
