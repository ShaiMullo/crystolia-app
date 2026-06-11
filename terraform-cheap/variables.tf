# =============================================================================
# terraform-cheap — input variables
# =============================================================================

variable "aws_region" {
  description = "AWS region for the Lightsail instance."
  type        = string
  default     = "us-east-1"
}

variable "availability_zone" {
  description = "Availability zone (must be in aws_region), e.g. us-east-1a."
  type        = string
  default     = "us-east-1a"
}

variable "instance_name" {
  description = "Name of the Lightsail instance."
  type        = string
  default     = "crystolia-prod"
}

variable "static_ip_name" {
  description = "Name of the Lightsail static IP (decoupled from instance_name so the instance can be renamed without replacing the IP)."
  type        = string
  default     = "crystolia-demo-ip"
}

variable "blueprint_id" {
  description = "Lightsail OS blueprint. List with: aws lightsail get-blueprints"
  type        = string
  default     = "ubuntu_22_04"
}

variable "bundle_id" {
  description = <<-EOT
    Lightsail bundle (size + price). VERIFY current IDs / prices with:
      aws lightsail get-bundles --query 'bundles[].{id:bundleId,ram:ramSizeInGb,price:price}'
    Approx: nano_3_0 ≈ 512MB/$5, micro_3_0 ≈ 1GB/$7, small_3_0 ≈ 2GB/$12,
            medium_3_0 ≈ 4GB/$24. 2GB (small) is the recommended demo size
            when using Atlas; use 4GB if running the bundled local Mongo.
  EOT
  type        = string
  default     = "small_3_0"
}

variable "key_pair_name" {
  description = <<-EOT
    Name of an existing Lightsail key pair for SSH. Leave empty to use the
    region's default Lightsail key pair (download it from the console).
  EOT
  type        = string
  default     = ""
}

variable "ssh_cidr" {
  description = "CIDR allowed to reach SSH (port 22). Narrow this to your IP."
  type        = string
  default     = "0.0.0.0/0"
}

# ── Optional DNS (Route 53) ──────────────────────────────────────────────────
variable "manage_dns" {
  description = "If true, create Route 53 A records for the three demo hosts."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID (required when manage_dns = true)."
  type        = string
  default     = ""
}

variable "client_domain" {
  description = "Customer portal hostname."
  type        = string
  default     = "crystolia.com"
}

variable "admin_domain" {
  description = "Admin CRM hostname."
  type        = string
  default     = "admin.crystolia.com"
}

variable "api_domain" {
  description = "Public API hostname."
  type        = string
  default     = "api.crystolia.com"
}

variable "tags" {
  description = "Tags applied to taggable resources."
  type        = map(string)
  default = {
    Project = "crystolia"
    Stack   = "demo-lightsail"
  }
}
