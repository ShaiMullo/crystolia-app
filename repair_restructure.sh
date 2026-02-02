#!/bin/bash
set -e

REPO_APP=$(pwd)
REPO_INFRA="../crystolia-infra"
REPO_GITOPS="../crystolia-gitops"

echo "🚑 Starting Crystolia Repair & Stabilization..."
echo "Running in: $REPO_APP"

# --- HELPER: Safe Delete ---
safe_delete() {
    if [ -e "$1" ]; then
        echo "🗑️  Deleting: $1"
        rm -rf "$1"
    fi
}

# --- PHASE 1: CRYSTOLIA-APP CLEANUP ---
echo "---------------------------------------------------"
echo "🛠️  Phase 1: Cleaning crystolia-app..."

if [ -d "backend" ] && [ -d "backend-legacy" ]; then
    echo "⚠️  Duplicate backend detected. Removing 'backend-legacy'..."
    safe_delete "backend-legacy"
    safe_delete "Jenkinsfile"
    safe_delete "Jenkinsfile 2"
    safe_delete "split_repos.sh"
    safe_delete "split_repos 2.sh"
    safe_delete "restructure_staging"
    safe_delete "route53-change.json"
    safe_delete "demo-orders.sh"
fi

# --- PHASE 2: CRYSTOLIA-INFRA SANITIZATION ---
echo "---------------------------------------------------"
echo "🧹 Phase 2: Sanitizing crystolia-infra..."

if [ -d "$REPO_INFRA/terraform" ]; then
    echo "🔍 Scanning infra for forbidden artifacts..."
    find "$REPO_INFRA" -name ".terraform" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$REPO_INFRA" -name "*.tfstate" -type f -delete 2>/dev/null || true
    find "$REPO_INFRA" -name "*.tfstate.backup" -type f -delete 2>/dev/null || true
    safe_delete "$REPO_INFRA/terraform/bootstrap/terraform.tfstate"
    safe_delete "$REPO_INFRA/create_www.json"
    echo "✅ Infra sanitized (State removed)."
else
    echo "❌ Error: $REPO_INFRA/terraform not found!"
fi

# --- PHASE 3: CRYSTOLIA-GITOPS VERIFICATION ---
echo "---------------------------------------------------"
echo "📦 Phase 3: Verifying crystolia-gitops..."

if [ -d "$REPO_GITOPS/staging" ] && [ -d "$REPO_GITOPS/production" ]; then
    echo "✅ GitOps structure looks correct."
else
    echo "❌ GitOps structure missing! Please check previous steps."
fi

echo "---------------------------------------------------"
echo "🎉 Repair Complete. Repositories should be clean."
echo "NEXT STEPS:"
echo "1. Verify 'git status' in all 3 repos."
echo "2. Commit changes."
