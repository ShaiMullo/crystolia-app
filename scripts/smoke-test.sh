#!/usr/bin/env bash
# =============================================================================
# smoke-test.sh — end-to-end smoke test against the live demo
# Verifies: health, admin login (JWT cookie), an authenticated API call.
# Usage: scripts/smoke-test.sh [base-domain]
# Env:   SMOKE_ADMIN_EMAIL (default admin@crystolia.com), SMOKE_ADMIN_PASSWORD
# Read-only-ish: performs a login (no data mutation).
# =============================================================================
set -uo pipefail
DOMAIN="${1:-crystolia.com}"
API="https://api.${DOMAIN}"
ADMIN="https://admin.${DOMAIN}"
EMAIL="${SMOKE_ADMIN_EMAIL:-admin@crystolia.com}"
PASS="${SMOKE_ADMIN_PASSWORD:-Admin123!}"
JAR="$(mktemp)"; FAIL=0
trap 'rm -f "$JAR"' EXIT

step(){ echo "▶ $1"; }
pass(){ echo "  ✅ $1"; }
fail(){ echo "  ❌ $1"; FAIL=1; }

step "1. API health"
curl -s --max-time 15 "$API/api/health" | grep -q '"status"' && pass "health ok" || fail "health failed"

step "2. Admin app serves login page"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$ADMIN/login")" = "200" ] && pass "login page 200" || fail "login page not 200"

step "3. Login (obtain auth cookie)"
code=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" \
  -H 'Content-Type: application/json' \
  -X POST "$ADMIN/api/auth/login" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
if [ "$code" = "200" ]; then pass "login 200, cookie stored"; else fail "login returned $code"; fi

step "4. Authenticated call (/api/auth/me or /api/users)"
me=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$ADMIN/api/auth/me" 2>/dev/null)
[ "$me" = "200" ] && pass "authenticated request ok" || fail "authenticated request returned $me"

echo ""
[ "$FAIL" -eq 0 ] && echo "✅ SMOKE TEST PASSED" || echo "❌ SMOKE TEST FAILED"
exit $FAIL
