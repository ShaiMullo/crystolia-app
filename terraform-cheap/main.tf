# =============================================================================
# terraform-cheap — AWS Lightsail demo host for Crystolia
# =============================================================================
# Provisions ONE small Lightsail instance that runs the whole app via
# docker-compose.demo.yml. This is a parallel, low-cost alternative to the
# EKS stack in crystolia-infra — it creates NOTHING that the EKS stack owns.
#
#   terraform init
#   terraform plan
#   terraform apply        # creates ~$12/mo of resources — review the plan!
#
# Nothing here is destructive to existing infrastructure.
# =============================================================================

# ── Compute: the demo instance ───────────────────────────────────────────────
resource "aws_lightsail_instance" "demo" {
  name              = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id

  # Empty string ⇒ Lightsail uses the region's default key pair.
  key_pair_name = var.key_pair_name != "" ? var.key_pair_name : null

  # First-boot: install Docker + Compose, prepare /opt/crystolia.
  user_data = file("${path.module}/scripts/install-docker.sh")

  tags = var.tags
}

# ── Stable public IP ─────────────────────────────────────────────────────────
# Name is decoupled from instance_name so the instance can be renamed without
# replacing the (already-allocated) static IP. Defaults to "<instance>-ip".
resource "aws_lightsail_static_ip" "demo" {
  name = var.static_ip_name
}

resource "aws_lightsail_static_ip_attachment" "demo" {
  static_ip_name = aws_lightsail_static_ip.demo.name
  instance_name  = aws_lightsail_instance.demo.name
}

# ── Firewall: only SSH (22), HTTP (80), HTTPS (443/tcp+udp) ──────────────────
resource "aws_lightsail_instance_public_ports" "demo" {
  instance_name = aws_lightsail_instance.demo.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = [var.ssh_cidr]
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }

  # HTTP/3 (QUIC) — Caddy serves it; harmless if unused.
  port_info {
    protocol  = "udp"
    from_port = 443
    to_port   = 443
  }
}

# ── Optional DNS (Route 53) ──────────────────────────────────────────────────
# Created only when manage_dns = true. Points the three demo hostnames at the
# static IP. If your DNS lives elsewhere, leave manage_dns = false and create
# equivalent A records manually (see docs/deployment-cheap/dns.md).
locals {
  dns_records = var.manage_dns ? {
    client = var.client_domain
    admin  = var.admin_domain
    api    = var.api_domain
  } : {}
}

resource "aws_route53_record" "demo" {
  for_each = local.dns_records

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "A"
  ttl     = 300
  records = [aws_lightsail_static_ip.demo.ip_address]
}
