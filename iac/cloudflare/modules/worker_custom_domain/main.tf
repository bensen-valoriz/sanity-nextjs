locals {
  enabled = var.hostname != "" && var.zone_id != ""
}

resource "cloudflare_workers_domain" "this" {
  count = local.enabled ? 1 : 0

  account_id  = var.account_id
  zone_id     = var.zone_id
  hostname    = var.hostname
  service     = var.service
  environment = var.environment
}
