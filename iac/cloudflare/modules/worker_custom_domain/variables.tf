variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for DNS (zone that will serve the hostname)"
  type        = string
  default     = ""
}

variable "hostname" {
  description = "Full hostname for the Worker (e.g. cdn.example.com). Empty skips creation."
  type        = string
  default     = ""
}

variable "service" {
  description = "Worker script name to attach (must match cloudflare_workers_script.name)"
  type        = string
}

variable "environment" {
  description = "Worker environment name (default production)"
  type        = string
  default     = "production"
}
