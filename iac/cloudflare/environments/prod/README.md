# Cloudflare Terraform (prod)

This folder is the Terraform root module for Cloudflare resources (Worker + R2) in the **prod** configuration. Remote state lives in **Azure Blob Storage**; CI runs from GitHub Actions.

Follow the sections below in order so `terraform init`, plan, and apply work locally and in CI without the common failures (empty secrets, wrong SAS scope, read-only tokens, environment mismatch between repo and GitHub Environment).

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|--------|
| Terraform | `>= 1.5.0` |
| Cloudflare | R2 enabled for the account if you use R2; Workers enabled |
| Cloudflare API token | Permissions for Workers, R2, and account operations (per your org policy) |
| Cloudflare account ID | Dashboard → account summary |
| Azure subscription | A storage account + blob container dedicated (or shared) for Terraform state |
| GitHub | Repository access; for Actions, secrets on the `dev` GitHub Environment (see §5) |

---

## 2. Azure: storage account and state container

Do this once (or use an existing layout that matches your org).

1. **Resource group**  
   Note the exact name, e.g. `my-rg-tfstate`. This value becomes `TF_STATE_RESOURCE_GROUP`.

2. **Storage account**  
   Create or pick a storage account in that resource group. Note the **account name only** (lowercase, no `https://`, no `.blob.core.windows.net`). This value becomes `TF_STATE_STORAGE_ACCOUNT`.  
   Common mistake: leaving this empty causes URLs like `https://.blob.core.windows.net/...` and DNS failures.

3. **Blob container**  
   Create a container (e.g. `tfstate`) for Terraform state blobs. The name becomes `TF_STATE_CONTAINER`.

4. **State file key (project slug)**  
   CI builds the blob key as:

   `nexus/tf-state-terraform/cloudflare/prod/<TF_STATE_PROJECT>.terraform.tfstate`

   Pick a short stable identifier for `TF_STATE_PROJECT` (e.g. `cloudflare-prod`). It must not be empty in CI.

---

## 3. SAS token for remote state only (`TF_STATE_SAS_TOKEN`)

The Terraform backend is `azurerm` and authenticates to Azure Blob using a **SAS token** in non-interactive environments (no `az login` on GitHub runners). This token is **only** for the state container. It must **not** be confused with `SAS_TOKEN` / `SAS_URL`, which are **Terraform input variables** for your modules (see §4).

### 3.1 Permissions (avoid 403)

Terraform needs to **list** blobs (workspaces/prefix), **read** and **write** state, and **delete** is strongly recommended for state lifecycle and some backends.

| Token type | Typical `sp=` | Result |
|------------|----------------|--------|
| Read-only | `r` only | **Fails** with 403 / auth errors during init (listing) |
| Minimum that usually works | `rlw` | List + read + write |
| Recommended | `rlwd` | Adds delete for safer long-term use |

Your SAS must be generated for the **same** storage account as `TF_STATE_STORAGE_ACCOUNT` and the **same** container as `TF_STATE_CONTAINER`.

### 3.2 Scope

- Prefer a **container-level** SAS (Azure often shows resource type **Container**, `sr=c`) scoped to the state container.
- Do not generate a SAS for a different container or storage account than the secrets you configure.

### 3.3 Format (what to paste into GitHub)

- Store **only** the query string: `sv=...&spr=...&st=...&se=...&sr=c&sp=...&sig=...`
- **No** leading `?`
- **Not** a full blob URL (if it starts with `https://`, strip the path and use only the part after `?`)

The workflow strips a single leading `?` if present, but you should store the value without it to avoid mistakes.

### 3.4 How to generate (Azure Portal)

1. Open the **storage account** → **Containers** → select your state container.
2. Use **Shared access tokens** / **Generate SAS** (wording varies by portal version).
3. Set **expiry** safely in the future; rotate before expiry.
4. Enable permissions at least **List**, **Read**, **Write** (and **Delete** if offered).
5. Generate and copy the **SAS token** (query parameters only) into the secret `TF_STATE_SAS_TOKEN`.

---

## 4. SAS values for Terraform modules (`SAS_URL` and `SAS_TOKEN`)

These are **not** used by the Terraform backend. They map to root module variables `sas_url` and `sas_token` (see `variables.tf`) for resources that need Azure blob access in your configuration.

- Set them to whatever your modules expect (often a base URL and a token string).
- Keep them separate from `TF_STATE_SAS_TOKEN` so state access can be rotated independently.

Local example:

```bash
export TF_VAR_sas_url="<value-required-by-your-modules>"
export TF_VAR_sas_token="<value-required-by-your-modules>"
```

---

## 5. GitHub Actions: where secrets must live

