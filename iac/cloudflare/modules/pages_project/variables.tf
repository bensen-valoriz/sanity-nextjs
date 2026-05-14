variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "name" {
  description = "Cloudflare Pages project name (unique within the account)"
  type        = string
}

variable "production_branch" {
  description = "Production branch name (used as the label for production deployments; required even for direct-upload projects)"
  type        = string
  default     = "main"
}
