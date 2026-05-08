variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers, R2, and account permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, qa, prod)"
  type        = string
  default     = "prod"
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker"
  type        = string
  default     = "test-automation-streak-deployment-prod"
}

variable "r2_bucket_name" {
  description = "Name of the R2 bucket (created by Terraform; not bound to the Worker here)"
  type        = string
  default     = "test-automation-streak-sites-r2-dev"
}

variable "worker_compatibility_date" {
  description = "Cloudflare Workers compatibility date"
  type        = string
  default     = "2025-01-01"
}

variable "worker_script_path" {
  description = "Path to the Worker script file relative to the repository root"
  type        = string
  default     = ".cloudflare/worker.js"
}

variable "sas_url" {
  description = "Azure Blob Storage SAS URL (secret)"
  type        = string
  sensitive   = true
}

variable "sas_token" {
  description = "Azure Blob Storage SAS Token (secret)"
  type        = string
  sensitive   = true
}
