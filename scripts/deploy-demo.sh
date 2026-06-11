#!/usr/bin/env bash
# =============================================================================
# deploy-demo.sh — trigger / run a Cheap Production deploy
# Two modes:
#   (default)  trigger the GitHub Actions "Demo Deploy" workflow (recommended)
#   --local    run the remote deploy directly over SSH (manual fallback)
#
# Env (for --local): DEMO_SSH_HOST, DEMO_SSH_USER, IMAGE_TAG, IMAGE_PREFIX
# Read-only against cloud until you confirm — prints what it will do first.
# =============================================================================
set -euo pipefail
MODE="${1:-ci}"
REF="${2:-main}"

if [ "$MODE" = "ci" ]; then
  echo "▶ Triggering GitHub Actions: Demo Deploy (ref=$REF)"
  command -v gh >/dev/null || { echo "❌ gh CLI required (or run the workflow from the GitHub UI)"; exit 1; }
  echo "  This builds 3 images → GHCR and deploys to the demo box."
  read -r -p "  Proceed? [y/N] " ans; [ "$ans" = "y" ] || { echo "aborted"; exit 0; }
  gh workflow run "Demo Deploy" -f ref="$REF"
  echo "✅ Triggered. Track: gh run watch"

elif [ "$MODE" = "--local" ]; then
  : "${DEMO_SSH_HOST:?set DEMO_SSH_HOST}"
  : "${DEMO_SSH_USER:=ubuntu}"
  : "${IMAGE_TAG:=demo-latest}"
  : "${IMAGE_PREFIX:=ghcr.io/shaimullo}"
  echo "▶ Manual SSH deploy → ${DEMO_SSH_USER}@${DEMO_SSH_HOST} (tag=${IMAGE_TAG})"
  read -r -p "  Proceed? [y/N] " ans; [ "$ans" = "y" ] || { echo "aborted"; exit 0; }
  # Ship compose + Caddyfile, then run remote-deploy.sh on the box.
  scp docker-compose.demo.yml "${DEMO_SSH_USER}@${DEMO_SSH_HOST}:/opt/crystolia/"
  scp deploy/demo/Caddyfile   "${DEMO_SSH_USER}@${DEMO_SSH_HOST}:/opt/crystolia/deploy/demo/"
  ssh "${DEMO_SSH_USER}@${DEMO_SSH_HOST}" \
    "IMAGE_TAG='${IMAGE_TAG}' IMAGE_PREFIX='${IMAGE_PREFIX}' bash -s" < deploy/demo/remote-deploy.sh
  echo "✅ Manual deploy finished"
else
  echo "usage: deploy-demo.sh [ci|--local] [git-ref]"; exit 1
fi
