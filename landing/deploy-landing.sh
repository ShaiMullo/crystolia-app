#!/usr/bin/env bash
# Deploy the Crystolia landing site for a single target domain.
#
# All per-domain infrastructure data (domain, S3 bucket, SEO host, deploy type,
# lifecycle status) is read from the platform manifest — the vendored
# domains.lock.json (canonical source: crystolia-infra/manifest). The script no
# longer hardcodes any of it.
#
# Market status, buckets and distributions are NOT hardcoded here — they come
# from the manifest at deploy time (list them with:
#   jq -r '.markets[] | [.domain,.locale,.status,.aws.bucket] | @tsv' domains.lock.json
# ). A market deploys to S3+CloudFront only when its manifest status is not
# "planned" and it has a bucket; otherwise the script stops after the build.
#
# For provisioned S3 markets the script builds the static export, uploads ./out
# to the bucket with explicit per-category Cache-Control metadata, uploads
# extensionless copies of every HTML file (so /ru, /ru/faq, … resolve as clean
# URLs without a CloudFront URL-rewrite function), prunes stale objects, and
# invalidates the CloudFront cache. A "planned" market (no bucket) or a "vercel"
# market is built locally only — nothing is uploaded from here.
#
# Cache-Control policy (browsers only honor what we set — without it they apply
# heuristic freshness and can keep stale HTML/JS for days after a deploy, and
# CloudFront invalidation cannot reach a visitor's browser cache):
#   - HTML, extensionless clean-URL copies, RSC .txt payloads, sitemap.xml,
#     robots.txt            -> public, max-age=0, must-revalidate
#   - /_next/static/* (content-hashed / build-scoped filenames)
#                           -> public, max-age=31536000, immutable
#   - other public assets (images, favicon — stable names, rarely change)
#                           -> public, max-age=86400
#
# NOTE on NEXT_PUBLIC_SITE_URL: set from the market's manifest host per deploy.
# i18n/site.ts prefers it over the manifest default (SITE_URL =
# process.env.NEXT_PUBLIC_SITE_URL ?? default-locale host), so each domain's
# build gets its own robots.txt Host:/Sitemap: — which is why every market
# REBUILDS rather than reusing another market's ./out.
#
# Usage:
#   ./deploy-landing.sh [domain] [--skip-build]
#
#   domain defaults to crystolia.com (backwards compatible). Examples:
#     ./deploy-landing.sh                      # crystolia.com, build + deploy
#     ./deploy-landing.sh --skip-build         # crystolia.com, deploy existing ./out
#     ./deploy-landing.sh crystolia.ru         # crystolia.ru,  build + deploy

set -euo pipefail
cd "$(dirname "$0")"

MANIFEST="domains.lock.json"

# ── Preflight: hard dependencies ──
command -v jq >/dev/null 2>&1 || {
  echo "ERROR: jq is required but not installed. Install jq (e.g. 'brew install jq') and retry."
  exit 1
}
[[ -f "$MANIFEST" ]] || {
  echo "ERROR: manifest '$MANIFEST' not found next to this script."
  exit 1
}

# ── Parse args (order-independent; --skip-build keeps the legacy invocation) ──
DOMAIN="crystolia.com" # default target (backwards compatible); validated below
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    https://*)    DOMAIN="${arg#https://}" ;;
    --*)          echo "ERROR: unknown flag '$arg'"; exit 2 ;;
    *)            DOMAIN="$arg" ;;
  esac
done

# ── Resolve this domain's market from the manifest (single source of truth) ──
if ! jq -e --arg d "$DOMAIN" '.markets[] | select(.domain == $d)' "$MANIFEST" >/dev/null; then
  echo "ERROR: '$DOMAIN' is not a market in $MANIFEST."
  echo "Known domains: $(jq -r '[.markets[].domain] | join(", ")' "$MANIFEST")"
  exit 2
fi

# jq -er fails (non-zero) if a required field is missing/empty — never silently
# yields an empty DOMAIN/host.
mfield() { jq -er --arg d "$DOMAIN" ".markets[] | select(.domain == \$d) | $1" "$MANIFEST"; }

SITE_URL=$(mfield '.seo.host')        || { echo "ERROR: $DOMAIN has no seo.host in the manifest."; exit 1; }
STATUS=$(mfield '.status')            || { echo "ERROR: $DOMAIN has no status in the manifest."; exit 1; }
DEPLOY_TYPE=$(mfield '.deploymentType') || { echo "ERROR: $DOMAIN has no deploymentType in the manifest."; exit 1; }
# bucket may legitimately be null for a planned market → treat as empty.
BUCKET=$(jq -r --arg d "$DOMAIN" '.markets[] | select(.domain == $d) | .aws.bucket // ""' "$MANIFEST")

