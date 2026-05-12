# GitHub Actions Setup — IAC Cloudflare

## Purpose

This repo contains reusable GitHub Actions pipelines for Terraform (Cloudflare).

For each client:
- Copy the workflow files into the client repo
- Configure environment and secrets in that repo
- Pipelines will fetch IaC from a separate private repo and execute it

---

## How it works

- Pipeline runs from the client repo
- IaC is pulled from another private repo
- Terraform runs against that IaC

---

## Setup in Client Repo

### 1. Copy pipelines

Copy these workflows into the client repo:

- iac-create.yml
- iac-destroy.yml

---

### 2. Create environment

Go to:

Settings → Environments → dev

Create environment named:

dev

---

### 3. Add required secrets (Environment: dev)

#### Terraform backend (Azure)

- TF_STATE_PROJECT
- TF_STATE_STORAGE_ACCOUNT
- TF_STATE_RESOURCE_GROUP
- TF_STATE_CONTAINER
- TF_STATE_SAS_TOKEN

#### Cloudflare

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID

#### Module/runtime

- SAS_URL
- SAS_TOKEN

#### IaC repo access (required)

- REPO_ACCESS_TOKEN

This is required to clone the private IaC repo:
bensen-valoriz/sanity-nextjs

---

## Token Setup

### GitHub repo access token

Create a fine-grained token with:

- Repository access: IaC repo
- Permission: Contents → Read

Store it as:

REPO_ACCESS_TOKEN

---

### Cloudflare API token

Minimum permissions:

- Account → Workers Scripts: Edit
- Account → Workers R2 Storage: Edit

Add more permissions if your IaC includes DNS or other resources.

---

## Important Notes

- Pipelines run using:
  environment: dev
  Secrets must be added under the environment, not just at repository level

- IaC is not inside the client repo
  It is cloned at runtime

- Do not change workflow permissions unless required
  (contents: read is sufficient)

---

## How to Run

### Apply (Create)

- Go to Actions → IAC Cloudflare
- Click Run workflow

---

### Destroy

- Go to Actions → IAC Cloudflare Destroy
- Click Run workflow
- Enter:

confirmation=destroy

---

## Troubleshooting

Missing directory error:
- Incorrect working directory path
- Verify IaC repo structure

Missing secret error:
- Secret not added under environment dev

Terraform backend errors (403 / auth):
- Invalid or expired TF_STATE_SAS_TOKEN

Cloudflare errors:
- Token permissions insufficient or incorrect account ID

---

## Summary

For every client repo:

1. Copy workflows
2. Create dev environment
3. Add required secrets
4. Run pipeline

IaC will be fetched and applied automatically.