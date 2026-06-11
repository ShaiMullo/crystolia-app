#!/usr/bin/env bash
# =============================================================================
# rollback-demo.sh — roll the Cheap Production box back to a previous image tag
# Usage: scripts/rollback-demo.sh <previous-image-sha>
# Env:   DEMO_SSH_HOST, DEMO_SSH_USER (default ubuntu), IMAGE_PREFIX
# Prints the plan and asks for confirmation before acting.
# =============================================================================
set -euo pipefail
TAG="${1:?usage: rollback-demo.sh <previous-image-sha>}"
: "${DEMO_SSH_HOST:?set DEMO_SSH_HOST}"
: "${DEMO_SSH_USER:=ubuntu}"
: "${IMAGE_PREFIX:=ghcr.io/shaimullo}"
APP_DIR="/opt/crystolia"

echo "▶ Rollback plan"
echo "    host:   ${DEMO_SSH_USER}@${DEMO_SSH_HOST}"
echo "    tag:    ${TAG}"
echo "    prefix: ${IMAGE_PREFIX}"
echo "  This re-deploys the three services at the given tag (no DB change)."
read -r -p "  Proceed? [y/N] " ans; [ "$ans" = "y" ] || { echo "aborted"; exit 0; }

ssh "${DEMO_SSH_USER}@${DEMO_SSH_HOST}" bash -s <<EOF
set -euo pipefail
cd "${APP_DIR}"
echo "▶ Pulling images at tag ${TAG}"
IMAGE_TAG="${TAG}" IMAGE_PREFIX="${IMAGE_PREFIX}" \
  docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo pull
echo "▶ Switching to ${TAG}"
IMAGE_TAG="${TAG}" IMAGE_PREFIX="${IMAGE_PREFIX}" \
  docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo up -d --remove-orphans
echo "▶ Health"
for i in \$(seq 1 12); do
  if docker compose -f docker-compose.demo.yml exec -T backend wget -qO- http://127.0.0.1:4000/api/health 2>/dev/null | grep -q status; then
    echo "✅ healthy at ${TAG}"; docker compose -f docker-compose.demo.yml ps; exit 0
  fi
  sleep 5
done
echo "❌ did not become healthy — check: docker compose logs backend"; exit 1
EOF
echo "✅ Rollback to ${TAG} complete"
