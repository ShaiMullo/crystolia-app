# DNS Setup

The demo serves three hostnames; all point at the **same** Lightsail static IP.

| Hostname              | Record | Value         | Serves          |
|-----------------------|--------|---------------|-----------------|
| `crystolia.com`       | A      | `<STATIC_IP>` | customer portal |
| `admin.crystolia.com` | A      | `<STATIC_IP>` | admin CRM/ERP   |
| `api.crystolia.com`   | A      | `<STATIC_IP>` | public API      |

`www.crystolia.com` is optional — add it as an A record too if you want it
(Caddy can also redirect it; not configured by default).

## Option A — Route 53 via Terraform

In `terraform-cheap/terraform.tfvars`:

```hcl
manage_dns      = true
route53_zone_id = "Z0123456789ABCDEFGHIJ"
client_domain   = "crystolia.com"
admin_domain    = "admin.crystolia.com"
api_domain      = "api.crystolia.com"
```

`terraform apply` creates the three A records pointing at the static IP.

## Option B — Route 53 console

Hosted zone → **Create record** for each hostname: type `A`, value = static IP,
TTL 300.

## Option C — any other DNS provider

Create three `A` records (or two `A` + a `CNAME` for `api`/`admin` → apex) at
your registrar, all resolving to the static IP.

## Apex domain note

`crystolia.com` is an apex (zone root). Apex records must be `A` (or an
`ALIAS`/`ANAME` if your provider supports it) — a plain `CNAME` at the apex is
invalid. Pointing the apex `A` straight at the Lightsail static IP is simplest.

## TLS / certificate ordering

Caddy requests Let's Encrypt certificates **on first request per hostname**
using the HTTP-01 challenge — which needs the DNS A record to already resolve
to the box and ports 80/443 reachable.

1. Create the DNS records **first**.
2. Wait for propagation: `dig +short api.crystolia.com` should return the IP.
3. *Then* run the first deploy.

Testing with a domain whose DNS is not ready yet? Uncomment `acme_ca` (staging
CA) in `deploy/demo/Caddyfile` to avoid Let's Encrypt production rate limits,
then switch back.

## Verify

```bash
dig +short crystolia.com admin.crystolia.com api.crystolia.com
curl -I https://api.crystolia.com/api/health     # 200 + valid TLS once issued
```
