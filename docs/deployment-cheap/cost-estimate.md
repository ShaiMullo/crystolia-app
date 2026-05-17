# Cost Estimate

> Prices are **approximate**, US regions, on-demand, as a planning guide.
> Always confirm in the AWS console / pricing pages — AWS changes pricing and
> Lightsail bundle IDs periodically.

## Summary

| Option                         | ~Monthly | Notes |
|--------------------------------|----------|-------|
| **EKS (current production)**   | **~$180-250** | full Kubernetes |
| **Lightsail demo + Atlas M0**  | **~$12**      | ← recommended for the demo |
| EC2 t3.small demo + Atlas M0   | ~$17-19       | more ops overhead than Lightsail |
| EC2 t4g.micro demo + Atlas M0  | ~$9-12        | 1 GB RAM — tight; needs swap |

The demo path is roughly a **90-95% cost reduction** versus EKS.

## EKS — current production (itemized)

| Item                         | ~Monthly |
|------------------------------|----------|
| EKS control plane            | ~$73 ($0.10/hr) |
| Worker nodes (2 × t3.medium) | ~$60 |
| Application Load Balancer    | ~$18-22 + LCU |
| NAT Gateway                  | ~$32 + data |
| EBS volumes, ECR, transfer   | ~$10-25 |
| Route 53 hosted zone         | ~$0.50 |
| **Total**                    | **~$180-250** |

NAT Gateway and the ALB are the silent costs — they run 24/7 regardless of
traffic. Great for real production HA; overkill for a demo.

## Lightsail demo (recommended)

| Item                              | ~Monthly |
|-----------------------------------|----------|
| Lightsail instance — 2 GB bundle  | ~$12 (incl. static IP, 60 GB SSD, 3 TB transfer) |
| MongoDB Atlas **M0**              | $0 (free forever; 512 MB; shared) |
| GHCR image registry               | $0 (free for public; free quota for private) |
| Route 53 hosted zone *(optional)* | ~$0.50 (free if DNS is elsewhere) |
| **Total**                         | **~$12-13** |

Lightsail bundles everything (compute + storage + static IP + generous
transfer) into one flat price — ideal for a predictable demo budget.
The bundled local Mongo instead of Atlas needs the 4 GB bundle (~$24/mo).

## EC2 alternative

| Item                       | t4g.micro | t3.small |
|----------------------------|-----------|----------|
| Instance (on-demand)       | ~$6/mo    | ~$15/mo  |
| EBS gp3 30 GB              | ~$2.40    | ~$2.40   |
| Elastic IP (attached)      | $0        | $0       |
| Data transfer (light)      | ~$0-2     | ~$0-2    |
| **Total**                  | **~$9-11**| **~$18-20** |

- `t4g.micro` (ARM Graviton, 1 GB) is cheapest but **1 GB is tight** for
  backend + 2 Next.js + Caddy — add swap, expect occasional pressure. ARM also
  means building `linux/arm64` images (set `platforms:` in `demo-deploy.yml`).
- `t3.small` (x86, 2 GB) is comfortable but costs **more than Lightsail 2 GB**.
- EC2 also means you manage the OS, security groups and patching yourself —
  Lightsail folds that into its flat price.
- **New AWS accounts**: `t3.micro` is free for 12 months (750 hrs/mo).
- A 1-year Compute Savings Plan cuts `t4g.micro` to ~$4/mo.

→ For a demo, **Lightsail 2 GB wins** on simplicity and predictable cost.

## MongoDB options

| Option            | ~Monthly | Notes |
|-------------------|----------|-------|
| Atlas **M0**      | $0       | free; 512 MB; shared; **replica set** (transactions work) |
| Bundled local Mongo | $0     | needs the 4 GB box; **standalone** (no transactions — fallback mode) |
| Atlas **M10**     | ~$57     | dedicated; only if you outgrow M0 — not needed for a demo |

Atlas M0 is the sweet spot: free, offloads RAM from the tiny box, and being a
replica set it makes the Phase 7/8 transactional flows fully atomic.

## Bottom line

**Lightsail 2 GB + Atlas M0 ≈ $12/month**, versus **~$180-250/month** for EKS.
For a final-project demo / book, the cheap path is the obvious choice; the EKS
stack stays in the repos, ready when real production scale is needed.
