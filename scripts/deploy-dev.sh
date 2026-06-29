#!/usr/bin/env bash
# Deploy SmartLend to k3s dev host (Phase 0 → 1 → build → 2)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NS=smartlend
TAG="dev"
SKIP_BUILD=false
APPS_ONLY=false
INFRA_ONLY=false

usage() {
  cat <<EOF
Usage: $0 [image-tag] [options]

  --skip-build    Skip docker build + ctr import (images already in k3s)
  --apps-only     Deploy app workloads only (skip Phase 0 + 1 infra)
  --infra-only    Run Phase 0 + 1 only (stop before app deploy)

Examples:
  $0 dev                        # full deploy from scratch
  $0 dev --skip-build           # skip rebuild, re-deploy manifests
  $0 dev --apps-only            # only update app Deployments
EOF
}

source "${ROOT_DIR}/scripts/k3s-preflight.sh"
k3s_setup_kubectl

for arg in "$@"; do
  case "${arg}" in
    --skip-build)  SKIP_BUILD=true ;;
    --apps-only)   APPS_ONLY=true ;;
    --infra-only)  INFRA_ONLY=true ;;
    -h|--help)     usage; exit 0 ;;
    --*)           echo "Unknown: ${arg}"; usage; exit 1 ;;
    *)             TAG="${arg}" ;;
  esac
done

rollout_wait() {
  local name=$1 timeout=${2:-240s}
  echo "    waiting: ${name}"
  kubectl -n "${NS}" rollout status "deployment/${name}" --timeout="${timeout}" || \
    echo "WARN: ${name} not ready yet — check: kubectl -n ${NS} describe pod -l app=${name}"
}

# Phase 0 + 1 (infra)
if [[ "${APPS_ONLY}" != "true" ]]; then
  bash "${ROOT_DIR}/scripts/phase0-bootstrap.sh"
  bash "${ROOT_DIR}/scripts/phase1-infra.sh"
fi

[[ "${INFRA_ONLY}" == "true" ]] && { echo "==> Infra-only — done"; exit 0; }

# Build images
if [[ "${SKIP_BUILD}" != "true" ]]; then
  bash "${ROOT_DIR}/scripts/build-all-images.sh" "${TAG}"
fi

# Deploy app workloads + Ingress
echo "==> Phase 2: Apply app manifests"
kubectl apply -k "${ROOT_DIR}/k8s/overlays/dev-host/"

echo "==> Rollout status (infra → dependencies → apps):"
for svc in currencyservice identityservice customerservice \
           predictionservice loanmanagementservice ml-model-service apigateway frontend; do
  rollout_wait "${svc}"
done

echo ""
kubectl -n "${NS}" get pods -o wide

echo ""
NODE_IP="$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo '<DEV_HOST_IP>')"
echo "==> /etc/hosts: ${NODE_IP}  smartlend.local api.smartlend.local"
echo "==> UI:         http://smartlend.local"
echo "==> API health: curl http://api.smartlend.local/actuator/health"
