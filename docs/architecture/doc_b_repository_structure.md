# Document B: Repository Structure

This document details the monorepo folder layout and the responsibilities of each directory within the TitanStream codebase.

---

## 1. Monorepo Directory Tree

TitanStream is organized as a monorepo to consolidate the React frontend, NestJS backend, shared TypeScript packages, and infrastructure configurations into a single version control repository.

```
/titanstream (Monorepo Root)
├── apps/
│   ├── web/                    # React/Vite/TailwindCSS Telegram Mini App
│   └── admin-dashboard/        # React Admin Panel
├── services/
│   ├── api/                    # NestJS API Server
│   └── worker/                 # NestJS BullMQ background queue worker
├── packages/
│   ├── database/               # Prisma schema and client exports
│   ├── shared-types/           # Common TypeScript interfaces & API schemas
│   └── security/               # Shared hashing and authentication helpers
├── libs/
│   └── blockchain/             # RPC abstraction clients for TON and BEP20
├── infrastructure/
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── worker.Dockerfile
│   │   ├── web.Dockerfile
│   │   └── docker-compose.yml
│   └── nginx/
│       └── nginx.conf          # Nginx routing and SSL config
├── scripts/
│   ├── database-seed.sh
│   └── deploy-vps.sh           # VPS CD automation script
├── tests/
│   └── integration/            # E2E integration test suites
├── docs/
│   └── architecture/           # System Architecture Blueprints
├── package.json                # Monorepo workspaces definition
├── turbo.json                  # Turborepo task runner config
└── tsconfig.json               # Global TypeScript compiler configuration
```

---

## 2. Directory Directory Breakdown

### 2.1 `/apps`
* **`web/`**: The client-side application. Compiled to static HTML/JS/CSS assets. Loaded as the Telegram WebApp frame.
* **`admin-dashboard/`**: The administrative interface. Restricted via Role-Based Access Control (RBAC).

### 2.2 `/services`
* **`api/`**: The public-facing entry point. Contains HTTP controllers, route guards, input validation pipes, and JWT signers.
* **`worker/`**: Background daemon. Runs cron triggers (daily resets), blockchain confirmations, and telegram broadcasting.

### 2.3 `/packages`
* **`database/`**: Wraps the Prisma Schema file (`schema.prisma`) and exports a unified database client module to prevent redundant connections across service containers.
* **`shared-types/`**: Holds API request/response structures, DTO validation models, and type definitions shared between client (`apps/web`) and server (`services/api`).
* **`security/`**: Standardizes SHA-256 HMAC validations, hashing functions, and crypto wrappers.

### 2.4 `/libs`
* **`blockchain/`**: Abstraction client libraries wrapping TON Center API or BSC JSON-RPC nodes. Defines standard interfaces for address verification and transaction broadcasting.

### 2.5 `/infrastructure`
* Holds configuration assets for deployment environments. Includes Nginx reverse proxy routing rules, container Dockerfiles, SSL certifications, and Docker Compose configurations for local development orchestration.

### 2.6 `/scripts`
* Developer and deployment utility scripts, including database seeding runners, schema migration pipelines, and basic remote VPS shell scripts.

### 2.7 `/tests`
* Monorepo-level End-to-End integration test suits validating flows (Auth -> Mining -> Queue -> Withdrawal) across separate containers.

---

## 3. Monorepo Configuration Strategy

The monorepo uses `pnpm` workspaces (or npm workspaces) for dependency sharing, managed by **Turborepo** for build caching and dependency compilation.

* **Workspace Routing:**
  * Packages inside `/packages` are linked as dependencies inside `/apps` and `/services` using standard local version mapping (e.g. `"@titanstream/database": "workspace:*"`).
* **Shared Configurations:**
  * Base `tsconfig.json`, Prettier, and ESLint configurations are defined at the root directory. Subprojects extend these base settings to ensure clean, consistent linting and compilation constraints.
