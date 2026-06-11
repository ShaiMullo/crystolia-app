#!/usr/bin/env bash
# =============================================================================
# health-check.sh — verify the live Cheap Production endpoints + TLS
# Usage: scripts/health-check.sh [base-domain]   (default: crystolia.com)
# Read-only. Safe to run anytime.
# =============================================================================
set -uo pipefail
DOMAIN="${1:-crystolia.com}"
CLIENT="https://${DOMAIN}"
ADMIN="https://admin.${DOMAIN}"
API="https://api.${DOMAIN}"
FAIL=0

check_http(){ # url, expected_code, label
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1" 2>/dev/null)
  if [ "$code" = "$2" ]; then echo "  ✅ $3 ($1) → $code";
  else echo "  ❌ $3 ($1) → $code (expected $2)"; FAIL=1; fi
}

check_tls(){ # host, label
  local exp
  exp=$(echo | openssl s_client -servername "$1" -connect "$1:443" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$exp" ]; then echo "  ✅ TLS $2 valid until: $exp";
  else echo "  ❌ TLS $2 — no valid certificate"; FAIL=1; fi
}

echo "▶ HTTP reachability"
check_http "$API/api/health" 200 "API health"
check_http "$ADMIN/login"    200 "Admin login"
check_http "$CLIENT"         200 "Client portal"

echo "▶ TLS certificates"
check_tls "$DOMAIN"       "client"
check_tls "admin.$DOMAIN" "admin"
check_tls "api.$DOMAIN"   "api"

echo "▶ API health payload"
curl -s --max-time 15 "$API/api/health" 2>/dev/null | head -c 300; echo

echo ""
[ "$FAIL" -eq 0 ] && echo "✅ All health checks passed" || echo "❌ Some checks failed"
exit $FAIL
