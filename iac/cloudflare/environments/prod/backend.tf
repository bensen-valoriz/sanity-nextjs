terraform {
  backend "azurerm" {
    # Intentionally empty. All backend settings are injected at runtime via:
    # terraform init -backend-config="key=value"
  }
}
