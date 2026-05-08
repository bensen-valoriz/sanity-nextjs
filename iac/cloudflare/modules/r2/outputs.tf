output "name" {
  description = "R2 bucket name (for Worker r2_bucket_binding)"
  value       = cloudflare_r2_bucket.this.name
}
