variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name to attach the custom domain to"
  type        = string
}

variable "domain" {
  description = "Custom hostname for the Pages project (e.g. www.example.com). Empty skips creation."
  type        = string
  default     = ""
}
