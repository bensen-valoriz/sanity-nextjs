environment               = "prod"
worker_name               = "web-streakjs"
r2_bucket_name            = "web"
worker_compatibility_date = "2025-01-01"
pages_web_cms_name        = "web-cms"

# Worker custom domain (both must be non-empty to create cloudflare_workers_domain):
# cloudflare_worker_custom_hostname           = "cdn.example.com"
# cloudflare_worker_custom_hostname_zone_id  = "<zone id from Cloudflare dashboard>"

# Pages web-cms custom domain (cloudflare_pages_domain; DNS/CNAME per Cloudflare dashboard):
# cloudflare_pages_web_cms_custom_hostname = "www.example.com"

# Provide sensitive values via environment variables in CI/CD or locally:
# TF_VAR_cloudflare_api_token
# TF_VAR_cloudflare_account_id
