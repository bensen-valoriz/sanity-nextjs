variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "name" {
  description = "Name of the Worker script"
  type        = string
}

variable "content" {
  description = "Worker script content (JavaScript/TypeScript source)"
  type        = string
}

variable "compatibility_date" {
  description = "Cloudflare Workers compatibility date"
  type        = string
  default     = "2025-01-01"
}

variable "module_format" {
  description = "Whether the Worker uses ES module format (true) or Service Worker format (false)"
  type        = bool
  default     = true
}

variable "secret_bindings" {
  description = "List of secret text bindings (sensitive values set via Terraform)"
  type = list(object({
    name = string
    text = string
  }))
  default   = []
  sensitive = true
}

variable "plain_text_bindings" {
  description = "List of plain text environment variable bindings"
  type = list(object({
    name = string
    text = string
  }))
  default = []
}

variable "r2_bucket_bindings" {
  description = "List of R2 bucket bindings exposed to the Worker"
  type = list(object({
    name        = string
    bucket_name = string
  }))
  default = []
}
