#!/usr/bin/env bash
# Install k3s on WSL2 — workaround for cgroup /proc/cgroups 7-field validation error
# Error: "Failed to start ContainerManager" err="system validation failed - wrong number of fields (expected 6, got 7)"
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> WSL2 k3s install (cgroup workaround)"

if ! grep -qi microsoft /proc/version 2>/dev/null; then
  echo "WARN: This does not look like WSL. Use standard install instead:"
  echo "  curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644"
  read -r -p "Continue anyway? [y/N] " ans
  [[ "${ans,,}" == "y" ]] || exit 0
fi

if [[ ! -f /etc/wsl.conf ]] || ! grep -q 'systemd=true' /etc/wsl.conf 2>/dev/null; then
  echo ""
  echo "==> Step 1: Enable systemd in /etc/wsl.conf"
  echo "    Add or merge:"
  cat <<'EOF'
[boot]
systemd=true

[wsl2]
memory=8GB
EOF
  echo ""
  echo "    Then from Windows PowerShell:  wsl --shutdown"
  echo "    Re-open WSL and re-run this script."
  echo ""
  if [[ ! -f /etc/wsl.conf ]]; then
    read -r -p "Create /etc/wsl.conf now? [y/N] " create
    if [[ "${create,,}" == "y" ]]; then
      sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
      echo "Created. Run 'wsl --shutdown' from Windows, then re-run this script."
      exit 0
    fi
  fi
fi

echo "==> Step 2: Stop/remove broken k3s if present"
sudo /usr/local/bin/k3s-killall.sh 2>/dev/null || true
sudo systemctl stop k3s 2>/dev/null || true

echo "==> Step 3: Install k3s with cgroupfs driver (WSL fix)"
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --write-kubeconfig-mode 644 --kubelet-arg=cgroup-driver=cgroupfs" sh -

echo "==> Step 4: Wait for k3s"
sleep 15

# shellcheck source=scripts/k3s-preflight.sh
source "${ROOT_DIR}/scripts/k3s-preflight.sh"
k3s_setup_kubectl

if kubectl get nodes; then
  echo ""
  echo "==> SUCCESS. Add to ~/.bashrc:"
  echo "    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
  echo "    alias kubectl='k3s kubectl'"
else
  echo ""
  echo "==> Still failing. Try k3d instead:"
  echo "    curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash"
  echo "    k3d cluster create smartlend"
  echo "    export KUBECONFIG=\$(k3d kubeconfig write smartlend)"
  journalctl -u k3s -n 20 --no-pager
  exit 1
fi
