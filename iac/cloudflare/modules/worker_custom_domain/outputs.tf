output "id" {
  description = "Workers custom domain ID when created"
  value       = try(cloudflare_workers_domain.this[0].id, null)
}

output "hostname" {
  description = "Configured hostname when created"
  value       = try(cloudflare_workers_domain.this[0].hostname, null)
}
