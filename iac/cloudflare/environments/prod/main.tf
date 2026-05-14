# R2 and Worker are separate resources; attach R2 to the Worker in the dashboard
# or via wrangler if the script uses an R2 binding (e.g. env.STREAK_SITES).

locals {
  # path.root is .../iac/cloudflare/environments/prod; repo root is four levels up.
  worker_script_abs = "${path.root}/../../../../${var.worker_script_path}"
}

moved {
  from = cloudflare_workers_domain.worker_custom[0]
  to   = module.worker_custom_domain.cloudflare_workers_domain.this[0]
}

module "r2" {
  source = "../../modules/r2"

  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_name
}

module "worker" {
  source = "../../modules/worker"

  account_id         = var.cloudflare_account_id
  name               = var.worker_name
  content            = file(local.worker_script_abs)
  compatibility_date = var.worker_compatibility_date

  r2_bucket_bindings = [
    { name = "STREAK_SITES", bucket_name = module.r2.name },
  ]

  plain_text_bindings = var.cloudflare_worker_custom_hostname != "" ? [
    {
      name = "CUSTOM_DOMAIN"
      text = var.cloudflare_worker_custom_hostname
    }
  ] : []
}

module "worker_custom_domain" {
  source = "../../modules/worker_custom_domain"

  account_id = var.cloudflare_account_id
  zone_id    = var.cloudflare_worker_custom_hostname_zone_id
  hostname   = var.cloudflare_worker_custom_hostname
  service    = module.worker.worker_name
}

module "pages_web_cms" {
  source = "../../modules/pages_project"

  account_id        = var.cloudflare_account_id
  name              = var.pages_web_cms_name
  production_branch = var.pages_web_cms_production_branch
}

module "pages_web_cms_custom_domain" {
  source = "../../modules/pages_custom_domain"

  account_id   = var.cloudflare_account_id
  project_name = module.pages_web_cms.name
  domain       = var.cloudflare_pages_web_cms_custom_hostname
}
