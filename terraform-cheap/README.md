# terraform-cheap — Lightsail demo host

Optional Terraform for the **low-cost single-server demo** deployment of
Crystolia. It is a *parallel* stack — completely separate from the EKS
infrastructure in `crystolia-infra/terraform`.

## What it creates

| Resource                              | Purpose                              |
|---------------------------------------|--------------------------------------|
| `aws_lightsail_instance`              | one small box, Docker pre-installed  |
| `aws_lightsail_static_ip` (+attach)   | stable public IP for DNS             |
| `aws_lightsail_instance_public_ports` | firewall — 22, 80, 443 (tcp+udp)     |
| `aws_route53_record` ×3 *(optional)*  | A records for client/admin/api hosts |

Approximate cost: **~$12/month** (2 GB Lightsail bundle). See
[`../docs/deployment-cheap/cost-estimate.md`](../docs/deployment-cheap/cost-estimate.md).

## Safety

- **Local state only.** No `backend` block — state is `terraform.tfstate` in
  this folder. Never point it at the EKS state backend.
- It creates *new* resources only. It does **not** read, modify or destroy
  anything owned by the EKS stack.
- Review `terraform plan` before `apply`. Nothing here is destructive.

## Usage

```bash
cd terraform-cheap
cp terraform.tfvars.example terraform.tfvars   # then edit
terraform init
terraform plan                                 # review carefully
terraform apply                                # ~$12/mo of resources

terraform output static_ip                      # → point DNS here
```

To tear the demo down later: `terraform destroy` (affects only this stack).

## Prerequisites

- Terraform ≥ 1.5, AWS credentials with Lightsail (+ Route 53 if `manage_dns`).
- A Lightsail key pair for SSH — set `key_pair_name`, or leave empty to use the
  region's default key pair (download its private key from the Lightsail
  console → Account → SSH keys).

## After apply

Docker installs on first boot (~2-3 min). Then follow
[`../docs/deployment-cheap/aws-lightsail.md`](../docs/deployment-cheap/aws-lightsail.md)
from **"First deploy"** — copy the `.env.demo` files to the box and run the
deploy.

## Notes

- `bundle_id` / `blueprint_id` IDs and prices change; verify with
  `aws lightsail get-bundles` and `aws lightsail get-blueprints`.
- Default bundle `small_3_0` (~2 GB) suits the demo **with MongoDB Atlas**.
  For the bundled local Mongo, use `medium_3_0` (~4 GB).
- Narrow `ssh_cidr` to your own IP instead of `0.0.0.0/0`.
