#!/usr/bin/env bash
# Phase 1 — Infrastructure: MySQL x4 (Helm) + Redis + RabbitMQ (Deployment)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/k3s-preflight.sh"
k3s_preflight
helm_setup

NS=smartlend
VALUES_DIR="${ROOT_DIR}/k8s/helm/values"
INFRA_DIR="${ROOT_DIR}/k8s/base/infra"

# --- Phase 1a: Pre-pull bitnami legacy MySQL images into k3s containerd ---
# Bitnami removed mysql from docker.io/bitnami (Aug 2025) → use bitnamilegacy
echo "==> Phase 1a: Pre-pull bitnamilegacy MySQL images"
MYSQL_IMG="bitnamilegacy/mysql:9.4.0-debian-12-r1"
SHELL_IMG="bitnamilegacy/os-shell:12-debian-12-r50"

if command -v docker &>/dev/null; then
  for img in "${MYSQL_IMG}" "${SHELL_IMG}"; do
    if sudo k3s ctr images ls -q 2>/dev/null | grep -qF "${img}"; then
      echo "    already in k3s: ${img}"
    else
      echo "    pulling: ${img}"
      docker pull "${img}"
      docker save "${img}" | sudo k3s ctr images import -
    fi
  done
else
  echo "WARN: docker not found — skipping image pre-pull (may cause ImagePullBackOff on first install)"
fi

# --- Phase 1b: Helm MySQL x4 ---
echo "==> Phase 1b: Helm MySQL x4"
helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
helm repo update bitnami

install_or_upgrade_mysql() {
  local release=$1 values=$2
  if helm status "${release}" -n "${NS}" &>/dev/null; then
    echo "    upgrade: ${release}"
    helm upgrade "${release}" bitnami/mysql -n "${NS}" -f "${values}"
  else
    echo "    install: ${release}"
    helm install  "${release}" bitnami/mysql -n "${NS}" -f "${values}"
  fi
}

install_or_upgrade_mysql mysql-identity       "${VALUES_DIR}/mysql-identity.yaml"
install_or_upgrade_mysql mysql-customer       "${VALUES_DIR}/mysql-customer.yaml"
install_or_upgrade_mysql mysql-prediction     "${VALUES_DIR}/mysql-prediction.yaml"
install_or_upgrade_mysql mysql-loan-management "${VALUES_DIR}/mysql-loan-management.yaml"

# Delete stale pods so they pick up new image spec after upgrade
echo "==> Restarting MySQL pods (pick up bitnamilegacy image if upgraded)"
for pod in mysql-identity-0 mysql-customer-0 mysql-prediction-0 mysql-loan-management-0; do
  kubectl -n "${NS}" delete pod "${pod}" --ignore-not-found --wait=false 2>/dev/null || true
done

# --- Phase 1c: Redis + RabbitMQ ---
echo "==> Phase 1c: Redis + RabbitMQ"
kubectl apply -f "${INFRA_DIR}/redis-pvc.yaml"
kubectl apply -f "${INFRA_DIR}/redis.yaml"
kubectl apply -f "${INFRA_DIR}/rabbitmq-pvc.yaml"
kubectl apply -f "${INFRA_DIR}/rabbitmq.yaml"

echo "==> Waiting for Redis..."
kubectl -n "${NS}" rollout status deployment/smart-lend-redis --timeout=120s

echo "==> Waiting for RabbitMQ (may take up to 5 min on first start)..."
kubectl -n "${NS}" rollout status deployment/smart-lend-rabbitmq --timeout=300s

echo ""
echo "==> MySQL pods (may still be initializing — check: kubectl -n ${NS} get pods -w):"
kubectl -n "${NS}" get pods -l app.kubernetes.io/name=mysql 2>/dev/null || true

echo "==> Phase 1 complete"
