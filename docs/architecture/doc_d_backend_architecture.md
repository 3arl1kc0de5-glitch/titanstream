# Document D: Backend Architecture

This document defines the backend server structure, validation pipelines, job processor design, and security guards for the NestJS services.

---

## 1. Modular Architecture

The NestJS backend is divided into domain-specific modules, each containing its own controllers, services, repositories, and DTOs.

```
/services/api/src
├── app.module.ts               # Core imports (Config, Database, Redis, Throttler)
├── common/                     # Global filters, interceptors, guards, decorators
│   ├── filters/                # HttpExceptionFilter, PrismaClientExceptionFilter
│   ├── interceptors/           # LoggingInterceptor, TransformInterceptor
│   └── guards/                 # TelegramAuthGuard, RolesGuard
└── modules/
    ├── auth/                   # Telegram initData check and JWT signing
    ├── user/                   # User profile sync and stats
    ├── mining/                 # Speed calculation, cooler taps decay logic
    ├── wallet/                 # Ledger updates, blockchain transfers
    ├── quest/                  # Task definitions, verification routines
    ├── game/                   # Mini-game sessions and cheat check
    └── admin/                  # Dashboard control, settings, RBAC
```

---

## 2. Request Lifecycle Pipeline

Every HTTP request traverses the following layers sequentially:

```
Request ---> Middleware (InitData check) ---> Guard (JWT verification / RBAC)
            ---> Interceptors (Logging / Caching) ---> ValidationPipe (DTO check)
            ---> Controller ---> Service ---> DB (Prisma)
            ---> Response (TransformInterceptor) ---> JSON Payload
```

### 2.1 Middleware & Guards
* **`TelegramAuthMiddleware`:** Intercepts standard auth entry endpoints. Validates the signature of the `initData` payload using the bot token hash.
* **`JwtAuthGuard`:** Validates JWT access tokens in the `Authorization: Bearer <token>` header for subsequent REST endpoints.
* **`RolesGuard`:** Enforces Role-Based Access Control (RBAC) on administrative endpoints (e.g. `@Roles(Role.ADMIN)`).

### 2.2 Validation & Transformation
* **`ValidationPipe`:** Enforces typing constraints using `class-validator` and `class-transformer`. Rejects requests containing un-whitelisted properties or malformed variables (HTTP 400).
* **`TransformInterceptor`:** Standardizes API outputs, wrapping objects in a standard envelope: `{ success: true, data: ... }`.

### 2.3 Exception Filters
* **`HttpExceptionFilter`:** Catches all NestJS HTTP exceptions, logging the stack traces as structured JSON, and returning structured error bodies:
  `{ success: false, error: { message: "...", statusCode: 400 } }`.
* **`PrismaClientExceptionFilter`:** Intercepts database constraint errors (e.g. unique field violations) and transforms them into standard HTTP exceptions (e.g. HTTP 409 Conflict).

---

## 3. Background Job Queues (BullMQ & Redis)

For tasks that are slow, require retries, or must execute outside the HTTP request lifecycle, the backend delegates work to **BullMQ** queues hosted in Redis.

* **Queues:**
  * `withdrawal-queue`: Processes outbound blockchain token transactions.
  * `quest-verification-queue`: Interacts with Telegram API to check user subscriptions or story posts.
  * `notification-queue`: Sends announcements and alerts.
* **Concurrency & Workers:**
  * Worker services run inside dedicated docker containers.
  * Workers execute jobs with automatic retry backoff profiles (e.g. exponential backoff, maximum 5 retries).

---

## 4. Rate Limiting & Caching

### 4.1 Throttler Module
* Enforces HTTP rate limits using `nestjs-throttler` backed by the Redis store.
* **Standard limits:** Maximum `60` requests per minute for standard REST routes.
* **Mining taps limits:** Tapping the cooler endpoints allows up to `300` requests per minute.

### 4.2 Caching Strategy
* Controller endpoints use `CacheInterceptor` backed by the Redis cache provider.
* **Rules:** Only `GET` requests are cached. Cache is manually invalidated on database mutation (`POST`, `PATCH`, `DELETE`).
