#!/usr/bin/env bash
# =============================================================================
# Crystolia demo — remote deploy script
# =============================================================================
# Runs ON the demo server. Piped in over SSH by .github/workflows/demo-deploy.yml
# (also safe to run by hand for a manual deploy / rollback).
#
# Expects, in the environment:
#   IMAGE_PREFIX   registry namespace        (e.g. ghcr.io/shaimullo)
#   IMAGE_TAG      image tag to deploy       (commit SHA, or demo-latest)
#   GHCR_USER      (optional) registry login user — for private packages
#   GHCR_TOKEN     (optional) registry token (read:packages)
#
# Server layout (created once during setup — see docs/deployment-cheap):
#   /opt/crystolia/docker-compose.demo.yml
#   /opt/crystolia/deploy/demo/Caddyfile
#   /opt/crystolia/deploy/demo/.env.demo
#   /opt/crystolia/{backend,frontend-admin,frontend-client}/.env.demo
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/crystolia}"
COMPOSE_FILE="docker-compose.demo.yml"
ENV_FILE="deploy/demo/.env.demo"
IMAGE_TAG="${IMAGE_TAG:-demo-latest}"

cd "$APP_DIR"

echo "▶ Deploying Crystolia demo — tag: ${IMAGE_TAG}"

# Optional registry login (skip when the packages are public).
if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
  echo "▶ Logging in to ghcr.io"
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
fi

compose() {
  IMAGE_TAG="${IMAGE_TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

echo "▶ Pulling images"
compose pull

echo "▶ Starting services"
compose up -d --remove-orphans

echo "▶ Waiting for the backend to become healthy"
ok=""
for i in $(seq 1 20); do
  if compose exec -T backend wget -qO- http://127.0.0.1:4000/api/health 2>/dev/null | grep -q '"status"'; then
    ok="yes"
    break
  fi
  echo "   …attempt ${i}/20"
  sleep 5
done

if [ -z "$ok" ]; then
  echo "❌ Backend did not become healthy. Recent logs:"
  compose logs --tail=40 backend || true
  exit 1
fi

echo "▶ Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo "✅ Deploy complete — tag ${IMAGE_TAG}"
compose ps
