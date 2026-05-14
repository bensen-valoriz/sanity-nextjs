locals {
  enabled = var.domain != ""
}

resource "cloudflare_pages_domain" "this" {
  count = local.enabled ? 1 : 0

  account_id   = var.account_id
  project_name = var.project_name
  domain       = var.domain
}
