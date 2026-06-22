// ===============================================
// 🔐 Seed credential resolution (dev/test/smoke scripts only)
// ===============================================
// Single source of truth for resolving seed/test passwords. Behaviour is
// deliberately strict:
//   • password comes ONLY from an explicit environment variable
//   • NO hardcoded fallback password
//   • NO random generation
//   • if the variable is missing/empty → print a clear error naming the
//     variable and exit(1) (fail fast)
//   • the password value itself is never logged
//
// This keeps any real credential out of the repository while making the
// requirement obvious to whoever runs a seed/reset/smoke script.

/** Canonical env var names used across all seed/test scripts. */
export const SEED_ADMIN_PASSWORD_VAR = 'SEED_ADMIN_PASSWORD';
export const SEED_AGENT_PASSWORD_VAR = 'SEED_AGENT_PASSWORD';

/**
 * Resolve a seed password strictly from `envVar`. Exits the process with a
 * clear message if the variable is not set. Never returns an empty string.
 *
 * Use this in STANDALONE scripts (seed/reset/smoke) where exiting is correct.
 */
export function resolveSeedPassword(envVar: string): string {
    const value = getSeedPasswordOrNull(envVar);
    if (value === null) {
        console.error(
            `\n❌ Missing required environment variable: ${envVar}\n` +
                `   This script refuses to run with a default or hardcoded password.\n` +
                `   Provide it explicitly, e.g.:\n` +
                `     ${envVar}='<your-password>' <your command>\n`,
        );
        process.exit(1);
    }
    return value;
}

/**
 * Non-fatal variant: returns the password from `envVar`, or `null` if it is
 * missing/empty. Use this in code paths that must NOT kill the process (e.g. a
 * boot-time auto-seeder), so they can skip seeding instead of crashing.
 */
export function getSeedPasswordOrNull(envVar: string): string | null {
    const value = process.env[envVar];
    if (!value || value.trim() === '') return null;
    return value;
}
