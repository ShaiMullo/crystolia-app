# AWS Lightsail — Server Setup & First Deploy

Step-by-step for the low-cost demo box. ~20 minutes end to end.

## 0. Choose your size

| Use case                          | Bundle      | RAM   | ~Price |
|-----------------------------------|-------------|-------|--------|
| Demo + **MongoDB Atlas** (advised)| `small_3_0` | 2 GB  | ~$12/mo|
| Demo + **bundled local Mongo**    | `medium_3_0`| 4 GB  | ~$24/mo|

Verify current IDs/prices: `aws lightsail get-bundles`.

## 1. Create the instance

### Option A — Terraform (recommended)

```bash
cd terraform-cheap
cp terraform.tfvars.example terraform.tfvars   # edit region, size, ssh_cidr
terraform init && terraform plan && terraform apply
terraform output static_ip
```

Docker + Compose install automatically on first boot, and `/opt/crystolia`
is created. Skip to step 4.

### Option B — Lightsail console

1. Lightsail → **Create instance** → Linux/Unix → **Ubuntu 22.04 LTS**.
2. Pick the bundle from step 0.
3. Create. Then **Networking → Create static IP** and attach it.
4. **Networking → IPv4 Firewall** — allow `SSH 22`, `HTTP 80`, `HTTPS 443`
   (and `443/UDP` for HTTP/3). Restrict SSH to your IP if possible.

## 2. Install Docker (console option only)

SSH in (`ssh ubuntu@<STATIC_IP>`), then:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo mkdir -p /opt/crystolia/deploy/demo \
              /opt/crystolia/backend \
              /opt/crystolia/frontend-admin \
              /opt/crystolia/frontend-client
sudo chown -R ubuntu:ubuntu /opt/crystolia
exit   # re-login so the docker group applies
```

## 3. MongoDB Atlas (recommended DB)

1. <https://cloud.mongodb.com> → free **M0** cluster.
2. **Database Access** — create a user.
3. **Network Access** — allow the Lightsail static IP (or `0.0.0.0/0` for a
   short demo).
4. Copy the `mongodb+srv://…` connection string → goes in `backend/.env.demo`.

## 4. Configure environment on the box

```bash
cd /opt/crystolia
# Copy the three example files from the repo into place, then fill them in.
# (scp them up, or paste with nano.)
nano deploy/demo/.env.demo          # from deploy/demo/.env.demo.example
nano backend/.env.demo              # from backend/.env.demo.example
nano frontend-admin/.env.demo       # from frontend-admin/.env.demo.example
nano frontend-client/.env.demo      # from frontend-client/.env.demo.example
```

Generate the shared secret once and paste the **same value** into both
`backend/.env.demo` and `frontend-admin/.env.demo`:

```bash
openssl rand -hex 32
```

See [`env-vars.md`](./env-vars.md) for every field.

## 5. Get the compose + Caddy files onto the box

The **Demo Deploy** workflow copies `docker-compose.demo.yml` and the
`Caddyfile` automatically. For the very first manual deploy, copy them once:

```bash
# from your laptop, inside the crystolia-app repo:
scp docker-compose.demo.yml ubuntu@<STATIC_IP>:/opt/crystolia/
scp deploy/demo/Caddyfile   ubuntu@<STATIC_IP>:/opt/crystolia/deploy/demo/
scp deploy/demo/remote-deploy.sh ubuntu@<STATIC_IP>:/opt/crystolia/deploy/demo/
```

## 6. Log in to the image registry

The demo images live in GHCR. If the packages are **private**:

```bash
echo "<GHCR_PAT_with_read:packages>" | docker login ghcr.io -u <github-user> --password-stdin
```

If you make the GHCR packages **public**, no login is needed.

## 7. First deploy

Ensure DNS already points at the static IP ([`dns.md`](./dns.md)) — Caddy
needs it to issue certificates.

```bash
cd /opt/crystolia
IMAGE_TAG=demo-latest \
  docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo pull
IMAGE_TAG=demo-latest \
  docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo up -d
docker compose -f docker-compose.demo.yml ps
```

(For the bundled Mongo, add `--profile local-mongo` to both commands.)

## 8. Seed the first admin user

`NODE_ENV=production` disables auto-seeding. Run the seed once, overriding
`NODE_ENV` for that single invocation:

```bash
cd /opt/crystolia
docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo \
  run --rm -e NODE_ENV=development backend node dist/scripts/seed.js
```

Creates `admin@crystolia.com / Admin123!` and `agent@crystolia.com / Agent123!`.
**Change the admin password immediately** after first login.

Optional realistic demo data (products, customers, orders, invoices…):

```bash
docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo \
  run --rm -e NODE_ENV=development backend node dist/scripts/seedDemo.js
```

## 9. Verify

```bash
curl -fsS https://api.crystolia.com/api/health      # → {"status":"ok",...}
```

Open `https://crystolia.com`, `https://admin.crystolia.com` (log in), and
**Admin → System** — confirm the health score and `replica_set` topology
(Atlas) or `Fallback mode` (local Mongo).

## 10. Future updates

Configure the GitHub secrets/variables ([`README.md`](./README.md) → workflow),
then just run the **Demo Deploy** action. It builds, pushes and redeploys —
no SSH needed.
