#!/usr/bin/env bash
# Build all SmartLend Docker images and import into k3s containerd
set -euo pipefail

TAG="${1:-dev}"
REGISTRY="smartlend"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMPORT="${IMPORT_TO_K3S:-true}"
VITE_API_URL="${VITE_API_GATEWAY_URL:-http://api.smartlend.local}"

build_image() {
  local name=$1 dockerfile=$2 context=$3
  shift 3
  local image="${REGISTRY}/${name}:${TAG}"
  echo "==> Build ${image}"
  docker build "$@" -f "${dockerfile}" -t "${image}" "${context}"
  if [[ "${IMPORT}" == "true" ]]; then
    if command -v k3s &>/dev/null; then
      echo "    import → k3s"
      docker save "${image}" | sudo k3s ctr images import -
    else
      echo "WARN: k3s not found — skipping ctr import for ${image}"
    fi
  fi
}

cd "${ROOT_DIR}"

build_image apigateway            apigateway/Dockerfile              .
build_image identityservice       identityservice/Dockerfile          .
build_image customerservice       customerservice/Dockerfile          .
build_image predictionservice     predictionservice/Dockerfile        .
build_image loanmanagementservice loanmanagementservice/Dockerfile    .
build_image currencyservice       currencyservice/Dockerfile          .
build_image ml-model-service      ml-model/Dockerfile                 ml-model/
build_image frontend              frontend/Dockerfile                 frontend/ \
  --build-arg "VITE_API_GATEWAY_URL=${VITE_API_URL}"

echo ""
echo "==> Done. Images tagged :${TAG}"
if command -v k3s &>/dev/null; then
  sudo k3s ctr images ls 2>/dev/null | grep smartlend || true
fi
