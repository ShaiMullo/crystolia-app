"use client";

import { useEffect } from "react";

/**
 * Persists an explicit language/domain choice.
 *
 * The language switcher navigates cross-domain with `?chosen=1`. This marker,
 * mounted globally, records that choice as a first-party `cl_loc` cookie and
 * strips the query param so the address bar stays clean. The cookie signals the
 * .com CloudFront geo/language redirect (added in a later infra phase) that the
 * visitor chose explicitly, so it must not auto-redirect — preventing redirect
 * loops on subsequent visits.
 */
export default function ChosenMarker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("chosen") !== "1") return;
      document.cookie = "cl_loc=1; path=/; max-age=31536000; samesite=lax";
      params.delete("chosen");
      const qs = params.toString();
      const clean =
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", clean);
    } catch {
      /* no-op: cookies/history unavailable */
    }
  }, []);

  return null;
}
