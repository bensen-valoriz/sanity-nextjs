#!/bin/bash

# ===== ASK USER INPUT =====
read -p "Enter Storage Account Name: " STORAGE_ACCOUNT
read -p "Enter Container Name: " CONTAINER_NAME

# ===== CONFIG =====

# Expiry: 1 year from now
EXPIRY=$(date -u -d "1 year" '+%Y-%m-%dT%H:%MZ')

# Permissions
PERMISSIONS="rl"

# ===== FETCH STORAGE ACCOUNT KEY =====
ACCOUNT_KEY=$(az storage account keys list \
  --account-name "$STORAGE_ACCOUNT" \
  --query "[0].value" \
  -o tsv)

# ===== GENERATE SAS TOKEN =====
SAS_TOKEN=$(az storage container generate-sas \
  --account-name "$STORAGE_ACCOUNT" \
  --name "$CONTAINER_NAME" \
  --permissions "$PERMISSIONS" \
  --expiry "$EXPIRY" \
  --account-key "$ACCOUNT_KEY" \
  -o tsv)

# ===== OUTPUT =====
echo ""
echo "SAS Token:"
echo "$SAS_TOKEN"