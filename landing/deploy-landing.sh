#!/usr/bin/env bash
# Deploy the Crystolia landing site to S3 + CloudFront.
#
# Builds the Next.js static export, syncs ./out to the landing S3 bucket,
# uploads extensionless copies of every HTML file (so /en, /en/about, /en/faq
# resolve without a CloudFront URL-rewrite function), and invalidates the
# CloudFront cache.
#
# Usage: ./deploy-landing.sh [--skip-build]

set -euo pipefail

BUCKET="crystolia-landing-site"
DOMAIN="crystolia.com"
cd "$(dirname "$0")"

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> Building static export..."
  npm run build
fi

[[ -d out ]] || { echo "ERROR: ./out not found — build failed?"; exit 1; }

echo "==> Syncing ./out to s3://${BUCKET}..."
aws s3 sync out/ "s3://${BUCKET}/" --delete

echo "==> Uploading extensionless HTML copies (clean URLs)..."
(cd out && find . -name '*.html' ! -name 'index.html' | while read -r f; do
  key="${f#./}"          # e.g. en/about.html
  clean="${key%.html}"   # e.g. en/about
  aws s3 cp "$f" "s3://${BUCKET}/${clean}" \
    --content-type "text/html; charset=utf-8" --only-show-errors
  echo "    /${clean}"
done)

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

echo "==> Done. Live at https://${DOMAIN}"
