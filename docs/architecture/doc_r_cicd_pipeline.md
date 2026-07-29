# Document R: CI/CD Pipeline

This document defines the automated build, test, container packaging, deployment, and rollback workflows driven by GitHub Actions.

---

## 1. Branching Strategy

The repository follows a GitFlow-inspired branching strategy to ensure stable production releases:

* **`main`:** Contains production-ready code. Commits trigger deployment to the production VPS.
* **`develop`:** Active development branch. Merges from feature branches compile here. Triggers staging builds.
* **`feature/*`:** Sandbox branches for developer tasks. Requires peer approval and passing integration tests before merging into `develop`.

---

## 2. GitHub Actions CI Pipeline (`ci.yml`)

The continuous integration runner executes automatically on every Pull Request targeting `develop` or `main`.

```yaml
name: Continuous Integration

on:
  pull_request:
    branches: [develop, main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Linters & Formatter Check
        run: pnpm run lint && pnpm run format:check

      - name: Run Database Migrations (Mock Test DB)
        run: pnpm --filter database migrate:deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run Unit Tests
        run: pnpm run test

      - name: Run Integration Tests
        run: pnpm run test:e2e
```

---

## 3. Continuous Deployment Workflow (`deploy.yml`)

Upon a merge to the `main` branch, the deployment pipeline executes the following steps:

```
[ Push to main ] ---> [ Trigger GitHub Actions ] ---> [ Build Docker Images ]
                             |
                             v
                  [ Push to GitHub Registry ]
                             |
                             v
                  [ SSH Connection to VPS ]
                             |
                             v
                  [ Execute deployment script ]
                    - Docker pull new images
                    - Prisma migration deploy
                    - Restart container group (Rolling upgrade)
```

### 3.1 VPS Deployment Script (`/scripts/deploy-vps.sh`)
```bash
#!/bin/bash
set -e

echo "Starting Deployment..."

# 1. Pull latest Docker images from GitHub Container Registry
docker compose -f /app/docker-compose.yml pull

# 2. Run database migrations before restarting containers
docker compose -f /app/docker-compose.yml run --rm api npx prisma migrate deploy

# 3. Perform a zero-downtime rolling restart of the API services
docker compose -f /app/docker-compose.yml up -d --no-deps --build api worker

# 4. Clean up old unused image layers
docker image prune -f

echo "Deployment Successful!"
```

---

## 4. Rollback Strategy

* **Version Control Pinning:**
  * Every Docker image is tagged with the unique GitHub commit SHA (`sha-<commit-sha>`) and the semantic release tag.
* **Immediate Rollback Trigger:**
  * If a deployment fails health checks, the administrator triggers the rollback workflow:
    `./scripts/deploy-vps.sh --rollback sha-82f3a61`
  * The script re-pins container targets to the previous verified SHA, pulls the image, and restarts the containers.
