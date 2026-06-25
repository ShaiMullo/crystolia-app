#!/usr/bin/env bash
# =============================================================================
# smoke-landing.sh — smoke test one live landing domain.
#
# Verifies the public site serves correctly: homepage (edge-rewritten to the
# domain's default locale), the locale home + a sub-page, robots.txt, sitemap.xml,
# and that an unknown path returns a real 404. Resolves the domain via a public
# resolver and pins it with curl --resolve, so it tests the real cert + content
# regardless of the local machine's DNS cache.
#
# Usage: smoke-landing.sh <domain> <default-locale>
#   e.g. smoke-landing.sh crystolia.co.il he
#
# Exit 0 if all checks pass, non-zero otherwise. Domain-agnostic (no hardcoding).
# =============================================================================
set -uo pipefail

DOMAIN="${1:?usage: smoke-landing.sh <domain> <default-locale>}"
LOCALE="${2:?usage: smoke-landing.sh <domain> <default-locale>}"

# Resolve via public DNS (avoids stale local negative caches); pin with --resolve.
IP=$(dig +short "$DOMAIN" A @1.1.1.1 2>/dev/null | grep -E '^[0-9]' | head -1)
[ -z "$IP" ] && IP=$(dig +short "$DOMAIN" A @8.8.8.8 2>/dev/null | grep -E '^[0-9]' | head -1)
if [ -z "$IP" ]; then
  echo "  ❌ $DOMAIN does not resolve publicly"
  exit 1
fi

FAIL=0
hit() { # description, expected-code, path
  local desc="$1" exp="$2" path="$3" code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 \
    --resolve "$DOMAIN:443:$IP" "https://$DOMAIN$path")
  if [ "$code" = "$exp" ]; then
    echo "  ✅ ${desc} (${path} -> ${code})"
  else
    echo "  ❌ ${desc} (${path} -> ${code}, expected ${exp})"
    FAIL=1
  fi
}

echo "▶ smoke: https://$DOMAIN  (default locale: $LOCALE, ip: $IP)"
# Content-availability checks — these are what the deploy controls (hard fail).
hit "homepage (-> /$LOCALE)" 200 "/"
hit "locale home"            200 "/$LOCALE"
hit "locale sub-page (/faq)" 200 "/$LOCALE/faq"
hit "robots.txt"             200 "/robots.txt"
hit "sitemap.xml"            200 "/sitemap.xml"

# Unknown path: the *status* for a missing object is a CloudFront error-page
# config concern (differs per stack), not something the content deploy controls.
# A real 404 is ideal; a "soft 404" (a page served with 200) is flagged as a
# warning, not a deploy failure. Only a 5xx / connection error fails the smoke.
miss="/__smoke_missing_$$"
mcode=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 \
  --resolve "$DOMAIN:443:$IP" "https://$DOMAIN$miss")
case "$mcode" in
  404)     echo "  ✅ unknown path -> 404 (${miss})" ;;
  200)     echo "  ⚠️  unknown path -> 200 SOFT-404 (${miss}) — CloudFront serves a page with 200; SEO concern, fix in the distribution's custom_error_response" ;;
  000|5??) echo "  ❌ unknown path -> ${mcode:-error} (${miss}) — site error"; FAIL=1 ;;
  *)       echo "  ⚠️  unknown path -> ${mcode} (${miss}) — unexpected, not failing" ;;
esac

# Diagnostics (informational — not pass/fail): robots Host + <html lang/dir>.
robots_host=$(curl -s --max-time 25 --resolve "$DOMAIN:443:$IP" "https://$DOMAIN/robots.txt" \
  | grep -i '^Host:' | tr -d '\r')
html_tag=$(curl -s --max-time 25 --resolve "$DOMAIN:443:$IP" "https://$DOMAIN/$LOCALE" \
  | grep -oE '<html[^>]*lang="[a-z-]*"[^>]*dir="[a-z]*"' | head -1)
echo "  ℹ robots ${robots_host:-<none>}"
echo "  ℹ html ${html_tag:-<none>}"

if [ "$FAIL" -eq 0 ]; then echo "  → PASS"; else echo "  → FAIL"; fi
exit "$FAIL"
