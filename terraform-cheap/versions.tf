# =============================================================================
# terraform-cheap — provider + version constraints
# =============================================================================
# IMPORTANT: this stack uses LOCAL state by design. It is intentionally
# SEPARATE from the EKS infrastructure in `crystolia-infra/terraform`.
# Do NOT add a remote backend that points at the EKS state — keeping the
# states apart means this cheap stack can never affect the EKS resources.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # No `backend` block → local state (terraform.tfstate in this folder).
}

provider "aws" {
  region = var.aws_region
}
