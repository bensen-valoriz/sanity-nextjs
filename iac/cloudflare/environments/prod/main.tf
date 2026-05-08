# R2 and Worker are separate resources; attach R2 to the Worker in the dashboard
# or via wrangler if the script uses an R2 binding (e.g. env.STREAK_SITES).

locals {
  # path.root is this prod module directory (~.../environments/prod).
  worker_script_abs = "${path.root}/../../../../../../${var.worker_script_path}"
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

  secret_bindings = [
    { name = "SAS_URL", text = var.sas_url },
    { name = "SAS_TOKEN", text = var.sas_token },
  ]

  r2_bucket_bindings = [
    { name = "STREAK_SITES", bucket_name = module.r2.name },
  ]
}
