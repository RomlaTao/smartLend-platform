#!/usr/bin/env bash
# Shared k3s/kubectl helpers — source from other scripts:
#   source "$(dirname "${BASH_SOURCE[0]}")/k3s-preflight.sh"
#   k3s_setup_kubectl
#   k3s_preflight

k3s_setup_kubectl() {
  local k3s_kubeconfig="/etc/rancher/k3s/k3s.yaml"

  if [[ -z "${KUBECONFIG:-}" && -f "${k3s_kubeconfig}" ]]; then
    export KUBECONFIG="${k3s_kubeconfig}"
    echo "==> KUBECONFIG=${KUBECONFIG}"
  fi

  if command -v kubectl &>/dev/null; then
    return 0
  fi

  if command -v k3s &>/dev/null; then
    kubectl() { k3s kubectl "$@"; }
    echo "==> kubectl not in PATH — using: k3s kubectl"
    return 0
  fi

  echo "ERROR: neither kubectl nor k3s found in PATH."
  echo "  Install k3s: curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644"
  echo "  Or symlink:   sudo ln -sf /usr/local/bin/k3s /usr/local/bin/kubectl"
  return 1
}

k3s_preflight() {
  k3s_setup_kubectl || return 1

  if command -v systemctl &>/dev/null; then
    if systemctl list-unit-files k3s.service &>/dev/null 2>&1; then
      if ! systemctl is-active --quiet k3s; then
        echo "ERROR: k3s service is not running."
        echo "  sudo systemctl start k3s"
        echo "  sudo systemctl status k3s"
        return 1
      fi
      echo "==> k3s service: running"
    fi
  fi

  if ! kubectl cluster-info &>/dev/null; then
    echo "ERROR: Cannot connect to Kubernetes API."
    echo ""
    echo "  kubectl is trying: $(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || echo 'unknown')"
    echo ""
    echo "  Fix (pick one):"
    echo ""
    echo "  A) k3s chưa cài — cài và bật:"
    echo "     curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644"
    echo "     export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
    echo ""
    echo "  B) k3s đã cài nhưng kubectl trỏ sai kubeconfig:"
    echo "     export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
    echo "     k3s kubectl get nodes"
    echo ""
    echo "  C) k3s đã cài nhưng service tắt:"
    echo "     sudo systemctl start k3s"
    echo "     sudo systemctl enable k3s"
    echo ""
    echo "  D) Permission denied on k3s.yaml:"
    echo "     sudo chmod 644 /etc/rancher/k3s/k3s.yaml"
    return 1
  fi

  echo "==> Cluster OK: $(kubectl config current-context 2>/dev/null || echo default)"
  kubectl get nodes --no-headers 2>/dev/null | head -1 || true
  return 0
}

helm_setup() {
  if command -v helm &>/dev/null; then
    echo "==> helm $(helm version --short 2>/dev/null || helm version)"
    return 0
  fi

  if [[ "${SKIP_HELM_INSTALL:-false}" == "true" ]]; then
    echo "ERROR: helm not found. Install manually:"
    echo "  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
    return 1
  fi

  echo "==> helm not found — installing Helm 3..."
  if ! curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash; then
    echo "ERROR: Helm install failed."
    echo "  Manual: curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
    return 1
  fi

  if ! command -v helm &>/dev/null; then
    echo "ERROR: helm still not in PATH after install. Try: hash -r && helm version"
    return 1
  fi

  echo "==> helm $(helm version --short 2>/dev/null || helm version)"
  return 0
}
