#!/bin/bash
set -e

echo "🚀 Starting Crystolia Multi-Repo Restructure..."

# 1. Setup Crystolia GitOps
echo "📦 Setting up crystolia-gitops..."
mkdir -p ../crystolia-gitops
cp -R restructure_staging/crystolia-gitops/* ../crystolia-gitops/
echo "✅ GitOps repo populated."

# 2. Setup Crystolia Infra
echo "🏗️  Setting up crystolia-infra..."
# Backup existing terraform if needed, but we assume we want to clean it
# We will overwrite terraform folder with our copy
cp -R restructure_staging/crystolia-infra/* ../crystolia-infra/
# Remove legacy artifacts from infra
rm -rf ../crystolia-infra/argocd 2>/dev/null || true
rm -rf ../crystolia-infra/gitops-repo 2>/dev/null || true
rm -f ../crystolia-infra/bootstrap_*.sh 2>/dev/null || true
rm -f ../crystolia-infra/fix_*.sh 2>/dev/null || true
echo "✅ Infra repo updated."

# 3. Cleanup Staging
echo "🧹 Cleaning up staging area..."
rm -rf restructure_staging

echo "🎉 Restructure Applied!"
echo "---------------------------------------------------"
echo "NEXT STEPS:"
echo "1. Go to ../crystolia-gitops and commit changes."
echo "2. Go to ../crystolia-infra and commit changes."
echo "3. You are ready."
