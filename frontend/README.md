# SmartLend Frontend

Vite + vanilla JS + Tailwind. Multi-page HTML (`src/pages/**`). Production: nginx (Docker / k8s).

## Development (hot reload)

```bash
npm ci
VITE_API_GATEWAY_URL=http://localhost:8080 npm run dev
```

Open http://localhost:5173 — Gateway CORS default: `http://localhost:5173`.

## Docker Compose (nginx)

Built with API URL baked at build time:

```bash
# From repo root
docker compose up -d --build frontend apigateway
```

UI: http://localhost:8081 — API: http://localhost:8080

## k3s

```bash
# From repo root
bash scripts/build-all-images.sh dev
```

Build arg: `VITE_API_GATEWAY_URL=http://api.smartlend.local` (default in script).

UI: http://smartlend.local — API: http://api.smartlend.local

## Build locally

```bash
npm ci
npm run build   # output: dist/ (all HTML pages — see vite.config.js)
```
