#!/usr/bin/env bash
# Phase 1 verification — DNS + infra connectivity
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/k3s-preflight.sh
source "${ROOT_DIR}/scripts/k3s-preflight.sh"
k3s_setup_kubectl

NS=smartlend

echo "==> Pods in ${NS}:"
kubectl -n "${NS}" get pods

echo "==> DNS test (mysql-identity):"
kubectl -n "${NS}" run dns-test --rm -i --restart=Never --image=busybox:1.36 -- \
  nslookup mysql-identity.smartlend.svc.cluster.local

echo "==> DNS test (customerservice):"
kubectl -n "${NS}" run dns-test2 --rm -i --restart=Never --image=busybox:1.36 -- \
  nslookup customerservice.smartlend.svc.cluster.local

echo "==> Resource limits (MySQL should show 512Mi):"
kubectl -n "${NS}" get pods -l app.kubernetes.io/name=mysql -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].resources.limits.memory}{"\n"}{end}' 2>/dev/null || true

echo "==> Phase 1 verify complete"
