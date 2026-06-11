#!/usr/bin/env bash
# =============================================================================
# validate-env.sh — Cheap Production pre-flight dependency check
# Safe: read-only, no cloud mutations. Run from repo root.
# =============================================================================
set -uo pipefail
ok(){ echo "  ✅ $1"; }
warn(){ echo "  ⚠️  $1"; }
miss(){ echo "  ❌ $1"; FAIL=1; }
FAIL=0

echo "▶ Tooling"
command -v aws        >/dev/null && ok "aws cli"        || miss "aws cli missing (brew install awscli)"
command -v terraform  >/dev/null && ok "terraform"      || miss "terraform missing"
command -v docker     >/dev/null && ok "docker"         || warn "docker missing (needed only for local build)"
command -v gh         >/dev/null && ok "gh cli"         || warn "gh cli missing (optional, for secrets)"
command -v jq         >/dev/null && ok "jq"             || warn "jq missing (nicer output)"

echo "▶ AWS auth"
if aws sts get-caller-identity >/dev/null 2>&1; then
  ok "AWS CLI authenticated ($(aws sts get-caller-identity --query Account --output text 2>/dev/null))"
else
  miss "AWS not authenticated — run 'aws configure'"
fi

echo "▶ Route53 zone for crystolia.com"
if aws route53 list-hosted-zones --query "HostedZones[?Name=='crystolia.com.'].Id" --output text 2>/dev/null | grep -q .; then
  ok "Route53 hosted zone exists"
else
  warn "No Route53 zone for crystolia.com — DNS may be managed elsewhere (manual step 5)"
fi

echo "▶ SSH key"
ls ~/.ssh/*demo* >/dev/null 2>&1 && ok "demo SSH key present" || warn "no ~/.ssh/*demo* key — create/download from Lightsail"

echo "▶ GitHub secrets (needs gh + repo access)"
if command -v gh >/dev/null 2>&1; then
  for s in DEMO_SSH_HOST DEMO_SSH_USER DEMO_SSH_KEY; do
    gh secret list 2>/dev/null | grep -q "^$s" && ok "secret $s set" || miss "secret $s missing"
  done
else
  warn "skipped (gh not installed) — verify secrets manually in repo settings"
fi

echo "▶ Atlas connection (backend/.env.demo)"
if [ -f backend/.env.demo ] && grep -q "MONGO_URI=mongodb" backend/.env.demo && ! grep -q "CHANGE_ME" backend/.env.demo; then
  ok "MONGO_URI looks set"
else
  miss "backend/.env.demo MONGO_URI not set (Atlas step 1)"
fi

echo "▶ JWT_SECRET consistency (backend == admin)"
B=$(grep -h '^JWT_SECRET=' backend/.env.demo 2>/dev/null | cut -d= -f2-)
A=$(grep -h '^JWT_SECRET=' frontend-admin/.env.demo 2>/dev/null | cut -d= -f2-)
if [ -n "$B" ] && [ "$B" = "$A" ] && [ "$B" != "CHANGE_ME_64_HEX_CHARS" ]; then
  ok "JWT_SECRET set and identical"
else
  miss "JWT_SECRET missing or mismatched between backend & frontend-admin"
fi

echo ""
[ "$FAIL" -eq 0 ] && echo "✅ Pre-flight PASSED" || echo "❌ Pre-flight has blockers (see ❌ above)"
exit $FAIL
