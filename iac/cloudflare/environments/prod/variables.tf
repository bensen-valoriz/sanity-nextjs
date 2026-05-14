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
  default     = "iac/cloudflare/scripts/worker.js"
}

variable "cloudflare_worker_custom_hostname" {
  description = "Public hostname for this stack's Cloudflare Worker (cloudflare_workers_domain), e.g. cdn.example.com. Leave empty to skip."
  type        = string
  default     = ""
}

variable "cloudflare_worker_custom_hostname_zone_id" {
  description = "Cloudflare DNS zone ID where cloudflare_worker_custom_hostname is managed (Workers custom domains). Leave empty to skip."
  type        = string
  default     = ""
}

variable "pages_web_cms_name" {
  description = "Cloudflare Pages project name for the web CMS"
  type        = string
  default     = "web-cms"
}

variable "pages_web_cms_production_branch" {
  description = "Production branch label for the web-cms Pages project (required by API; use with Git-connected source or as label for direct uploads). In CI, set GitHub secret CLOUDFLARE_PAGES_WEB_CMS_PRODUCTION_BRANCH (mapped to TF_VAR_pages_web_cms_production_branch); the workflow defaults to main when that secret is unset or empty."
  type        = string
  default     = "main"
}

variable "cloudflare_pages_web_cms_custom_hostname" {
  description = "Public hostname for the web-cms Cloudflare Pages project (cloudflare_pages_domain), e.g. www.example.com. Leave empty to skip."
  type        = string
  default     = ""
}
