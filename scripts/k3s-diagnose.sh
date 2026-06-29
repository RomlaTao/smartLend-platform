#!/usr/bin/env bash
# Diagnose k3s startup failures — run on Linux dev host
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/k3s-preflight.sh
source "${ROOT_DIR}/scripts/k3s-preflight.sh"
k3s_setup_kubectl 2>/dev/null || true

echo "========== k3s diagnose =========="
echo ""

echo "==> 1. Service status"
systemctl status k3s --no-pager -l 2>/dev/null || echo "WARN: cannot read k3s.service"
echo ""

echo "==> 2. Last 80 log lines (journalctl)"
journalctl -u k3s -n 80 --no-pager 2>/dev/null | tee /tmp/k3s-journal-snippet || echo "WARN: journalctl unavailable"
if grep -q 'wrong number of fields' /tmp/k3s-journal-snippet 2>/dev/null; then
  echo ""
  echo "    *** DETECTED: WSL cgroup error (expected 6, got 7) ***"
  echo "    Fix: bash scripts/k3s-install-wsl.sh"
fi
echo ""

echo "==> 3. Environment"
echo "    OS: $(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '\"' || uname -a)"
echo "    Kernel: $(uname -r)"
if grep -qi microsoft /proc/version 2>/dev/null; then
  echo "    ** WSL detected ** — k3s needs systemd + cgroupfs (see k8s/README.md)"
  if grep -q 'wrong number of fields' /tmp/k3s-journal-snippet 2>/dev/null; then
    echo "    Fix: bash scripts/k3s-install-wsl.sh"
  fi
fi
echo "    systemd: $(command -v systemctl >/dev/null && echo yes || echo no)"
echo ""

echo "==> 4. Port conflicts (6443 = Kubernetes API)"
if command -v ss &>/dev/null; then
  ss -tlnp | grep -E ':6443|:10250|:8472' || echo "    (no listener on 6443/10250/8472)"
elif command -v netstat &>/dev/null; then
  netstat -tlnp 2>/dev/null | grep -E ':6443|:10250' || true
else
  echo "    (install iproute2 for ss)"
fi
echo ""

echo "==> 5. Other Kubernetes / container runtime"
for svc in docker containerd kubelet microk8s; do
  if systemctl is-active --quiet "${svc}" 2>/dev/null; then
    echo "    ACTIVE: ${svc}"
  fi
done
command -v kubectl &>/dev/null && kubectl config current-context 2>/dev/null || \
  (command -v k3s &>/dev/null && echo "k3s kubectl (wrapper)") || true
echo ""

echo "==> 6. Kernel modules"
for mod in br_netfilter overlay; do
  if lsmod | grep -q "^${mod}"; then
    echo "    loaded: ${mod}"
  else
    echo "    MISSING: ${mod}  →  sudo modprobe ${mod}"
  fi
done
echo ""

echo "==> 7. k3s binary"
/usr/local/bin/k3s --version 2>/dev/null || echo "    k3s binary not found"
echo ""

echo "========== Common fixes =========="
cat <<'EOF'

A) Port 6443 already in use (kind, minikube, old k3s):
   sudo ss -tlnp | grep 6443
   # Stop conflicting service, or: sudo /usr/local/bin/k3s-killall.sh && sudo systemctl start k3s

B) WSL2 cgroup error (expected 6, got 7):
   bash scripts/k3s-install-wsl.sh
   # or: INSTALL_K3S_EXEC="server --write-kubeconfig-mode 644 --kubelet-arg=cgroup-driver=cgroupfs"

C) WSL2 — enable systemd in /etc/wsl.conf then wsl --shutdown (from Windows):
   [boot]
   systemd=true
   [wsl2]
   memory=8GB

D) Docker + k3s conflict — reset k3s:
   sudo /usr/local/bin/k3s-killall.sh
   sudo /usr/local/bin/k3s-uninstall.sh   # only if reinstall OK
   curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

E) iptables/nftables (Debian/Ubuntu):
   sudo update-alternatives --set iptables /usr/sbin/iptables-legacy 2>/dev/null || true
   sudo systemctl restart k3s

F) Inspect exact error:
   journalctl -u k3s -n 50 --no-pager | tail -20

EOF
