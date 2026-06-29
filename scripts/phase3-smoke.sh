#!/usr/bin/env bash
# Phase 3 — smoke tests (run after full deploy)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/k3s-preflight.sh
source "${ROOT_DIR}/scripts/k3s-preflight.sh"
k3s_setup_kubectl

NS=smartlend
API="${API_URL:-http://api.smartlend.local}"

echo "==> 1. Gateway health"
curl -sf "${API}/actuator/health" | head -c 200
echo ""

echo "==> 2. Pod status (no OOMKilled)"
kubectl -n "${NS}" get pods
OOM=$(kubectl -n "${NS}" get pods -o jsonpath='{range .items[*]}{.status.containerStatuses[*].lastState.terminated.reason}{"\n"}{end}' | grep -c OOMKilled || true)
if [[ "${OOM}" -gt 0 ]]; then
  echo "FAIL: OOMKilled detected"
  exit 1
fi

echo "==> 3. Resource usage (requires metrics-server)"
kubectl top pods -n "${NS}" 2>/dev/null || echo "WARN: metrics-server not installed"

echo "==> Phase 3 smoke checks done — run manual E2E (login, prediction) via UI at http://smartlend.local"
