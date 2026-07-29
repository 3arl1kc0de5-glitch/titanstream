# RAILWAY DEPLOYMENT GUIDE — TitanStream NestJS Backend API

This guide provides step-by-step instructions for deploying the TitanStream NestJS backend API (`services/api/`) on **Railway**.

---

## Deployment Architecture

```
GitHub Repository (main branch)
  ↓
Railway Automatic Trigger
  ↓
Docker Build (services/api/Dockerfile) — monorepo root context
  ↓
pnpm install --frozen-lockfile (using root pnpm-lock.yaml)
  ↓
Prisma Client Generate + NestJS Build (pnpm --filter @titanstream/api build)
  ↓
Production image — multi-stage (dev deps stripped)
  ↓
Prisma Migration Sweep (npx prisma migrate deploy)
  ↓
NestJS API Production Server (node dist/main)
  ↓
Connection to Railway PostgreSQL Database
  ↓
Health Probe Check (/api/v1/health/liveness) -> Status UP
```

---

## Step-by-Step Deployment Instructions

### Step 1: Create Railway Project
1. Log in to [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select the `titanstream` repository.

### Step 2: Configure Service
Railway will auto-detect the `railway.json` at the monorepo root.

**No root directory override needed** — the root-level `railway.json` configures:
- **Dockerfile path**: `services/api/Dockerfile`
- **Build context**: monorepo root (lockfile and workspace config accessible)
- **Start command**: `npx prisma migrate deploy && node services/api/dist/main`
- **Health check**: `/api/v1/health/liveness`

### Step 3: Attach Railway PostgreSQL Database
1. Click **+ New** in your Railway canvas -> **Database** -> **Add PostgreSQL**.
2. Railway will automatically generate `DATABASE_URL`.
3. Ensure `DATABASE_URL` is referenced in service environment variables.

### Step 4: Configure Production Environment Variables
Set the following environment variables in Railway Service -> **Variables**:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=${Postgres.DATABASE_URL}?schema=public&sslmode=require
JWT_SECRET=<YOUR_HIGH_ENTROPY_64_CHAR_SECRET>
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=<YOUR_TELEGRAM_BOT_TOKEN>
TELEGRAM_BOT_USERNAME=titanstream_bot
CRYPTOBOT_API_TOKEN=<YOUR_CRYPTOBOT_TOKEN>
CRYPTOBOT_NETWORK=mainnet
FRONTEND_URL=https://titanstream.netlify.app
API_URL=https://titanstream-api.up.railway.app
MIN_DEPOSIT_USDT=1.0
MAX_DEPOSIT_USDT=10000.0
MIN_WITHDRAWAL_USDT=5.0
MAX_WITHDRAWAL_USDT=5000.0
AUTO_APPROVE_WITHDRAWAL_LIMIT_USDT=100.0
```

### Step 5: Verify Deployment & Health Check
Once deployed, Railway will generate a public HTTPS URL (e.g. `https://titanstream-api.up.railway.app`).

Test API Health:
```bash
curl -i https://titanstream-api.up.railway.app/api/v1/health/liveness
```

Expected Output:
```json
{
  "status": "UP",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "service": "titanstream-api"
}
```

Test Database Health:
```bash
curl -i https://titanstream-api.up.railway.app/api/v1/health
```

---

## Frontend Deployment (Separate — Netlify)

The Telegram Mini App frontend is deployed independently via Netlify:

```bash
cd apps/web
pnpm build    # outputs to apps/web/dist/
```

Netlify config: `netlify.toml` at monorepo root (base: `apps/web`).

---

## Monorepo Architecture Notes

Railway deploys **only** the API service (`services/api/`) via Docker.
The frontend (`apps/web/`) is excluded from the Docker build context via `.dockerignore` and deploys separately to Netlify.

| Component | Platform | Root Directory | Build Method |
|---|---|---|---|
| Backend API | Railway | Monorepo root | Docker (DOCKERFILE) |
| Frontend TMA | Netlify | `apps/web` | Vite build |

---

## Summary of Deployment Assets

- `railway.json` — Railway orchestration manifest (root level)
- `services/api/Dockerfile` — Multi-stage Docker build file
- `.dockerignore` — Docker context filter (excludes frontend, docs, etc.)
- `services/api/.env.production.example` — Production variable template
- `DATABASE_DEPLOYMENT.md` — Database migration & safety guide
