// Consent model types (Compliance PR-5). Logic only — no UI.

export type ConsentCategory = "essential" | "functional" | "analytics" | "marketing";

// Per-category opt-in state. `essential` is always true and non-toggleable.
export interface ConsentCategories {
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

// The persisted, versioned consent record (stored in the cl_consent cookie).
export interface ConsentRecord {
  /** Consent schema/policy version — see CONSENT_VERSION. */
  v: number;
  /** ISO-8601 timestamp of when the decision was made. */
  ts: string;
  categories: ConsentCategories;
}

// "undecided" = no valid cookie OR a stale-version cookie (needs re-consent).
// "decided"   = a valid, current-version cookie was found / a choice was made.
export type ConsentStatus = "undecided" | "decided";

// Toggleable categories a user can set (essential is implied and always true).
export type ToggleableConsent = Pick<
  ConsentCategories,
  "functional" | "analytics" | "marketing"
>;

export interface ConsentContextValue {
  status: ConsentStatus;
  categories: ConsentCategories;
  /** essential always returns true; others reflect the current decision. */
  isEnabled: (category: ConsentCategory) => boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: Partial<ToggleableConsent>) => void;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
}
