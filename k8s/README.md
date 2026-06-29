# SmartLend k3s — Dev Host 16GB

Triển khai SmartLend Platform trên single-node k3s.
Tham chiếu: [`docs/K3S_DEPLOYMENT_PLAN.md`](../docs/K3S_DEPLOYMENT_PLAN.md)

---

## Yêu cầu

- Ubuntu 22.04/24.04 / Debian 12, **16GB RAM**
- Docker, k3s, Helm 3

> **Helm chưa cài?** Script tự cài. Hoặc: `bash scripts/install-helm.sh`

---

## Cài k3s (một lần)

```bash
# Trên native Linux
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Trên WSL2 (fix cgroup)
bash scripts/k3s-install-wsl.sh
```

> Thêm vào `~/.bashrc`: `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml`

---

## Triển khai (deploy đầy đủ)

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
cd /mnt/c/Projects/smartlend/smartLend-platform

# Fix line endings (clone từ Windows)
sed -i 's/\r$//' scripts/*.sh && chmod +x scripts/*.sh

# 1. Tạo secrets.yaml (chỉ lần đầu)
cp k8s/base/secrets.example.yaml k8s/base/secrets.yaml
nano k8s/base/secrets.yaml   # đổi tất cả CHANGE_ME_*

# 2. Deploy đầy đủ (phase0 → phase1 → build → apps)
bash scripts/deploy-dev.sh dev
```

### Tuỳ chọn deploy từng bước

```bash
bash scripts/phase0-bootstrap.sh   # namespace + configmap + secrets
bash scripts/phase1-infra.sh        # MySQL Helm×4 + Redis + RabbitMQ
bash scripts/build-all-images.sh dev  # docker build → k3s ctr import
kubectl apply -k k8s/overlays/dev-host/  # apps + ingress

# hoặc apps-only (infra đã có):
bash scripts/deploy-dev.sh dev --apps-only
bash scripts/deploy-dev.sh dev --skip-build   # tái deploy không build lại

# Chỉ rebuild frontend:
docker build -f frontend/Dockerfile --build-arg VITE_API_GATEWAY_URL=http://api.smartlend.local \
  -t smartlend/frontend:dev frontend/
docker save smartlend/frontend:dev | sudo k3s ctr images import -
kubectl -n smartlend rollout restart deployment/frontend
```

---

## /etc/hosts (máy truy cập UI)

```
<WSL_IP hoặc VM_IP>  smartlend.local api.smartlend.local
```

---

## Xóa sạch & deploy lại

```bash
bash scripts/teardown-smartlend.sh  # xóa namespace + Helm + PVC (mất data)
bash scripts/deploy-dev.sh dev      # fresh deploy
```

---

## Cấu trúc

```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.example.yaml      # template → copy → secrets.yaml (gitignored)
│   ├── mysql-secrets.yaml        # auto-generated bởi phase0-bootstrap.sh (gitignored)
│   ├── infra/                    # Redis + RabbitMQ Deployment + PVC
│   └── apps/                     # 8 app Deployment + Service
├── overlays/dev-host/
│   ├── kustomization.yaml
│   └── ingress.yaml              # Traefik: smartlend.local / api.smartlend.local
└── helm/values/                  # mysql-*.yaml (bitnamilegacy/mysql)

frontend/                         # Vite UI (monorepo — build via scripts/build-all-images.sh)

scripts/
├── k3s-preflight.sh              # helpers: k3s_setup_kubectl, k3s_preflight, helm_setup
├── k3s-install-wsl.sh            # cài k3s trên WSL2 (cgroup fix)
├── install-helm.sh               # cài Helm 3
├── phase0-bootstrap.sh           # namespace + configmap + secrets + auto mysql-secrets
├── phase1-infra.sh               # MySQL (pre-pull bitnamilegacy → Helm) + Redis + RabbitMQ
├── phase1-verify.sh              # DNS test + pod status
├── build-all-images.sh           # docker build + k3s ctr import (frontend/ in monorepo)
├── deploy-dev.sh                 # orchestrator: phase0 → phase1 → build → kubectl apply -k
├── phase3-smoke.sh               # health check + OOM scan
├── teardown-smartlend.sh         # xóa namespace + Helm + PVC
└── k3s-diagnose.sh               # debug k3s startup failures
```

---

## Runbook — debug thường gặp

| Vấn đề | Lệnh / Giải pháp |
|---|---|
| Pod OOMKilled / RAM spike | `kubectl describe pod <name> -n smartlend` — Java heap capped `-Xmx512m`; tránh build Docker + full cluster cùng lúc trên 16GB |
| Pod CrashLoop / OOM | `kubectl describe pod <name> -n smartlend` → xem Events |
| Java app chưa Ready | Probe `initialDelay` lên đến 150s — đợi thêm; `kubectl logs deploy/<name> -n smartlend` |
| DNS không resolve | `kubectl run -it --rm debug --image=busybox -n smartlend -- nslookup customerservice` |
| UI reload liên tục | Vite chỉ build `index.html` → thiếu `login.html` trong image; rebuild frontend sau khi sửa `vite.config.js` |
| Gateway CrashLoop `predicates must not be empty` | **apigateway only** — rebuild sau khi sửa `application-k8s.properties` (full routes) |
| identityservice `Connection refused` RabbitMQ | Thiếu `spring.rabbitmq.*` trong profile k8s; ConfigMap có `RABBITMQ_*` nhưng identity đọc `SPRING_RABBITMQ_*` → đã sửa |
| Gateway 503 | `kubectl logs deploy/apigateway -n smartlend` — check URI `http://service:port` |
| ML không consume | `kubectl logs deploy/ml-model-service -n smartlend` |
| MySQL `ImagePullBackOff` | `phase1-infra.sh` tự pre-pull `bitnamilegacy/mysql` qua docker; chạy lại script |
| RabbitMQ chậm ready | Probe TCP 5672 với `failureThreshold:12` — đợi ~2 phút lần đầu |
| Image thiếu trong k3s | `sudo k3s ctr images ls \| grep smartlend` → chạy lại `build-all-images.sh` |
| RabbitMQ UI (debug) | `kubectl port-forward svc/smart-lend-rabbitmq 15672:15672 -n smartlend` |
| Rollback deployment | `kubectl rollout undo deploy/apigateway -n smartlend` |

---

## Lưu ý

- **Không commit** `k8s/base/secrets.yaml` và `k8s/base/mysql-secrets.yaml` (gitignored)
- `mysql-secrets.yaml` **tự sinh** bởi `phase0-bootstrap.sh` từ `secrets.yaml`
- Không deploy Eureka — Spring profile `k8s`, Gateway route qua CoreDNS
- MySQL Helm: `bitnamilegacy/mysql:9.4.0` — 256Mi request / 512Mi limit mỗi instance
- Java apps: K8s **768Mi limit** + **`JAVA_OPTS=-Xms256m -Xmx512m`** (Dockerfile + manifest)
- ml-model-service: **1536Mi limit** (1.5Gi)
- Java apps probe: readiness `90s` delay, liveness `150s` delay (WSL safe)
- Backup CronJob / NetworkPolicy: optional (phase tương lai)
