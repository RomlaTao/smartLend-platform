#!/usr/bin/env bash
# Install Helm 3 (official script)
set -euo pipefail

if command -v helm &>/dev/null; then
  echo "==> helm already installed: $(helm version --short 2>/dev/null || helm version)"
  exit 0
fi

echo "==> Installing Helm 3..."
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
