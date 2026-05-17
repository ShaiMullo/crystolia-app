# =============================================================================
# terraform-cheap — outputs
# =============================================================================

output "static_ip" {
  description = "Public static IP of the demo instance — point DNS A records here."
  value       = aws_lightsail_static_ip.demo.ip_address
}

output "instance_name" {
  description = "Lightsail instance name."
  value       = aws_lightsail_instance.demo.name
}

output "ssh_command" {
  description = "SSH into the box (assumes the Ubuntu blueprint default user)."
  value       = "ssh ubuntu@${aws_lightsail_static_ip.demo.ip_address}"
}

output "dns_records_managed" {
  description = "Whether Route 53 records were created by this stack."
  value       = var.manage_dns
}

output "next_steps" {
  description = "What to do after apply."
  value       = <<-EOT
    1. Point DNS A records (client/admin/api) at ${aws_lightsail_static_ip.demo.ip_address}
       (skipped here unless manage_dns = true).
    2. Wait for first-boot Docker install to finish (~2-3 min).
    3. Follow docs/deployment-cheap/aws-lightsail.md from "First deploy".
  EOT
}
