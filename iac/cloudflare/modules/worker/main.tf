resource "cloudflare_workers_script" "this" {
  account_id         = var.account_id
  name               = var.name
  content            = var.content
  compatibility_date = var.compatibility_date
  module             = var.module_format

  dynamic "secret_text_binding" {
    for_each = var.secret_bindings
    content {
      name = secret_text_binding.value.name
      text = secret_text_binding.value.text
    }
  }

  dynamic "plain_text_binding" {
    for_each = var.plain_text_bindings
    content {
      name = plain_text_binding.value.name
      text = plain_text_binding.value.text
    }
  }

  dynamic "r2_bucket_binding" {
    for_each = var.r2_bucket_bindings
    content {
      name        = r2_bucket_binding.value.name
      bucket_name = r2_bucket_binding.value.bucket_name
    }
  }
}
