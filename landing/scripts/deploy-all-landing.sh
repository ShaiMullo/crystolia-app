#!/usr/bin/env bash
# =============================================================================
# deploy-all-landing.sh — deploy EVERY live landing market, in order.
#
# Fully manifest-driven: reads the platform manifest (domains.lock.json) and
# deploys every market whose status == "live", reusing the existing
# ./deploy-landing.sh for each domain. Then waits for every CloudFront
# invalidation to reach Completed and runs the landing smoke tests
# (scripts/smoke-landing.sh) against each deployed domain.
#
# No domains are hardcoded — when another market becomes live in the manifest,
# it is picked up automatically with no code change.
#
# Usage: scripts/deploy-all-landing.sh
#
# Exit non-zero if any deploy fails, any invalidation does not complete, or any
# smoke test fails.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."   # -> landing/  (deploy-landing.sh + domains.lock.json live here)

MANIFEST="domains.lock.json"
DEPLOY="./deploy-landing.sh"
SMOKE="scripts/smoke-landing.sh"

command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required."; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "ERROR: aws CLI is required."; exit 1; }
[ -f "$MANIFEST" ] || { echo "ERROR: manifest '$MANIFEST' not found."; exit 1; }
[ -x "$DEPLOY" ] || { echo "ERROR: '$DEPLOY' not found/executable."; exit 1; }

# ── Resolve live markets from the manifest (domain \t locale \t distId) ──
# Manifest order is preserved (x-default/.com first). bash 3.2 safe: no mapfile.
DOMAINS=(); LOCALES=(); DISTS=()
while IFS=$'\t' read -r domain locale dist; do
  [ -n "$domain" ] || continue
  DOMAINS+=("$domain"); LOCALES+=("$locale"); DISTS+=("$dist")
done < <(jq -r '.markets[] | select(.status == "live")
                | [.domain, .defaultLocale, (.aws.cloudfront.distributionId // "")] | @tsv' "$MANIFEST")

N="${#DOMAINS[@]}"
[ "$N" -gt 0 ] || { echo "ERROR: no markets with status=live in the manifest."; exit 1; }

echo "============================================================"
echo "  Deploy-all landing — $N live market(s) (manifest order):"
for i in $(seq 0 $((N - 1))); do echo "    $((i + 1)). ${DOMAINS[$i]} (locale ${LOCALES[$i]}, dist ${DISTS[$i]:-<lookup>})"; done
echo "============================================================"

INVALS=()  # parallel to DOMAINS: the invalidation id created for each deploy

# ── 1) Deploy each domain (set -e => stop immediately on the first failure) ──
for i in $(seq 0 $((N - 1))); do
  domain="${DOMAINS[$i]}"; dist="${DISTS[$i]}"
  echo
  echo "############################################################"
  echo "# [$((i + 1))/$N] DEPLOY: $domain"
  echo "############################################################"
  "$DEPLOY" "$domain"

  # Resolve the distribution id if the manifest didn't carry one.
  if [ -z "$dist" ]; then
    dist=$(aws cloudfront list-distributions \
      --query "DistributionList.Items[?contains(Aliases.Items || \`[]\`, '${domain}')].Id | [0]" \
      --output text)
    DISTS[$i]="$dist"
  fi
  # The invalidation deploy-landing.sh just created = newest for the distribution.
  inv=$(aws cloudfront list-invalidations --distribution-id "$dist" \
    --query 'InvalidationList.Items[0].Id' --output text 2>/dev/null)
  if [ -z "$inv" ] || [ "$inv" = "None" ]; then
    echo "ERROR: could not determine invalidation id for $domain ($dist)."
    exit 1
  fi
  echo "==> $domain invalidation: $inv (distribution $dist)"
  INVALS+=("$inv")
done

# ── 2) Wait for every invalidation to reach Completed ──
echo
echo "==> Waiting for CloudFront invalidations to complete..."
for i in $(seq 0 $((N - 1))); do
  domain="${DOMAINS[$i]}"; dist="${DISTS[$i]}"; inv="${INVALS[$i]}"
  printf "    %-18s %s : " "$domain" "$inv"
  status=""
  for _ in $(seq 1 60); do   # up to ~10 min per invalidation
    status=$(aws cloudfront get-invalidation --distribution-id "$dist" --id "$inv" \
      --query 'Invalidation.Status' --output text 2>/dev/null || echo "?")
    [ "$status" = "Completed" ] && break
    sleep 10
  done
  if [ "$status" = "Completed" ]; then
    echo "Completed"
  else
    echo "FAILED (status: $status)"
    exit 1
  fi
done

# ── 3) Smoke test each deployed domain ──
echo
echo "==> Smoke testing deployed domains..."
smoke_fail=0
for i in $(seq 0 $((N - 1))); do
  bash "$SMOKE" "${DOMAINS[$i]}" "${LOCALES[$i]}" || smoke_fail=1
done

# ── 4) Final summary ──
echo
echo "============================================================"
echo "  DEPLOYMENT SUMMARY"
echo "============================================================"
for i in $(seq 0 $((N - 1))); do
  printf "  %-18s dist=%-16s invalidation=%s (Completed)\n" "${DOMAINS[$i]}" "${DISTS[$i]}" "${INVALS[$i]}"
done

if [ "$smoke_fail" -ne 0 ]; then
  echo "  ❌ One or more smoke tests FAILED."
  exit 1
fi
echo "  ✅ All deploys, invalidations, and smoke tests passed."