echo "==> Domain:      ${DOMAIN}"
echo "==> SITE_URL:    ${SITE_URL}"
echo "==> Status:      ${STATUS}"
echo "==> Deploy type: ${DEPLOY_TYPE}"
echo "==> Bucket:      ${BUCKET:-<none>}"

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "==> Building static export (NEXT_PUBLIC_SITE_URL=${SITE_URL})..."
  NEXT_PUBLIC_SITE_URL="$SITE_URL" npm run build
fi

[[ -d out ]] || { echo "ERROR: ./out not found — build failed?"; exit 1; }

# ── Vercel-hosted market: nothing to upload from here ──
if [[ "$DEPLOY_TYPE" == "vercel" ]]; then
  cat <<MSG
==> ${DOMAIN} is deployed via Vercel — no S3 upload.
    Set NEXT_PUBLIC_SITE_URL=${SITE_URL} in the Vercel project's Environment
    Variables. The local build above already verifies the output.
MSG
  exit 0
fi

# ── Planned / not-yet-provisioned market (no bucket): build-only ──
if [[ "$STATUS" == "planned" || -z "$BUCKET" ]]; then
  cat <<MSG
==> ${DOMAIN} is status='${STATUS}' with no S3 bucket in the manifest — not
    provisioned yet, so nothing is uploaded. The local build above verifies the
    output. Provision the stack (and set aws.bucket in the manifest) to deploy.
MSG
  exit 0
fi

# ── Provisioned S3 + CloudFront market ──
# `aws s3 cp --recursive` (not `sync`) is used for uploads so Cache-Control is
# (re)written on EVERY object each deploy — `sync` skips byte-identical files
# and would leave their previous metadata untouched. Assets go first, documents
# last, so a page never goes live before the subresources it references.
CC_REVALIDATE="public, max-age=0, must-revalidate"
CC_IMMUTABLE="public, max-age=31536000, immutable"
CC_ASSET="public, max-age=86400"

echo "==> Uploading fingerprinted Next.js assets (cache: 1 year, immutable)..."
aws s3 cp out/_next/static/ "s3://${BUCKET}/_next/static/" --recursive \
  --cache-control "$CC_IMMUTABLE" --only-show-errors

echo "==> Uploading other static assets (cache: 1 day)..."
aws s3 cp out/ "s3://${BUCKET}/" --recursive \
  --exclude "*.html" --exclude "*.txt" --exclude "*.xml" --exclude "_next/static/*" \
  --cache-control "$CC_ASSET" --only-show-errors

echo "==> Uploading documents & metadata (cache: revalidate every request)..."
# Trailing exclude wins over the includes for anything under _next/static/
# (AWS CLI: the LAST matching filter decides), so a future .txt/.xml emitted
# there can never be re-uploaded with the wrong (non-immutable) policy.
aws s3 cp out/ "s3://${BUCKET}/" --recursive \
  --exclude "*" --include "*.html" --include "*.txt" --include "*.xml" \
  --exclude "_next/static/*" \
  --cache-control "$CC_REVALIDATE" --only-show-errors

echo "==> Refreshing extensionless HTML copies (clean URLs)..."
(cd out && find . -name '*.html' ! -name 'index.html' | while read -r f; do
  key="${f#./}"          # e.g. ru/faq.html
  clean="${key%.html}"   # e.g. ru/faq
  aws s3 cp "$f" "s3://${BUCKET}/${clean}" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "$CC_REVALIDATE" --only-show-errors
  echo "    /${clean}"
done)

echo "==> Pruning stale objects..."
# The extensionless clean-URL copies exist only in S3, so a bare `sync --delete`
# would remove them (clean URLs would 404 until re-uploaded). Excluding the
# clean key of every CURRENT page keeps them live through the prune; copies of
# since-removed pages are NOT in the exclude list, so they still get pruned.
# The sync uploads nothing here — every local file was already uploaded above —
# it only computes deletions.
DELETE_EXCLUDES=()
while IFS= read -r f; do
  key="${f#./}"
  DELETE_EXCLUDES+=(--exclude "${key%.html}")
done < <(cd out && find . -name '*.html' ! -name 'index.html')
aws s3 sync out/ "s3://${BUCKET}/" --delete --only-show-errors \
  ${DELETE_EXCLUDES[@]+"${DELETE_EXCLUDES[@]}"}

echo "==> Finding CloudFront distribution for ${DOMAIN}..."
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items || \`[]\`, '${DOMAIN}')].Id | [0]" \
  --output text)

if [[ -z "$DIST_ID" || "$DIST_ID" == "None" ]]; then
  echo "WARNING: CloudFront distribution not found — skipping invalidation."
else
  echo "==> Invalidating CloudFront cache (${DIST_ID})..."
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
    --query 'Invalidation.{Id:Id,Status:Status}' --output table
fi

echo "==> Done. Live at ${SITE_URL}"