Workflows `.github/workflows/terraform.yml` and `.github/workflows/terraform-destroy.yml` set `environment: dev` on the job. That means:

- Secrets must be defined as environment secrets on the `dev` GitHub Environment (or change the job’s `environment` to match where you store secrets).
- Repository-only secrets are not injected into the job unless they are also available to that environment (or you remove `environment:` from the workflow).

### 5.1 Required environment secrets

| Secret | Purpose |
|--------|---------|
| `TF_STATE_RESOURCE_GROUP` | Azure resource group of the storage account |
| `TF_STATE_STORAGE_ACCOUNT` | Storage account name **only** |
| `TF_STATE_CONTAINER` | Blob container name holding state |
| `TF_STATE_PROJECT` | Slug used in the state blob key (see §2) |
| `TF_STATE_SAS_TOKEN` | Container SAS for backend auth (§3) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `SAS_URL` | Module variable `sas_url` |
| `SAS_TOKEN` | Module variable `sas_token` (different from `TF_STATE_SAS_TOKEN`) |

### 5.2 Run workflows

- **Plan / apply:** Actions → **Terraform Cloudflare** → Run workflow.
- **Destroy:** Actions → **Terraform Cloudflare Destroy** → Run workflow → type **`destroy`** in the confirmation field.

---

## 6. Backend configuration (local)

`backend.tf` has an empty `azurerm` block; all backend settings are passed at `terraform init`.

With **SAS** (matches CI):

```bash
export TF_STATE_PROJECT="<slug>"
STATE_KEY="nexus/tf-state-terraform/cloudflare/prod/${TF_STATE_PROJECT}.terraform.tfstate"

# Query string only, no leading ?
export BACKEND_SAS_TOKEN="<same-shape-as-TF_STATE_SAS_TOKEN>"

terraform init -reconfigure \
  -backend-config="resource_group_name=<rg-name>" \
  -backend-config="storage_account_name=<storage-account>" \
  -backend-config="container_name=<container-name>" \
  -backend-config="sas_token=${BACKEND_SAS_TOKEN}" \
  -backend-config="key=${STATE_KEY}"
```

If you use **Azure CLI** already logged in instead of SAS, you can omit `sas_token` and rely on your local Azure credentials only when that matches your security policy:

```bash
terraform init -reconfigure \
  -backend-config="resource_group_name=<rg-name>" \
  -backend-config="storage_account_name=<storage-account>" \
  -backend-config="container_name=<container-name>" \
  -backend-config="key=<state-key>"
```

---

## 7. Variable injection (local)

```bash
export TF_VAR_cloudflare_api_token="<token>"
export TF_VAR_cloudflare_account_id="<account-id>"
export TF_VAR_sas_url="<module-sas-url>"
export TF_VAR_sas_token="<module-sas-token>"
```

Non-sensitive values can stay in `terraform.tfvars`.

---

## 8. Local plan and apply

After a successful init:

```bash
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

---

## 9. Troubleshooting

| Symptom | Likely cause | What to fix |
|---------|----------------|-------------|
| `TF_STATE_PROJECT is required` | Secret empty or job not reading environment secrets | Set `TF_STATE_PROJECT` on the **`dev`** environment; confirm workflow uses `environment: dev` |
| `az login` / AzureCli authorizer | Backend init without usable credentials | Ensure `TF_STATE_SAS_TOKEN` is set and passed (CI already passes `sas_token`) |
| `https://.blob.core.windows.net` / host empty | `storage_account_name` empty | Set `TF_STATE_STORAGE_ACCOUNT` to the **account name** only |
| `403 AuthenticationFailed` on init / list blobs | SAS read-only, wrong scope, wrong account/container, expired SAS, or token mis-copied | Regenerate container SAS with **List + Read + Write** (and **Delete** recommended); match account and container secrets; paste query string without full URL |
| Validation lists missing secrets | Incomplete environment configuration | Fill every secret in §5.1 on environment **`dev`** |
| Backend works but modules fail later | Wrong module SAS | Adjust `SAS_URL` / `SAS_TOKEN` independently of state SAS |

---

## 10. Files and workflows reference

| Item | Role |
|------|------|
| `backend.tf` | `azurerm` backend; config via `-backend-config` |
| `.github/workflows/terraform.yml` | Plan and apply |
| `.github/workflows/terraform-destroy.yml` | Plan destroy and apply (with confirmation) |

---

## Security notes

- Treat every SAS as sensitive; rotate on schedule or after exposure.
- Do not reuse one read-only SAS for state; it will fail with permissions errors.
- Restrict GitHub **`dev`** environment with required reviewers if production state is risky to change.
