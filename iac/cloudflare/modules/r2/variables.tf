variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "name" {
  description = "R2 bucket name (unique within the account)"
  type        = string
}
