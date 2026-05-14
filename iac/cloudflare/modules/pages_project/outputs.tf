output "name" {
  description = "Pages project name"
  value       = cloudflare_pages_project.this.name
}

output "id" {
  description = "Pages project ID (provider-composed identifier)"
  value       = cloudflare_pages_project.this.id
}

output "subdomain" {
  description = "Default *.pages.dev hostname suffix for the project (without scheme)"
  value       = cloudflare_pages_project.this.subdomain
}
