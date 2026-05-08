output "worker_name" {
  description = "Name of the deployed Worker script"
  value       = cloudflare_workers_script.this.name
}
