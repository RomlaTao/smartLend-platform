#!/usr/bin/env bash
# Teardown: remove SmartLend namespace, Helm releases, PVCs (all cluster data lost)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NS=smartlend

source "${ROOT_DIR}/scripts/k3s-preflight.sh"
k3s_setup_kubectl || true

echo "==> Teardown namespace: ${NS}"
echo "    This deletes ALL workloads, PVCs (MySQL/Redis/RabbitMQ data), and Helm releases."
read -r -p "    Continue? [y/N] " confirm
[[ "${confirm,,}" == "y" ]] || { echo "Aborted."; exit 0; }

if kubectl get namespace "${NS}" &>/dev/null; then
  for release in mysql-identity mysql-customer mysql-prediction mysql-loan-management; do
    helm uninstall "${release}" -n "${NS}" 2>/dev/null || true
  done
  kubectl delete namespace "${NS}" --ignore-not-found --wait=true --timeout=180s
  echo "==> Namespace ${NS} deleted"
else
  echo "    Namespace ${NS} not found — nothing to delete"
fi

echo "==> Teardown complete"
echo ""
echo "Fresh deploy:"
echo "  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
echo "  bash scripts/deploy-dev.sh dev"
