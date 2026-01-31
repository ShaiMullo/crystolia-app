#!/bin/bash
set -e

echo "🚀 Starting Repository Split..."

# Define paths
CURRENT_DIR=$(pwd)
INFRA_DIR="../crystolia-infra"

# 1. Physical Extraction
echo "📦 Moving terraform folder to $INFRA_DIR..."
if [ -d "terraform" ]; then
    mkdir -p "$INFRA_DIR"
    # Move contents to infra dir (handling if terraform is the root or subdir there)
    # We want the contents of 'terraform' to be the ROOT of 'crystolia-infra'
    # Or should 'crystolia-infra' contain a 'terraform' folder? 
    # User said: "Move the terraform folder completely outside... to a sibling directory named ../crystolia-infra"
    # Usually implies repo root = infra. Let's move the *contents* of terraform to the root of crystolia-infra usually, 
    # BUT user said "Move the terraform folder". 
    # Let's check requirements: "infra: initial standalone commit" -> usually standard to have main.tf at root.
    # But for safety, I will move the folder itself or contents.
    # "Move the terraform folder completely outside... to ../crystolia-infra" 
    # -> ../crystolia-infra/terraform ?? Or ../crystolia-infra (as the repo) containing the tf files?
    # Context "Infra Repository... Move the entire /terraform directory...".
    # Let's make crystolia-infra the repo, and inside it we can decide. 
    # Best practice for "Infra Repo": main.tf at root.
    # So I will move CONTENTS of terraform to ../crystolia-infra.
    
    cp -R terraform/ "$INFRA_DIR/"
    rm -rf terraform
else
    echo "⚠️  'terraform' directory not found in $CURRENT_DIR"
fi

# 2. Clean the App Repository
echo "🧹 Cleaning App Repository..."
# Remove from git index if it exists
git rm -r --cached terraform 2>/dev/null || true

git add .
git commit -m "chore: moved infrastructure to a separate standalone repository" || echo "No changes to commit in App Repo."

# 3. Initialize the Infra Repository
echo "⚙️  Configuring Infra Repository at $INFRA_DIR..."
cd "$INFRA_DIR"

# Delete existing .git if present
rm -rf .git

# Init
git init

# Identity Config
git config user.email "shaimullokandov@gmail.com"
git config user.name "ShaiMullo"

# Create .gitignore
cat <<EOF > .gitignore
.terraform/
*.tfstate
*.tfstate.backup
*.tfvars
.DS_Store
EOF

# Commit
git add .
git commit -m "infra: initial standalone commit for infrastructure repository"

echo "✅ Repository Split Completed Successfully!"
echo "---------------------------------------------------"
echo "📂 App Repo:   $CURRENT_DIR"
echo "📂 Infra Repo: $(pwd)"
echo "---------------------------------------------------"
