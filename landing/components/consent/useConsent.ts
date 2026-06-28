"use client";

// Hook to read/act on consent state. Must be used within <ConsentProvider>.
// Future analytics gating (PR-6+) can call `isEnabled("analytics")` before
// loading any tracker — nothing is loaded here.

import { useContext } from "react";
import { ConsentContext } from "./ConsentProvider";
import type { ConsentContextValue } from "./types";

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a <ConsentProvider>.");
  }
  return ctx;
}
