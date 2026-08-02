// Fail-closed gate for the demo-only payment surfaces. In production the
// pages are DISABLED BY DEFAULT — they exist only for demonstrations, so a
// production deploy that forgets to set the flag must not expose them.
// Explicit values still win in both directions:
//   DEMO_PAYMENT_PAGES_DISABLED=true   → always 404
//   DEMO_PAYMENT_PAGES_DISABLED=false  → explicitly re-enabled (demo showcase)
//   unset                              → 404 in production, visible in dev
export function demoPaymentPagesDisabled(): boolean {
    const flag = process.env.DEMO_PAYMENT_PAGES_DISABLED;
    if (flag === "true") return true;
    if (flag === "false") return false;
    return process.env.NODE_ENV === "production";
}
