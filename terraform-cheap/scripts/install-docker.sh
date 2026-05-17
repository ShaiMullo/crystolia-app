#!/usr/bin/env bash
# First-boot provisioning for the Crystolia demo box (Lightsail user_data).
# Installs Docker Engine + the Compose plugin and prepares /opt/crystolia.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y ca-certificates curl gnupg

# Docker's official apt repository.
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

# Run docker as the default 'ubuntu' user without sudo.
usermod -aG docker ubuntu || true

# Deployment directory layout expected by docker-compose.demo.yml.
mkdir -p /opt/crystolia/deploy/demo \
         /opt/crystolia/backend \
         /opt/crystolia/frontend-admin \
         /opt/crystolia/frontend-client
chown -R ubuntu:ubuntu /opt/crystolia

echo "✅ Docker installed; /opt/crystolia ready. Next: copy .env.demo files and deploy."
