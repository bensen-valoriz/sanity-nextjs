output "id" {
  description = "Pages custom domain ID when created"
  value       = try(cloudflare_pages_domain.this[0].id, null)
}

output "domain" {
  description = "Configured custom domain when created"
  value       = try(cloudflare_pages_domain.this[0].domain, null)
}

output "status" {
  description = "Provisioning status when created (e.g. pending validation)"
  value       = try(cloudflare_pages_domain.this[0].status, null)
}
