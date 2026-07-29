# Document V: Engineering Execution Plan — Authentication & Onboarding System

> **Status:** Implementation-Ready Specification
> **Target:** Backend Engineering Team
> **Pre-requisite Docs:** Document U (Architecture) + Document U-R (Review)
> **KYC Decision:** REMOVED — No KYC. Withdrawal caps + hardened fraud detection instead.

---

## Table of Contents

1. [System Implementation Breakdown](#1-system-implementation-breakdown)
2. [Database Implementation Plan](#2-database-implementation-plan)
3. [API Specification](#3-api-specification)
4. [Event Architecture](#4-event-architecture)
5. [User State Engine Implementation](#5-user-state-engine-implementation)
6. [Telegram Bot Implementation Flow](#6-telegram-bot-implementation-flow)
7. [Security Implementation Checklist](#7-security-implementation-checklist)
8. [Testing Strategy](#8-testing-strategy)
9. [Development Order](#9-development-order)
10. [Engineering Tickets](#10-engineering-tickets)

---

## 1. System Implementation Breakdown

### Module 1: Telegram Auth Verification Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Verify Telegram Mini App initData cryptographically. Single responsibility: accept raw initData string, return verified user payload or reject. |
| **Responsibilities** | (1) HMAC-SHA256 signature verification using bot token. (2) auth_date replay check (5 min tolerance). (3) Nonce deduplication via Redis. (4) Parse verified payload into structured UserPayload. (5) Rate limit: 10 req/min per IP. |
| **Dependencies** | Bot token (from secrets manager), Redis (nonce store), NestJS ConfigModule |
| **Inputs** | `rawInitData: string` — the full initData query string from Telegram |
| **Outputs** | `VerifiedUserPayload { telegramId, firstName, lastName, username, languageCode, isPremium, authDate, startParam, photoUrl }` OR `AuthError { code, message }` |
| **Database tables** | None (stateless verification) |
| **APIs** | No public API. Called internally by Auth Controller. |
| **Events** | Emits: `auth.initdata_verified`, `auth.initdata_failed` |
| **Security requirements** | (1) Max initData size 4096 bytes. (2) 500ms timeout on HMAC computation. (3) Rate limit 10 req/min/IP. (4) Nonce TTL 5min in Redis. (5) Never log raw initData. (6) Bot token from secrets manager, never env vars. |

---

### Module 2: Session & JWT Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Issue, validate, refresh, and revoke JWT sessions. Manages dual-token lifecycle. |
| **Responsibilities** | (1) Generate access token (JWT RS256, 5min TTL). (2) Generate refresh token (opaque 128-bit hex, 30d TTL). (3) Validate access tokens on every request. (4) Refresh token rotation with theft detection grace period. (5) Revoke sessions on logout or security event. (6) Fingerprint binding (user-agent + IP prefix hash). (7) Max 5 concurrent sessions per user. |
| **Dependencies** | Redis (session cache, TTL 5min), PostgreSQL (sessions table), crypto (Node.js) |
| **Inputs** | For creation: `{ userId, fingerprint, ipAddress, userAgent }`. For validation: `{ accessToken }`. For refresh: `{ refreshToken }`. |
| **Outputs** | Access token, refresh token, session data, or error |
| **Database tables** | `sessions` |
| **APIs** | Internal: `createSession`, `validateAccessToken`, `refreshSession`, `revokeSession`, `revokeAllUserSessions` |
| **Events** | Emits: `session.created`, `session.refreshed`, `session.revoked`, `session.theft_detected` |
| **Security requirements** | (1) RS256 key pair in secrets manager. (2) Access token NEVER persisted (memory only client-side). (3) Refresh token stored as SHA-256 hash in DB. (4) HTTP-Only Secure SameSite=Strict cookie for refresh. (5) Grace period: mark `suspected_compromised` on reuse, notify user. (6) Rate limit refresh: 3 req/min per user. |

---

### Module 3: User Profile Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create, read, update user profiles. Sync Telegram profile data on each auth. Manage user state transitions. |
| **Responsibilities** | (1) Upsert user on auth (create if new, update Telegram fields if existing). (2) Manage user state machine transitions. (3) Enforce state-based action restrictions. (4) Track login history (`last_login_at`, `login_count`). (5) Handle soft delete and anonymization. (6) Manage referral binding (referrer_id from start_param). |
| **Dependencies** | PostgreSQL (users table), Redis (user cache), Telegram Auth Service |
| **Inputs** | Telegram user data, state transition commands, profile update data |
| **Outputs** | User profile, user state, user ID |
| **Database tables** | `users` |
| **APIs** | Public: `GET /v1/users/me`, `PATCH /v1/users/me`, `DELETE /v1/users/me`. Internal: `getUserById`, `createUser`, `updateUser`, `transitionUserState`, `getUserByTelegramId` |
| **Events** | Emits: `user.created`, `user.updated`, `user.state_changed`, `user.deleted`, `user.deletion_cancelled` |
| **Security requirements** | (1) Never expose internal Telegram ID in non-auth responses. (2) Rate limit PATCH: 10 req/min. (3) Validate state transitions server-side — never trust client. (4) Soft delete only — never hard delete. (5) 30-day grace period for deletion. |

---

### Module 4: Telegram Account Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Manage Telegram-specific account data separate from user profile. Handle Telegram-specific constraints (bot blocked, premium status). |
| **Responsibilities** | (1) Create/update Telegram account record on auth. (2) Track `blocked_bot` status. (3) Store `photo_url`, `is_premium`, `allows_write_to_pm`. (4) Provide chatbot messaging eligibility check. |
| **Dependencies** | PostgreSQL (telegram_accounts table) |
| **Inputs** | Telegram user data from verified initData |
| **Outputs** | Telegram account record |
| **Database tables** | `telegram_accounts` |
| **APIs** | Internal: `upsertTelegramAccount`, `getTelegramAccount`, `markBotBlocked`, `markBotUnblocked` |
| **Events** | Emits: `telegram_account.updated`, `telegram_account.bot_blocked` |
| **Security requirements** | (1) `blocked_bot` flag must be cached (Redis) to avoid DB lookup on every notification attempt. |

---

### Module 5: Onboarding State Engine

| Aspect | Detail |
|--------|--------|
| **Purpose** | Drive user through the onboarding flow. Maintain progress, enforce step ordering, handle resume/stall. |
| **Responsibilities** | (1) Initialize onboarding progress on user creation. (2) Advance step only if previous step is complete (server-side validation). (3) Handle resume: return current step for returning users. (4) Track stalled users (24h inactivity). (5) Provide progress % for UI display. (6) Enforce phase ordering: welcome -> education -> consent -> ready. |
| **Dependencies** | PostgreSQL (onboarding_progress, users), Education Service, Consent Service |
| **Inputs** | `{ userId, stepId, metadata }` for step advancement. `{ userId }` for state query. |
| **Outputs** | Current onboarding state, progress %, allowed next steps |
| **Database tables** | `onboarding_progress`, `users` (state field) |
| **APIs** | Public: `GET /v1/onboarding/state`, `POST /v1/onboarding/step`. Internal: `initializeOnboarding`, `advanceStep`, `getCurrentStep`, `markStalled`, `resumeOnboarding` |
| **Events** | Emits: `onboarding.started`, `onboarding.step_completed`, `onboarding.completed`, `onboarding.stalled`, `onboarding.resumed` |
| **Security requirements** | (1) Never trust client-reported step completion — validate server-side. (2) Canonical `completed_steps` list server-side only. (3) Rate limit step advancement: 10 req/min (prevents rapid-fire step skipping attempts). |

---

### Module 6: Education Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Deliver education modules, track progress, run quiz engine, compute comprehension score. |
| **Responsibilities** | (1) Serve module catalog (from DB seed data, cached in Redis). (2) Track per-module progress (current slide, completion status). (3) Quiz engine: validate answers, compute score, enforce retry limits. (4) Enforce module prerequisites (must complete module N-1 before N). (5) Compute education score from completion + quiz performance. (6) Module versioning — detect outdated completions. |
| **Dependencies** | PostgreSQL (education_modules, education_completions), Redis (content cache, progress cache) |
| **Inputs** | Module ID, slide index, quiz answers, user ID |
| **Outputs** | Module content, progress status, quiz result, education score |
| **Database tables** | `education_modules`, `education_completions` |
| **APIs** | Public: `GET /v1/education/modules`, `GET /v1/education/modules/:id`, `POST /v1/education/progress`, `POST /v1/education/quiz/answer`, `POST /v1/education/quiz/complete`, `GET /v1/education/score` |
| **Events** | Emits: `education.module_started`, `education.module_completed`, `education.quiz_attempt`, `education.quiz_completed`, `education.all_modules_completed` |
| **Security requirements** | (1) Validate answer sequence server-side (reject out-of-order). (2) Enforce minimum time per question (5s). (3) Max 3 quiz attempts, lock after. (4) Reject submissions with same answer pattern across attempts (guessing detection). |

---

### Module 7: Consent Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Record individual user consents with full audit trail. Track version changes and expiry. |
| **Responsibilities** | (1) Record consent with type, version, document hash, IP, user agent, session ID. (2) Track which consents are pending for a user. (3) Detect consent expiry and notify users. (4) Manage ToS version changes — prompt re-consent when version increments. (5) Provide consent status for onboarding state engine. |
| **Dependencies** | PostgreSQL (user_consents), Redis (consent cache) |
| **Inputs** | `{ userId, consentType, version, documentHash, documentUrl, granted, ipAddress, userAgent, sessionId }` |
| **Outputs** | Consent record, pending consent list, consent status |
| **Database tables** | `user_consents` |
| **APIs** | Public: `GET /v1/consent/pending`, `GET /v1/consent/status`, `POST /v1/consent/:type`, `GET /v1/consent/:type/history` |
| **Events** | Emits: `consent.recorded`, `consent.all_required_completed`, `consent.expired`, `consent.version_changed` |
| **Security requirements** | (1) Unique constraint `(user_id, consent_type, version)` prevents duplicates. (2) IP + user agent + session ID captured for every consent. (3) Document SHA-256 hash stored to prove what user agreed to. (4) Consent expiry job runs daily. (5) Never allow bulk consent — each type recorded individually. |

---

### Module 8: Audit Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Immutable append-only log of all significant system events. 7-year retention with monthly partitioning. |
| **Responsibilities** | (1) Write audit events asynchronously via BullMQ. (2) Classify events by severity (INFO, WARNING, CRITICAL). (3) Support correlation IDs for tracing multi-event flows. (4) CRITICAL events trigger immediate alert. (5) Monthly partition management for retention. (6) Provide query API for admin investigation. |
| **Dependencies** | BullMQ (audit queue), PostgreSQL (audit_events), Alerting system (PagerDuty/OpsGenie for CRITICAL) |
| **Inputs** | `{ userId?, eventType, severity, data, ipAddress?, sessionId?, correlationId? }` |
| **Outputs** | Acknowledged async write |
| **Database tables** | `audit_events` |
| **APIs** | Internal: `writeAuditEvent`. Admin: `GET /v1/admin/audit`, `GET /v1/admin/audit/:id` |
| **Events** | None (it is the event consumer). Consumes events from all modules and writes to DB. |
| **Security requirements** | (1) Append-only — no UPDATE or DELETE allowed (DB trigger enforcement). (2) Monthly partitioned by `created_at`. (3) 7-year retention with automated purge. (4) Daily hash chain for tamper detection. (5) All admin actions logged at CRITICAL severity. |

---

### Module 9: Notification Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Dispatch Telegram bot messages to users. Template management. Rate-limited delivery. |
| **Responsibilities** | (1) Manage message templates with localization. (2) Dispatch messages via Telegram Bot API (rate limited: 30/s global, 1/s per chat). (3) Queue messages in BullMQ for async delivery. (4) Check `blocked_bot` flag before sending. (5) Fall back to in-app notification if bot blocked. (6) Prioritize CRITICAL messages (security alerts) over informational (nudges). |
| **Dependencies** | BullMQ (notification queue), Redis (rate limiter counters), PostgreSQL (templates) |
| **Inputs** | `{ userId, templateId, variables, priority, channel? }` |
| **Outputs** | Queue acknowledgment or immediate delivery |
| **Database tables** | `notification_templates` |
| **APIs** | Internal: `sendNotification`, `sendTemplate` |
| **Events** | Emits: `notification.sent`, `notification.delivery_failed`, `notification.bot_blocked` |
| **Security requirements** | (1) Bot token in secrets manager. (2) Rate limit counters in Redis (sliding window). (3) Never send raw user data in messages. (4) Log all outbound messages in audit. (5) Dead letter queue for failed deliveries with alerting. |

---

### Module 10: Fraud Detection Service

| Aspect | Detail |
|--------|--------|
| **Purpose** | Detect and prevent abuse in real-time and via batch analysis. |
| **Responsibilities** | (1) Real-time: check request against fraud rules (multiple accounts, fingerprint mismatch, velocity). (2) Batch: hourly/daily clustering analysis (IP overlap, referral graph cycles, withdrawal address reuse). (3) Fingerprint management (store device fingerprints, detect collisions). (4) Score accounts by risk level. (5) Auto-suspend high-risk accounts with CRITICAL audit event. |
| **Dependencies** | PostgreSQL (user_fingerprints, security_events), Redis (real-time counters), BullMQ (batch analyzer) |
| **Inputs** | Real-time: request context (userId, IP, fingerprint, action). Batch: aggregated data. |
| **Outputs** | Real-time: allow/block decision. Batch: risk scores, suspension decisions. |
| **Database tables** | `user_fingerprints`, `security_events` |
| **APIs** | Internal: `checkRequest`, `recordFingerprint`, `getRiskScore`. Admin: `GET /v1/admin/fraud/clusters`, `POST /v1/admin/fraud/flag` |
| **Events** | Emits: `security.fingerprint_collision`, `security.suspicious_cluster`, `security.account_auto_suspended` |
| **Security requirements** | (1) Real-time guard runs synchronously in request path with 100ms max. (2) Never block legitimate users — use scoring, not binary decisions. (3) Auto-suspension requires CRITICAL audit and immediate admin notification. (4) Fingerprint hashes are one-way only (SHA-256). (5) Rate limit checking in Redis with 1ms target latency. |

---

## 2. Database Implementation Plan

### Migration Order

```
M001: Create base enums and users table
M002: Create telegram_accounts table
M003: Create sessions table
M004: Create onboarding_progress table
M005: Create education_modules table + seed data
M006: Create education_completions table
M007: Create user_consents table
M008: Create audit_events table
M009: Create user_fingerprints table
M010: Create recovery_codes table
M011: Create security_events table
M012: Create notification_templates table + seed data
M013: Add indexes (all)
```

### Table Specifications

---

#### Table: `users`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGINT | YES | — | Telegram User ID (primary key) |
| username | VARCHAR(255) | NO | NULL | Telegram username (unique) |
| first_name | VARCHAR(255) | YES | — | Telegram first name |
| last_name | VARCHAR(255) | NO | NULL | Telegram last name |
| role | VARCHAR(10) | YES | 'USER' | USER or ADMIN |
| state | VARCHAR(20) | YES | 'NEW' | Current lifecycle state |
| security_level | INTEGER | YES | 1 | Internal security tier |
| education_score | INTEGER | NO | NULL | 0-100 computed score |
| referrer_id | BIGINT | NO | NULL | FK to users.id (self-referral) |
| referred_by | VARCHAR(20) | NO | NULL | Referral code string used |
| invited_count | INTEGER | YES | 0 | Number of successful referrals |
| referral_boost_multiplier | DECIMAL(4,2) | YES | 1.00 | Boost from referrals |
| language_code | VARCHAR(10) | YES | 'en' | User's preferred language |
| last_login_at | TIMESTAMPTZ | NO | NULL | Last successful auth |
| login_count | INTEGER | YES | 0 | Total auth count |
| last_active_ip | INET | NO | NULL | Last request IP (fraud detection) |
| deletion_requested_at | TIMESTAMPTZ | NO | NULL | When user requested deletion |
| anonymized_at | TIMESTAMPTZ | NO | NULL | When GDPR anonymization completed |
| created_at | TIMESTAMPTZ | YES | NOW() | Row creation time |
| updated_at | TIMESTAMPTZ | YES | NOW() | Row update time |
| deleted_at | TIMESTAMPTZ | NO | NULL | Soft delete timestamp |

**Relationships:**
- PK: `id`
- FK: `referrer_id` REFERENCES `users(id)` ON DELETE SET NULL
- FK: Embedded in `telegram_accounts.user_id`, `sessions.user_id`, `onboarding_progress.user_id`, `education_completions.user_id`, `user_consents.user_id`, `audit_events.user_id`, `user_fingerprints.user_id`, `recovery_codes.user_id`, `security_events.user_id`

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE (username)` WHERE username IS NOT NULL
- `INDEX (state, updated_at)` — stalled user detection cron
- `INDEX (referrer_id)` — referral lookups

---

#### Table: `telegram_accounts`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGINT | YES | — | Telegram user_id (same as users.id) |
| user_id | BIGINT | YES | — | FK to users |
| username | VARCHAR(255) | NO | NULL | Current Telegram username |
| first_name | VARCHAR(255) | YES | — | Current Telegram display name |
| last_name | VARCHAR(255) | NO | NULL | |
| language_code | VARCHAR(10) | YES | 'en' | Telegram app language |
| photo_url | TEXT | NO | NULL | Telegram avatar URL |
| is_premium | BOOLEAN | YES | FALSE | Telegram Premium subscriber |
| allows_write_to_pm | BOOLEAN | YES | TRUE | Can bot send messages |
| blocked_bot | BOOLEAN | YES | FALSE | User blocked the bot |
| last_sync_at | TIMESTAMPTZ | YES | NOW() | Last profile sync |
| created_at | TIMESTAMPTZ | YES | NOW() | |
| updated_at | TIMESTAMPTZ | YES | NOW() | |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE CASCADE
**Indexes:** `UNIQUE (user_id)`

---

#### Table: `sessions`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | YES | — | FK to users |
| refresh_token_hash | VARCHAR(512) | YES | — | SHA-256 of refresh token |
| fingerprint | VARCHAR(64) | NO | NULL | SHA-256(user_agent + ip_prefix) |
| ip_address | INET | NO | NULL | |
| user_agent | TEXT | NO | NULL | |
| device_type | VARCHAR(20) | NO | NULL | mobile/desktop/tablet |
| country_code | VARCHAR(5) | NO | NULL | GeoIP |
| is_active | BOOLEAN | YES | TRUE | |
| suspected_compromised | BOOLEAN | YES | FALSE | Grace period flag |
| last_used_at | TIMESTAMPTZ | YES | NOW() | |
| expires_at | TIMESTAMPTZ | YES | — | 30 days from creation |
| created_at | TIMESTAMPTZ | YES | NOW() | |
| revoked_at | TIMESTAMPTZ | NO | NULL | |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE CASCADE
**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE (refresh_token_hash)`
- `INDEX (user_id, is_active)`
- `INDEX (expires_at)` — cleanup cron

---

#### Table: `onboarding_progress`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | YES | — | FK to users (1:1) |
| current_phase | VARCHAR(20) | YES | 'welcome' | welcome/education/consent/complete |
| current_step | VARCHAR(50) | YES | 'welcome_start' | Granular step identifier |
| completed_steps | TEXT[] | YES | '{}' | Array of completed step IDs |
| current_education_module_id | VARCHAR(20) | NO | NULL | Last active education module |
| started_at | TIMESTAMPTZ | YES | NOW() | |
| last_active_at | TIMESTAMPTZ | YES | NOW() | |
| completed_at | TIMESTAMPTZ | NO | NULL | |
| total_time_spent_seconds | INTEGER | YES | 0 | |
| metadata | JSONB | NO | NULL | language, entry_point, referrer_id |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE CASCADE
**Indexes:**
- `UNIQUE (user_id)`
- `INDEX (current_phase)` — stalled phase detection

---

#### Table: `education_modules` (seed data)

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR(20) | YES | — | Module code: 'crypto_basics', 'welcome', 'platform', 'funds', 'actions', 'risks', 'withdrawal', 'myths', 'quiz' |
| title | VARCHAR(255) | YES | — | Display title |
| description | TEXT | NO | NULL | |
| content_type | VARCHAR(20) | YES | — | slides / quiz / acknowledgement |
| content | JSONB | YES | — | Module content (slides, questions, explanations) |
| order_index | INTEGER | YES | — | Display and dependency order |
| mandatory | BOOLEAN | YES | TRUE | Must complete to proceed |
| estimated_seconds | INTEGER | YES | 60 | |
| is_active | BOOLEAN | YES | TRUE | Soft disable without deleting |
| version | INTEGER | YES | 1 | Increment on content change |
| created_at | TIMESTAMPTZ | YES | NOW() | |
| updated_at | TIMESTAMPTZ | YES | NOW() | |

**Relationships:** Referenced by `education_completions.module_id`
**Indexes:** `PRIMARY KEY (id)`, `INDEX (order_index)`

---

#### Table: `education_completions`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | YES | — | FK to users |
| module_id | VARCHAR(20) | YES | — | FK to education_modules |
| status | VARCHAR(20) | YES | 'NOT_STARTED' | NOT_STARTED / IN_PROGRESS / COMPLETED |
| current_slide_index | INTEGER | YES | 0 | Resume point |
| started_at | TIMESTAMPTZ | NO | NULL | |
| completed_at | TIMESTAMPTZ | NO | NULL | |
| module_version | INTEGER | YES | 1 | Version completed (for staleness check) |
| passed | BOOLEAN | NO | NULL | True if quiz passed at threshold |
| quiz_score | INTEGER | NO | NULL | Number correct |
| quiz_total | INTEGER | NO | NULL | Total questions |
| quiz_answers | JSONB | NO | NULL | Full answer audit trail |
| attempts | INTEGER | YES | 0 | Quiz retry count |
| time_spent_seconds | INTEGER | YES | 0 | |
| version | INTEGER | YES | 1 | Optimistic locking |

**Relationships:**
- FK `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- FK `module_id` REFERENCES `education_modules(id)` ON DELETE RESTRICT

**Indexes:**
- `UNIQUE (user_id, module_id)`
- `INDEX (status)` — incomplete modules for analytics

---

#### Table: `user_consents`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | YES | — | FK to users |
| consent_type | VARCHAR(30) | YES | — | risk_acknowledgement / tos_acceptance / privacy_acceptance / data_processing / marketing_opt_in |
| version | VARCHAR(20) | YES | — | 'tos_v1.2', 'risk_v1.0' |
| granted | BOOLEAN | YES | TRUE | |
| document_hash | VARCHAR(64) | NO | NULL | SHA-256 of document consented to |
| document_url | TEXT | NO | NULL | URL to document version |
| ip_address | INET | NO | NULL | |
| user_agent | TEXT | NO | NULL | |
| session_id | UUID | NO | NULL | |
| metadata | JSONB | NO | NULL | |
| created_at | TIMESTAMPTZ | YES | NOW() | |
| expires_at | TIMESTAMPTZ | NO | NULL | Null = never expires |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE CASCADE
**Indexes:**
- `UNIQUE (user_id, consent_type, version)` — no duplicate consents
- `INDEX (user_id, consent_type)` — active consent lookup

---

#### Table: `audit_events`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | NO | NULL | FK to users (nullable for system events) |
| target_user_id | BIGINT | NO | NULL | For admin actions — target of action |
| event_type | VARCHAR(50) | YES | — | e.g., 'auth.login', 'onboarding.step_completed' |
| severity | VARCHAR(10) | YES | 'INFO' | INFO / WARNING / CRITICAL |
| data | JSONB | NO | NULL | Event-specific payload |
| ip_address | INET | NO | NULL | |
| session_id | UUID | NO | NULL | |
| correlation_id | UUID | NO | NULL | Trace ID across events |
| created_at | TIMESTAMPTZ | YES | NOW() | |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE SET NULL
**Indexes:**
- `INDEX (user_id, event_type, created_at)`
- `INDEX (event_type, created_at)`
- `INDEX (severity, created_at)`
- `INDEX (correlation_id)`
- `INDEX (created_at)` — partition pruning

**Note:** Monthly partitioning by `created_at`. 7-year retention. Append-only enforced by DB trigger.

---

#### Table: `user_fingerprints`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | YES | — | FK to users |
| fingerprint_hash | VARCHAR(64) | YES | — | SHA-256 of device fingerprint |
| ip_address | INET | NO | NULL | |
| user_agent | TEXT | NO | NULL | |
| first_seen_at | TIMESTAMPTZ | YES | NOW() | |
| last_seen_at | TIMESTAMPTZ | YES | NOW() | |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE CASCADE
**Indexes:**
- `UNIQUE (user_id, fingerprint_hash)`
- `INDEX (fingerprint_hash)` — collision detection

---

#### Table: `recovery_codes`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | YES | — | FK to users |
| code_hash | VARCHAR(64) | YES | — | SHA-256 of recovery code |
| is_used | BOOLEAN | YES | FALSE | |
| used_at | TIMESTAMPTZ | NO | NULL | |
| created_at | TIMESTAMPTZ | YES | NOW() | |
| expires_at | TIMESTAMPTZ | YES | — | 1 year from issue |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE CASCADE
**Indexes:** `UNIQUE (code_hash)`, `INDEX (user_id, is_used)`

---

#### Table: `security_events`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | YES | gen_random_uuid() | |
| user_id | BIGINT | NO | NULL | FK to users |
| event_type | VARCHAR(50) | YES | — | fingerprint_collision / suspicious_cluster / account_auto_suspended / brute_force_detected |
| severity | VARCHAR(10) | YES | 'HIGH' | LOW / MEDIUM / HIGH / CRITICAL |
| metadata | JSONB | NO | NULL | |
| ip_address | INET | NO | NULL | |
| created_at | TIMESTAMPTZ | YES | NOW() | |

**Relationships:** FK `user_id` REFERENCES `users(id)` ON DELETE SET NULL
**Indexes:** `INDEX (event_type, created_at)`, `INDEX (severity, created_at)`

---

#### Table: `notification_templates`

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR(50) | YES | — | Template key: 'onboarding.nudge_3h', 'welcome.message' |
| category | VARCHAR(30) | YES | — | onboarding / security / marketing / transactional |
| translations | JSONB | YES | — | { "en": "...", "ru": "..." } |
| variables | TEXT[] | YES | '{}' | Expected variables: ['username', 'step'] |
| created_at | TIMESTAMPTZ | YES | NOW() | |
| updated_at | TIMESTAMPTZ | YES | NOW() | |

**Indexes:** `PRIMARY KEY (id)`

---

### Rollback Considerations

| Migration | Rollback Risk | Mitigation |
|-----------|---------------|------------|
| M001 (users) | Dropping users loses all data | Never revert M001 in production. Use new migration to add columns. |
| M003 (sessions) | Active sessions lost | Ensure zero-downtime: deploy session write code first, then enable session validation. |
| M005 (education_modules seed) | Seed data changes post-deploy | Use upserts, not deletes. Track seed version. |
| M008 (audit_events) | Audit records are immutable | Partitioned — dropping old partitions is safe. Never drop active partition. |
| M013 (indexes) | Long-running index creation on large tables | Use CONCURRENTLY for production index creation. |

---

## 3. API Specification

### 3.1 Authentication Endpoints

---

#### `POST /api/v1/auth/telegram`

**Purpose:** Authenticate via Telegram Mini App initData. Creates user if first time.

**Auth:** None (uses initData for verification)

**Rate Limit:** 10 requests/minute per IP

**Request:**
```json
{
  "initData": "query_id=AAHd...&auth_date=17221...&hash=abc123..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 300,
    "user": {
      "id": 123456789,
      "firstName": "Alice",
      "username": "alice_123",
      "state": "ONB_WELCOME",
      "role": "USER",
      "languageCode": "en",
      "educationScore": null
    },
    "onboarding": {
      "currentPhase": "welcome",
      "currentStep": "welcome_start",
      "completedSteps": [],
      "progress": 0.0
    }
  }
}
```

**Response 200 — Returning user (onboarding complete):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 300,
    "user": {
      "id": 123456789,
      "firstName": "Alice",
      "username": "alice_123",
      "state": "ACTIVE",
      "role": "USER",
      "languageCode": "en",
      "educationScore": 85
    },
    "onboarding": {
      "currentPhase": "complete",
      "currentStep": "completed",
      "completedSteps": ["welcome_start", "crypto_basics_done", ...],
      "progress": 100.0
    }
  },
  "set-cookie": "refresh_token=abc...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000"
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `MALFORMED_INIT_DATA` | Cannot parse initData string |
| 400 | `INIT_DATA_TOO_LARGE` | initData > 4096 bytes |
| 401 | `INVALID_INIT_DATA` | HMAC signature mismatch |
| 401 | `AUTH_DATE_EXPIRED` | auth_date older than 5 minutes |
| 401 | `NONCE_REUSED` | query_id already used (replay) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error, retry |

---

#### `POST /api/v1/auth/refresh`

**Purpose:** Rotate access + refresh tokens.

**Auth:** Refresh token (HTTP-Only cookie)

**Rate Limit:** 5 requests/minute per IP, 3 requests/minute per user

**Request:** (cookie only, no body)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 300
  }
}
```

**Response 200 — Theft detected (grace period):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 300,
    "securityWarning": "Suspicious activity detected on your account. If this was not you, use /freeze command immediately."
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `SESSION_NOT_FOUND` | Refresh token not in DB |
| 401 | `SESSION_REVOKED` | Session was revoked |
| 401 | `SESSION_EXPIRED` | Refresh token expired (>30d) |
| 429 | `RATE_LIMITED` | Too many refresh attempts |
| 401 | `SESSION_THEFT_CONFIRMED` | Token reuse detected — all sessions revoked |

---

#### `POST /api/v1/auth/logout`

**Purpose:** Revoke current session.

**Auth:** JWT access token (header) + Refresh token (cookie)

**Rate Limit:** 10 requests/minute per user

**Request:** (cookie + header only)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Session revoked"
  }
}
```

---

### 3.2 Onboarding Endpoints

---

#### `GET /api/v1/onboarding/state`

**Purpose:** Get current onboarding position, progress %, and next steps.

**Auth:** JWT required. State-gated: only allowed in ONB_* states.

**Rate Limit:** 60 requests/minute per user

**Response 200:**
```json
{
  "success": true,
  "data": {
    "currentPhase": "education",
    "currentStep": "platform",
    "completedSteps": ["welcome_done", "crypto_basics_done"],
    "progress": 25.0,
    "currentEducationModuleId": "platform",
    "timeSpentSeconds": 145
  }
}
```

---

#### `POST /api/v1/onboarding/step`

**Purpose:** Advance to next onboarding step. Server validates previous step completion.

**Auth:** JWT required. State-gated.

**Rate Limit:** 10 requests/minute per user

**Request:**
```json
{
  "stepId": "welcome_complete",
  "metadata": {
    "timeSpentSeconds": 32,
    "language": "en"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "currentPhase": "education",
    "currentStep": "crypto_basics",
    "completedSteps": ["welcome_done"],
    "progress": 11.1,
    "nextModules": [
      {
        "id": "crypto_basics",
        "title": "What is Crypto?",
        "mandatory": true,
        "estimatedSeconds": 60
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_STEP_TRANSITION` | Step advancement not allowed from current position |
| 400 | `PREREQUISITE_NOT_MET` | Previous step not completed |
| 400 | `UNKNOWN_STEP_ID` | stepId not recognized |
| 403 | `STATE_BLOCKED` | User state does not allow this action |

---

### 3.3 Education Endpoints

---

#### `GET /api/v1/education/modules`

**Purpose:** List all modules with current user's progress.

**Auth:** JWT required. State-gated: EDUCATION phase or later.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "id": "crypto_basics",
        "title": "What is Crypto?",
        "contentType": "slides",
        "orderIndex": 1,
        "mandatory": true,
        "estimatedSeconds": 60,
        "progress": {
          "status": "COMPLETED",
          "currentSlideIndex": 3,
          "completedAt": "2026-07-28T12:00:00Z"
        }
      },
      {
        "id": "quiz",
        "title": "Comprehension Check",
        "contentType": "quiz",
        "orderIndex": 9,
        "mandatory": true,
        "estimatedSeconds": 120,
        "progress": {
          "status": "NOT_STARTED",
          "attempts": 0
        }
      }
    ],
    "allMandatoryComplete": false
  }
}
```

---

#### `GET /api/v1/education/modules/:moduleId`

**Purpose:** Get full module content (slides, questions).

**Auth:** JWT required. State-gated.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "crypto_basics",
    "title": "What is Crypto?",
    "version": 1,
    "slides": [
      {
        "type": "text",
        "contentKey": "crypto_basics.slide_1",
        "variables": {}
      },
      {
        "type": "image",
        "url": "https://cdn.titanstream.com/edu/crypto_basics/slide_2_v1.png",
        "altKey": "crypto_basics.slide_2_alt"
      }
    ],
    "totalSlides": 3
  }
}
```

---

#### `POST /api/v1/education/progress`

**Purpose:** Update slide progress within a module (resume point).

**Auth:** JWT required.

**Request:**
```json
{
  "moduleId": "crypto_basics",
  "currentSlideIndex": 2,
  "timeSpentSeconds": 15
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "IN_PROGRESS",
    "currentSlideIndex": 2,
    "nextSlideIndex": 3
  }
}
```

---

#### `POST /api/v1/education/quiz/answer`

**Purpose:** Submit single quiz answer. Validates sequence server-side.

**Auth:** JWT required.

**Request:**
```json
{
  "moduleId": "quiz",
  "questionIndex": 0,
  "selectedIndex": 1,
  "timeSpentSeconds": 8
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "correct": true,
    "explanationKey": "quiz.q1_explanation",
    "questionIndex": 0,
    "totalAnswered": 1,
    "totalCorrect": 1,
    "totalQuestions": 5
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `QUESTION_ALREADY_ANSWERED` | Duplicate submission for same question |
| 400 | `OUT_OF_ORDER_ANSWER` | Skipped question index |
| 400 | `QUIZ_ALREADY_PASSED` | Quiz already completed with passing score |
| 400 | `QUIZ_LOCKED` | Max attempts reached, support intervention required |
| 400 | `ANSWER_TOO_FAST` | Answer submitted faster than 5s minimum |

---

#### `POST /api/v1/education/quiz/complete`

**Purpose:** Finalize quiz attempt, compute score.

**Auth:** JWT required.

**Request:**
```json
{
  "moduleId": "quiz",
  "timeSpentSeconds": 85
}
```

**Response 200 — Pass:**
```json
{
  "success": true,
  "data": {
    "passed": true,
    "score": 5,
    "total": 5,
    "percentage": 100,
    "attempts": 1,
    "educationScore": 92,
    "nextStep": {
      "type": "consent",
      "consentTypes": [
        "risk_acknowledgement",
        "tos_acceptance",
        "privacy_acceptance",
        "data_processing"
      ]
    }
  }
}
```

**Response 200 — Fail:**
```json
{
  "success": true,
  "data": {
    "passed": false,
    "score": 3,
    "total": 5,
    "percentage": 60,
    "attempts": 1,
    "retryAllowed": true,
    "remainingAttempts": 2,
    "failedQuestions": [1, 3],
    "explanations": {
      "1": "quiz.q1_explanation",
      "3": "quiz.q3_explanation"
    }
  }
}
```

---

### 3.4 Consent Endpoints

---

#### `GET /api/v1/consent/pending`

**Purpose:** List consents still required before user can proceed.

**Auth:** JWT required. State-gated: CONSENT_PENDING or later.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "pendingConsents": [
      { "type": "risk_acknowledgement", "version": "risk_v1.0" },
      { "type": "tos_acceptance", "version": "tos_v1.2" }
    ],
    "allRequiredComplete": false
  }
}
```

---

#### `POST /api/v1/consent/:type`

**Purpose:** Record individual consent.

**Auth:** JWT required.

**Request:**
```json
{
  "granted": true,
  "version": "risk_v1.0",
  "documentHash": "a1b2c3d4e5f6...",
  "documentUrl": "https://titanstream.com/legal/risk-disclosure-v1"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "consentType": "risk_acknowledgement",
    "granted": true,
    "version": "risk_v1.0",
    "createdAt": "2026-07-28T12:00:00Z",
    "pendingConsents": ["tos_acceptance", "privacy_acceptance"]
  }
}
```

---

### 3.5 User Endpoints

---

#### `GET /api/v1/users/me`

**Purpose:** Get current user profile.

**Auth:** JWT required.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 123456789,
    "firstName": "Alice",
    "username": "alice_123",
    "state": "ACTIVE",
    "role": "USER",
    "languageCode": "en",
    "educationScore": 85,
    "achievements": [
      { "type": "education_graduate", "unlockedAt": "2026-07-28T12:00:00Z" }
    ],
    "createdAt": "2026-07-01T10:00:00Z"
  }
}
```

---

#### `PATCH /api/v1/users/me`

**Purpose:** Update profile preferences (language).

**Auth:** JWT required.

**Rate Limit:** 10 requests/minute per user

**Request:**
```json
{
  "languageCode": "ru"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "languageCode": "ru",
    "updatedAt": "2026-07-28T12:05:00Z"
  }
}
```

---

#### `DELETE /api/v1/users/me`

**Purpose:** Request account deletion (30-day grace period).

**Auth:** JWT required.

**Rate Limit:** 5 requests/minute per user

**Request:** (empty body)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Deletion requested. Your account will be permanently deleted on 2026-08-27. You can cancel this by logging in before then.",
    "deletionScheduledAt": "2026-08-27T12:00:00Z"
  }
}
```

---

## 4. Event Architecture

### 4.1 Event Definitions

All events published on Redis Pub/Sub. BullMQ used for async job processing.

---

#### `user.created`

| Field | Value |
|-------|-------|
| **Trigger** | First successful auth — user row created |
| **Producer** | User Profile Service |
| **Consumers** | Onboarding Service, Notification Service, Fraud Detection Service |
| **Payload** | `{ userId, telegramId, firstName, username, referrerId?, languageCode, ipAddress, fingerprintHash }` |
| **DB changes** | Row inserted into `users`, `telegram_accounts`, `onboarding_progress` |
| **Failure handling** | If consumer fails, retry 3x with exponential backoff. After 3 failures → dead letter queue. Critical: user exists but onboarding not initialized. Manual fix required. |

---

#### `auth.session_created`

| Field | Value |
|-------|-------|
| **Trigger** | Successful auth (first time or returning) |
| **Producer** | Session Service |
| **Consumers** | Audit Service, Fraud Detection Service |
| **Payload** | `{ userId, sessionId, ipAddress, deviceType, countryCode, fingerprintHash }` |
| **DB changes** | Row inserted into `sessions`, `users.last_login_at` updated |
| **Failure handling** | Retry 2x. Non-critical (login still works). Dead letter for investigation. |

---

#### `onboarding.step_completed`

| Field | Value |
|-------|-------|
| **Trigger** | User completes onboarding step |
| **Producer** | Onboarding Service |
| **Consumers** | Audit Service, Notification Service (for nudge cancellation) |
| **Payload** | `{ userId, stepId, phase, progress, timeSpentSeconds }` |
| **DB changes** | `onboarding_progress.completed_steps` appends stepId, `current_step` updated |
| **Failure handling** | Retry 3x. If audit fails, step advancement still succeeds (eventually consistent). |

---

#### `onboarding.completed`

| Field | Value |
|-------|-------|
| **Trigger** | User clicks "Enter TitanStream" — state transitions to ELIGIBLE |
| **Producer** | Onboarding Service |
| **Consumers** | User Profile Service, Wallet Service (welcome bonus), Notification Service, Referral Service |
| **Payload** | `{ userId, totalTimeSpentSeconds, educationScore, consentTypes }` |
| **DB changes** | `users.state` → `ELIGIBLE`, `onboarding_progress.completed_at` set |
| **Failure handling** | Retry 5x. CRITICAL if welcome bonus fails (financial impact). Alert on-call. |

---

#### `education.module_completed`

| Field | Value |
|-------|-------|
| **Trigger** | User completes a single education module |
| **Producer** | Education Service |
| **Consumers** | Onboarding Service (check if all modules done), Audit Service |
| **Payload** | `{ userId, moduleId, moduleVersion, timeSpentSeconds, quizScore? }` |
| **DB changes** | `education_completions.status` → `COMPLETED` |
| **Failure handling** | Retry 3x. Non-critical individually; critical if last module doesn't trigger state transition. |

---

#### `education.all_modules_completed`

| Field | Value |
|-------|-------|
| **Trigger** | Last mandatory education module completed |
| **Producer** | Education Service |
| **Consumers** | Onboarding Service (advance to CONSENT_PENDING), User Profile Service (update education score), Audit Service |
| **Payload** | `{ userId, educationScore, completedModules: string[] }` |
| **DB changes** | `users.education_score` set, onboarding phase → consent |
| **Failure handling** | Retry 5x. CRITICAL if state doesn't advance — user stuck. Alert on-call. |

---

#### `consent.recorded`

| Field | Value |
|-------|-------|
| **Trigger** | User records a single consent |
| **Producer** | Consent Service |
| **Consumers** | Audit Service (write audit trail) |
| **Payload** | `{ userId, consentType, version, documentHash, ipAddress, sessionId }` |
| **DB changes** | Row inserted into `user_consents` |
| **Failure handling** | Retry 3x. Non-critical — consent already stored in primary DB. Audit is secondary. |

---

#### `consent.all_required_completed`

| Field | Value |
|-------|-------|
| **Trigger** | Last required consent for current version recorded |
| **Producer** | Consent Service |
| **Consumers** | Onboarding Service (advance to READY_FOR_PLATFORM) |
| **Payload** | `{ userId, consentTypes: string[], version }` |
| **DB changes** | Onboarding phase → ready |
| **Failure handling** | Retry 5x. CRITICAL if state doesn't advance. Alert on-call. |

---

#### `security.fingerprint_collision`

| Field | Value |
|-------|-------|
| **Trigger** | Same device fingerprint found with different user_id |
| **Producer** | Fraud Detection Service |
| **Consumers** | Audit Service, Notification Service (alert admin) |
| **Payload** | `{ primaryUserId, collidingUserId, fingerprintHash, ipAddress }` |
| **DB changes** | Row inserted into `security_events` |
| **Failure handling** | Immediate alert to ops channel. No retry — event is informational. |

---

#### `security.account_auto_suspended`

| Field | Value |
|-------|-------|
| **Trigger** | Fraud detection auto-suspends account (high confidence) |
| **Producer** | Fraud Detection Service |
| **Consumers** | Session Service (revoke sessions), Notification Service (notify user), Audit Service |
| **Payload** | `{ userId, reason, evidenceSummary, suspendedById: "SYSTEM" }` |
| **DB changes** | `users.state` → `SUSPENDED`, all active sessions revoked |
| **Failure handling** | Retry 5x. CRITICAL. If session revocation fails, suspended user still has active sessions. Alert on-call immediately. |

---

### 4.2 Event Bus Architecture

```
                    ┌─────────────────────┐
                    │   Redis Pub/Sub     │
                    │  (real-time events) │
                    └──────┬──────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                  │
         ▼                 ▼                  ▼
  ┌────────────┐   ┌────────────┐    ┌──────────────┐
  │  Auth Svc  │   │ Onboarding │    │  Education   │
  │ (consumer) │   │  Svc (pub) │    │  Svc (pub)   │
  └────────────┘   └────────────┘    └──────────────┘

                    ┌─────────────────────┐
                    │   BullMQ Queues     │
                    │  (async jobs)       │
                    └──────┬──────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                  ▼
  ┌────────────┐   ┌────────────┐    ┌──────────────┐
  │ audit-queue│   │notif-queue │    │onb-nudge-q   │
  │ (worker)   │   │ (worker)   │    │ (cron)       │
  └────────────┘   └────────────┘    └──────────────┘
```

---

## 5. User State Engine Implementation

### 5.1 State Definitions

```typescript
enum UserState {
  NEW = 'NEW',
  ONB_WELCOME = 'ONB_WELCOME',
  ONB_EDUCATION = 'ONB_EDUCATION',
  ONB_EDU_COMPLETE = 'ONB_EDU_COMPLETE',
  CONSENT_PENDING = 'CONSENT_PENDING',
  READY_FOR_PLATFORM = 'READY_FOR_PLATFORM',
  ELIGIBLE = 'ELIGIBLE',
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  ONB_STALLED = 'ONB_STALLED',
  FROZEN = 'FROZEN',
  CONSENT_EXPIRED = 'CONSENT_EXPIRED',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  PENDING_DELETION = 'PENDING_DELETION',
  DELETED = 'DELETED',
}
```

### 5.2 State Machine Rules

```typescript
const STATE_MACHINE: Record<UserState, StateConfig> = {
  NEW: {
    allowedTransitions: ['ONB_WELCOME', 'ONB_STALLED'],
    triggers: {
      ONB_WELCOME: { type: 'auto', condition: 'on_first_auth' },
      ONB_STALLED: { type: 'cron', condition: 'no_activity_24h' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE', 'VIEW_DASHBOARD'],
    description: 'User row created, no onboarding started',
  },

  ONB_WELCOME: {
    allowedTransitions: ['ONB_EDUCATION', 'ONB_STALLED'],
    triggers: {
      ONB_EDUCATION: { type: 'step', stepId: 'welcome_complete' },
      ONB_STALLED: { type: 'cron', condition: 'no_activity_24h' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE', 'VIEW_DASHBOARD'],
    description: 'User has seen welcome, picking language',
  },

  ONB_EDUCATION: {
    allowedTransitions: ['ONB_EDU_COMPLETE', 'ONB_STALLED'],
    triggers: {
      ONB_EDU_COMPLETE: { type: 'event', event: 'education.all_modules_completed' },
      ONB_STALLED: { type: 'cron', condition: 'no_activity_24h' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE'],
    allowedActions: ['VIEW_DASHBOARD_READONLY'],
    description: 'User in education flow',
  },

  ONB_EDU_COMPLETE: {
    allowedTransitions: ['CONSENT_PENDING', 'ONB_STALLED'],
    triggers: {
      CONSENT_PENDING: { type: 'auto', condition: 'education_complete' },
      ONB_STALLED: { type: 'cron', condition: 'no_activity_24h' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE'],
    allowedActions: ['VIEW_DASHBOARD_READONLY'],
    description: 'All education modules completed, awaiting consents',
  },

  CONSENT_PENDING: {
    allowedTransitions: ['READY_FOR_PLATFORM', 'ONB_STALLED'],
    triggers: {
      READY_FOR_PLATFORM: { type: 'event', event: 'consent.all_required_completed' },
      ONB_STALLED: { type: 'cron', condition: 'no_activity_24h' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE'],
    allowedActions: ['VIEW_DASHBOARD_READONLY'],
    description: 'Awaiting individual consent acknowledgements',
  },

  READY_FOR_PLATFORM: {
    allowedTransitions: ['ELIGIBLE', 'ONB_STALLED'],
    triggers: {
      ELIGIBLE: { type: 'step', stepId: 'enter_platform' },
      ONB_STALLED: { type: 'cron', condition: 'no_activity_24h' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE'],
    allowedActions: ['VIEW_DASHBOARD_READONLY'],
    description: 'Onboarding complete, awaiting user confirmation to enter',
  },

  ELIGIBLE: {
    allowedTransitions: ['ACTIVE', 'DORMANT', 'FROZEN', 'CONSENT_EXPIRED', 'SUSPENDED', 'PENDING_DELETION', 'BANNED'],
    triggers: {
      ACTIVE: { type: 'auto', condition: 'first_platform_action' },
      DORMANT: { type: 'cron', condition: 'no_activity_30d' },
      FROZEN: { type: 'event', event: 'security.freeze' },
      CONSENT_EXPIRED: { type: 'event', event: 'consent.version_changed' },
      SUSPENDED: { type: 'event', event: 'security.suspend' },
      PENDING_DELETION: { type: 'step', stepId: 'request_deletion' },
      BANNED: { type: 'event', event: 'admin.ban' },
    },
    blockedActions: ['WITHDRAW'],
    allowedActions: ['MINE', 'INVITE', 'VIEW_DASHBOARD', 'VIEW_QUESTS'],
    description: 'Can mine and invite, cannot withdraw',
  },

  ACTIVE: {
    allowedTransitions: ['DORMANT', 'FROZEN', 'CONSENT_EXPIRED', 'SUSPENDED', 'PENDING_DELETION', 'BANNED'],
    triggers: {
      DORMANT: { type: 'cron', condition: 'no_activity_30d' },
      FROZEN: { type: 'event', event: 'security.freeze' },
      CONSENT_EXPIRED: { type: 'event', event: 'consent.version_changed' },
      SUSPENDED: { type: 'event', event: 'security.suspend' },
      PENDING_DELETION: { type: 'step', stepId: 'request_deletion' },
      BANNED: { type: 'event', event: 'admin.ban' },
    },
    blockedActions: [],
    allowedActions: ['MINE', 'WITHDRAW', 'INVITE', 'VIEW_DASHBOARD', 'VIEW_QUESTS', 'PLAY_GAMES'],
    description: 'Full platform access',
  },

  DORMANT: {
    allowedTransitions: ['ACTIVE', 'FROZEN'],
    triggers: {
      ACTIVE: { type: 'auto', condition: 'user_authenticates' },
      FROZEN: { type: 'cron', condition: 'no_activity_180d' },
    },
    blockedActions: [],
    allowedActions: ['MINE', 'WITHDRAW', 'INVITE', 'VIEW_DASHBOARD'],
    description: 'No activity for 30+ days. Mining speed decayed to base.',
  },

  ONB_STALLED: {
    allowedTransitions: ['ONB_WELCOME', 'ONB_EDUCATION', 'ONB_EDU_COMPLETE', 'CONSENT_PENDING'],
    triggers: {
      // Resume to the previous phase based on onboarding_progress
      '*': { type: 'auto', condition: 'user_authenticates' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE'],
    allowedActions: ['VIEW_ONBOARDING'],
    description: 'Onboarding paused, resume supported',
  },

  FROZEN: {
    allowedTransitions: ['ACTIVE', 'SUSPENDED'],
    triggers: {
      ACTIVE: { type: 'admin', condition: 'user_verified_identity' },
      SUSPENDED: { type: 'admin', condition: 'fraud_confirmed' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE', 'VIEW_DASHBOARD', 'VIEW_QUESTS'],
    description: 'Emergency freeze. All actions blocked. Support contact only.',
  },

  CONSENT_EXPIRED: {
    allowedTransitions: ['ONB_EDU_COMPLETE'],  // Goes back to consent phase
    triggers: {
      ONB_EDU_COMPLETE: { type: 'auto', condition: 'consent_renewed' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE'],
    allowedActions: ['VIEW_CONSENT_FORM'],
    description: 'ToS/Privacy updated. Must re-consent to continue.',
  },

  SUSPENDED: {
    allowedTransitions: ['ACTIVE', 'BANNED'],
    triggers: {
      ACTIVE: { type: 'admin', condition: 'appeal_approved' },
      BANNED: { type: 'admin', condition: 'violation_confirmed' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE', 'VIEW_DASHBOARD'],
    allowedActions: ['VIEW_APPEAL_FORM'],
    description: 'Temporary suspension. Appeal available.',
  },

  BANNED: {
    allowedTransitions: [],
    triggers: {},
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE', 'VIEW_DASHBOARD', 'VIEW_APPEAL'],
    description: 'Permanent ban. No return path. Data retained per legal.',
  },

  PENDING_DELETION: {
    allowedTransitions: ['ACTIVE', 'DELETED'],
    triggers: {
      ACTIVE: { type: 'step', stepId: 'cancel_deletion' },
      DELETED: { type: 'cron', condition: 'grace_period_30d_expired' },
    },
    blockedActions: ['MINE', 'WITHDRAW', 'INVITE'],
    allowedActions: ['VIEW_CANCELLATION'],
    description: '30-day grace period. Logging in cancels deletion.',
  },

  DELETED: {
    allowedTransitions: [],
    triggers: {},
    blockedActions: ['*'],  // All actions blocked
    description: 'Personal data anonymized. Financial records retained per legal requirement.',
  },
};
```

### 5.3 Action Authorization Middleware

```typescript
// In NestJS guard — applied to every API endpoint
@Injectable()
class StateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const action: string = this.reflector.get<Action>('action', context.getHandler());
    const stateConfig = STATE_MACHINE[user.state];

    if (!stateConfig) return false;

    // Check if action is explicitly blocked
    if (stateConfig.blockedActions.includes('*') || stateConfig.blockedActions.includes(action)) {
      throw new ForbiddenException({
        code: 'STATE_BLOCKED',
        message: `Action '${action}' not allowed in state '${user.state}'`,
      });
    }

    // Check if action requires explicit allowlist
    if (stateConfig.allowedActions && stateConfig.allowedActions.length > 0) {
      if (!stateConfig.allowedActions.includes(action)) {
        throw new ForbiddenException({
          code: 'STATE_BLOCKED',
          message: `Action '${action}' not allowed in state '${user.state}'`,
        });
      }
    }

    return true;
  }
}
```

---

## 6. Telegram Bot Implementation Flow

### 6.1 Bot Command Handler

---

#### `/start` — First time user

| Element | Detail |
|---------|--------|
| **User action** | Sends `/start` to @titanstream_bot |
| **Bot message** | "Welcome to TitanStream! A Telegram-native earning platform.\n\n⚠ TitanStream is not a bank, not an investment, and not guaranteed income.\n\nChoose your language to begin:" |
| **Buttons** | `🇬🇧 English` \| `🇷🇺 Русский` \| `🇪🇸 Español` \| `🇵🇹 Português` |
| **Backend call** | `POST /api/v1/auth/telegram` with initData from Mini App |
| **Next state** | Bot opens Mini App. User sees welcome screen in selected language. |

---

#### `/start` — Returning user (onboarding incomplete)

| Element | Detail |
|---------|--------|
| **User action** | Sends `/start` |
| **Bot message** | "Welcome back! You're on Step 3 of 9. Tap continue to pick up where you left off." |
| **Buttons** | `▶ Continue Onboarding` \| `🔄 Restart` |
| **Backend call** | `GET /api/v1/onboarding/state` → returns current step |
| **Next state** | Opens Mini App at current step. `POST /api/v1/onboarding/step` on continue. |

---

#### `/start` — Returning user (onboarding complete)

| Element | Detail |
|---------|--------|
| **User action** | Sends `/start` |
| **Bot message** | "Welcome back! Your mining has been running. You've earned approximately X USDT since your last visit." |
| **Buttons** | `⛏ Open TitanStream` |
| **Backend call** | `POST /api/v1/auth/telegram` |
| **Next state** | Mini App opens to dashboard. Dashboard shows "What's New" if features changed. |

---

#### `/freeze` — Emergency account freeze

| Element | Detail |
|---------|--------|
| **User action** | Sends `/freeze` in any state |
| **Bot message** | "⚠ Freeze requested. This will block all account activity immediately.\n\nAre you sure?" |
| **Buttons** | `✅ Yes, freeze my account` \| `❌ Cancel` |
| **Backend call** | `POST /api/v1/auth/freeze` (creates CRITICAL audit event, transitions state to FROZEN) |
| **Next state** | FROZEN. All sessions revoked. Admin notified. Unfreeze requires support verification. |

---

### 6.2 Nudge Messages (Cron-Triggered)

#### Nudge 1: 3 hours after onboarding stall

| Element | Detail |
|---------|--------|
| **Trigger** | BullMQ cron: user in ONB_* state with 3h inactivity |
| **Bot message** | "Hey! You started setting up your TitanStream account. You're only 5 minutes away from completing." |
| **Buttons** | `▶ Continue` |
| **Backend call** | `GET /api/v1/onboarding/state` → mini app |
| **Next state** | No state change — just re-engagement |

#### Nudge 2: 12 hours after onboarding stall

| Element | Detail |
|---------|--------|
| **Trigger** | BullMQ cron: 12h inactivity |
| **Bot message** | "Your TitanStream account is almost ready! Complete the last few steps to start mining." |
| **Buttons** | `▶ Continue` |
| **Backend call** | Same as above |
| **Next state** | No state change |

#### Nudge 3: 48 hours after onboarding stall

| Element | Detail |
|---------|--------|
| **Trigger** | BullMQ cron: 48h inactivity |
| **Bot message** | "Don't miss out! Your onboarding progress is saved. Tap to resume anytime." |
| **Buttons** | `▶ Continue` \| `❌ No thanks` |
| **Backend call** | Same |
| **Next state** | If "No thanks" → stop nudges for this user. No state change. |

---

### 6.3 Bot Implementation Notes

- All bot messages use localized templates from `notification_templates` table
- Bot token in secrets manager, never in code
- Rate-limited dispatcher enforces 30/s global, 1/s per chat
- `blocked_bot` flag checked before every outbound message
- If bot blocked → mark `blocked_bot = true` → stop all future nudge attempts
- `/freeze` has priority over all other rate limits (CRITICAL severity)

---

## 7. Security Implementation Checklist

### 7.1 Authentication Security

| # | Task | Priority | Verification |
|---|------|----------|--------------|
| S1 | Store bot token in secrets manager (Vault/AWS Secrets Manager) | CRITICAL | Audit: no env var with bot token |
| S2 | Implement HMAC-SHA256 initData verification with 500ms timeout | CRITICAL | Unit test: valid + invalid initData |
| S3 | Enforce 5-minute auth_date tolerance window | CRITICAL | Unit test: expired auth_date |
| S4 | Store used query_ids in Redis with 5min TTL (nonce dedup) | CRITICAL | Unit test: replay rejected |
| S5 | Limit initData size to 4096 bytes | HIGH | Integration test: oversized payload rejected |
| S6 | RS256 JWT signing key pair in secrets manager | CRITICAL | Audit: key rotation procedure documented |
| S7 | Access token: 5min TTL, never persisted (client memory only) | HIGH | Code review: no localStorage writes |
| S8 | Refresh token: HTTP-Only Secure SameSite=Strict cookie | CRITICAL | QA: verify cookie attributes |
| S9 | Refresh token stored as SHA-256 hash in DB | CRITICAL | Code review: no plaintext tokens |
| S10 | Grace period for refresh token theft detection | HIGH | Integration test: reuse after rotation |

### 7.2 Session Management

| # | Task | Priority | Verification |
|---|------|----------|--------------|
| S11 | Redis primary session cache (5min TTL) | HIGH | Load test: sub-5ms session validation |
| S12 | PostgreSQL sessions table as source of truth | HIGH | |
| S13 | Max 5 concurrent sessions per user | MEDIUM | Integration test: 6th login revokes oldest |
| S14 | Session fingerprint binding (user-agent + IP prefix) | HIGH | Integration test: fingerprint mismatch → re-auth |
| S15 | Session cleanup cron (remove expired daily) | MEDIUM | |
| S16 | Rate limit refresh endpoint: 5/min IP, 3/min user | CRITICAL | Load test: verify limits enforced |

### 7.3 Rate Limiting

| # | Task | Priority | Verification |
|---|------|----------|--------------|
| S17 | Redis-based sliding window rate limiter | CRITICAL | Load test: consistent across instances |
| S18 | Auth endpoint: 10 req/min per IP | HIGH | |
| S19 | Onboarding step: 10 req/min per user | MEDIUM | |
| S20 | Refresh endpoint: 5 req/min per IP, 3/min per user | CRITICAL | |
| S21 | General API: 60 req/min per user | MEDIUM | |
| S22 | Mining taps: 300 req/min per user (future) | LOW | |

### 7.4 Fraud Prevention

| # | Task | Priority | Verification |
|---|------|----------|--------------|
| S23 | Store device fingerprint on every auth | HIGH | |
| S24 | Detect fingerprint collisions across user_ids | HIGH | Integration test: same fingerprint, different user → alert |
| S25 | IP clustering: flag >3 accounts from same /24 subnet | HIGH | Batch job test |
| S26 | Referral graph cycle detection | HIGH | Batch job test: A→B→C→A flagged |
| S27 | Withdrawal address uniqueness check | HIGH | Integration test: same address, different user → flag |
| S28 | Auto-suspend on high-confidence fraud signals | CRITICAL | Integration test: suspension triggers correctly |
| S29 | Minimum 5s between quiz answers (anti-bot) | MEDIUM | Unit test: fast answers rejected |
| S30 | Max 3 quiz attempts, lock after | MEDIUM | Integration test: 4th attempt rejected |

### 7.5 Audit Logging

| # | Task | Priority | Verification |
|---|------|----------|--------------|
| S31 | All auth events logged (login, logout, refresh, failure) | CRITICAL | Integration test: verify audit records |
| S32 | All state transitions logged (before/after) | HIGH | |
| S33 | All consent events logged (type, version, IP, UA) | CRITICAL | |
| S34 | All admin actions logged at CRITICAL severity | CRITICAL | |
| S35 | CRITICAL events trigger immediate PagerDuty/OpsGenie alert | CRITICAL | Integration test: verify alert fires |
| S36 | Append-only enforcement via DB trigger | HIGH | Migration: verify trigger exists |
| S37 | Monthly partition creation cron | MEDIUM | |
| S38 | 7-year retention with automated purge | MEDIUM | |

### 7.6 Data Protection

| # | Task | Priority | Verification |
|---|------|----------|--------------|
| S39 | All API traffic over TLS 1.3 with HSTS | CRITICAL | Security scan |
| S40 | Never log PII (names, IPs, tokens) | CRITICAL | Code review: audit log statements |
| S41 | Soft delete only — never hard delete user data | HIGH | |
| S42 | GDPR anonymization: first_name → ANONYMIZED, username → NULL | HIGH | Integration test: verify anonymization |
| S43 | Financial records retained after anonymization | HIGH | Integration test: verify retention |
| S44 | Secrets rotation policy documented | HIGH | Documentation |

### 7.7 Bot Abuse Prevention

| # | Task | Priority | Verification |
|---|------|----------|--------------|
| S45 | Require valid initData for every authenticated action | CRITICAL | Unit test: request without initData rejected |
| S46 | Verify Telegram-Client-Data header on sensitive actions | MEDIUM | |
| S47 | Block non-Mini-App contexts (group chats, inline) | MEDIUM | Integration test |
| S48 | Minimum 500ms between action requests (anti-automation) | MEDIUM | |

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Module | Test Case | Coverage Target |
|--------|-----------|-----------------|
| Auth Verification | Valid initData → returns VerifiedUserPayload | 100% |
| Auth Verification | Invalid initData (bad hash) → throws INVALID_INIT_DATA | 100% |
| Auth Verification | Expired auth_date (6min old) → throws AUTH_DATE_EXPIRED | 100% |
| Auth Verification | Replayed query_id → throws NONCE_REUSED | 100% |
| Auth Verification | initData > 4096 bytes → throws INIT_DATA_TOO_LARGE | 100% |
| Auth Verification | HMAC computation within 500ms | Performance test |
| Session Service | Create session → returns tokens + stores hash | 100% |
| Session Service | Validate valid access token → returns session data | 100% |
| Session Service | Validate expired access token → throws TOKEN_EXPIRED | 100% |
| Session Service | Refresh token rotation → old revoked, new issued | 100% |
| Session Service | Theft detection: reuse old token → marks suspected_compromised | 100% |
| Session Service | Max 5 sessions: 6th login → oldest auto-revoked | 100% |
| Session Service | Fingerprint mismatch → re-auth required | 100% |
| User Profile | Create user → all required fields set | 100% |
| User Profile | Upsert: existing user → Telegram fields updated, state preserved | 100% |
| User Profile | State transition: valid transition → state changes | 100% |
| User Profile | State transition: invalid transition → throws error | 100% |
| User Profile | Soft delete → deleted_at set, user still in DB | 100% |
| Onboarding | Initialize progress → phase=welcome, step=welcome_start | 100% |
| Onboarding | Advance step: valid step → step added to completedSteps | 100% |
| Onboarding | Advance step: invalid step (prerequisite not met) → throws | 100% |
| Onboarding | Resume: stalled user → returns correct current step | 100% |
| Education | Module content returned correctly | 100% |
| Education | Quiz answer validation: correct → score increments | 100% |
| Education | Quiz answer validation: out of order → throws | 100% |
| Education | Quiz complete: pass (all correct) → passed=true, score=5/5 | 100% |
| Education | Quiz complete: fail (3/5) → passed=false, retryAllowed=true | 100% |
| Education | Quiz complete: 4th attempt → throws QUIZ_LOCKED | 100% |
| Education | Answer too fast (<5s) → throws ANSWER_TOO_FAST | 100% |
| Education | Module version increment → stale completions detected | 100% |
| Consent | Record consent → row inserted, version tracked | 100% |
| Consent | Duplicate consent (same type + version) → throws DUPLICATE | 100% |
| Consent | Pending consents list → only unrecorded types returned | 100% |
| Consent | Version change detection → CONSENT_EXPIRED triggered | 100% |
| State Engine | Every allowed transition tested | 100% |
| State Engine | Every blocked transition tested (throws) | 100% |
| State Engine | Action authorization: allowed actions pass | 100% |
| State Engine | Action authorization: blocked actions rejected | 100% |
| Fraud Detection | Fingerprint collision detection | 100% |
| Fraud Detection | Same IP multiple accounts → cluster flagged | 100% |
| Referral | Cycle detection: A→B→C→A | 100% |

### 8.2 Integration Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Full auth flow | POST /auth/telegram with valid initData | 200 + JWT + user created |
| Full auth flow | POST /auth/telegram with invalid initData | 401 |
| Full auth flow | POST /auth/telegram with expired auth_date | 401 |
| Full auth flow | POST /auth/telegram with replayed query_id | 401 |
| Token refresh | POST /auth/refresh with valid cookie | 200 + new access token |
| Token refresh | POST /auth/refresh with expired cookie | 401 |
| Token refresh | POST /auth/refresh with revoked cookie | 401 |
| Token refresh | POST /auth/refresh: reuse old token after rotation | 200 + theft warning in response |
| Logout | POST /auth/logout → tokens invalidated | 200, subsequent refresh fails |
| Full onboarding | Create user → complete all steps → state=ACTIVE | End-to-end journey |
| Onboarding resume | Abandon at step 3, return → state resumes correctly | |
| Onboarding stall | No activity 24h → state=ONB_STALLED | Cron job test |
| Education flow | Complete module → progress saved | |
| Quiz flow | Submit 5 answers → complete → score computed | |
| Quiz fail + retry | Fail 3/5 → retry → pass on 2nd attempt | |
| Quiz lock | Fail 3 times → 4th attempt rejected | |
| Consent flow | Record all 4 consents → state=READY_FOR_PLATFORM | |
| Deletion flow | Request deletion → PENDING_DELETION → login cancels → back to ACTIVE | |
| Deletion complete | Request deletion → wait 30 days → DELETED | |
| Geo-blocking | Request from restricted country → 403 | |
| Rate limiting | Exceed auth rate limit → 429 | |
| Concurrent auth | 2 simultaneous auth requests for same user | Should succeed |
| Database failure | Kill PostgreSQL during auth → graceful error | |

### 8.3 Security Tests

| Test | Scenario | Expected |
|------|----------|----------|
| InitData forgery | Generate initData with wrong bot token | HMAC fails, 401 |
| InitData replay | Capture valid initData, replay after 5min | Nonce check fails, 401 |
| Token theft | Steal access token, use from different IP | Fingerprint mismatch, 401 |
| Token brute-force | Rapid GET /auth/refresh with random tokens | Rate limited after 5 failures |
| Session injection | Attempt to set refresh_token cookie with forged value | Signature validation fails |
| XSS | Inject JS in first_name, render in profile | Escaped output, no XSS |
| Mass account creation | Rapid POST /auth/telegram from different IPs | Rate limited per IP + geo |
| Quiz automation | Submit quiz answers at 100ms intervals | ANSWER_TOO_FAST error |
| Step skipping | POST /onboarding/step with stepId that skips 3 modules | INVALID_STEP_TRANSITION |
| Consent forgery | POST /consent/tos_acceptance with wrong version | Version validated against active ToS |

### 8.4 User Journey Tests

| Journey | Steps | Success Criteria |
|---------|-------|-----------------|
| Happy path: new user | /start → language → welcome → 9 modules → quiz pass → 4 consents → confirm → mine | User reaches ACTIVE state |
| Happy path: returning user | /start → auth → dashboard with balance | User sees correct state |
| Stalled resume | Start onboarding, wait 24h, return | User resumes at correct step |
| Quiz fail | Fail quiz 3 times | User locked, support contact shown |
| Account freeze | Send /freeze | All sessions revoked, state=FROZEN |
| Deletion + cancellation | Request deletion, login within 30 days | State back to previous |
| Deletion complete | Request deletion, wait 30 days | Personal data anonymized |
| Referral join | User A invites User B → B completes onboarding | A gets referral credited |
| Multiple devices | Auth from mobile, then desktop | Sessions tracked separately |
| Bot blocked | User blocks bot | blocked_bot=true, no more nudges |

---

## 9. Development Order

### Phase 0: Foundation (Week 1-2)

**Goal:** Infrastructure and project scaffold that everything else depends on.

**Tasks:**
- Set up NestJS project in `services/api/` with module structure
- Configure ConfigModule with env validation
- Set up Prisma with PostgreSQL connection
- Set up Redis connection
- Set up BullMQ
- Set up secrets manager integration (Vault or cloud-native)
- Set up CI/CD pipeline (build, lint, test)
- Create base Docker Compose for local dev (PostgreSQL, Redis, API)
- Create migration M001 (enums + users table)
- Create migration M002 (telegram_accounts)

**Deliverables:** Running NestJS app with database connectivity, CI/CD pipeline, local dev environment.

**Testing:** Infrastructure tests only (is DB reachable, does Prisma generate).

---

### Phase 1: Auth Core (Week 3-4)

**Goal:** Users can authenticate via Telegram and receive JWT tokens.

**Tasks:**
- Module 1: Telegram Auth Verification Service + controller
- Module 2: Session & JWT Service (creation, validation, refresh)
- Migration M003 (sessions table)
- POST /auth/telegram endpoint
- POST /auth/refresh endpoint
- POST /auth/logout endpoint
- Auth middleware (initData verification)
- JwtAuthGuard (access token validation)
- StateGuard (state-based action gating — initial version)
- Redis session cache
- Rate limiting middleware (Redis-based)
- InitData nonce deduplication (Redis)
- Error filters (HttpException, Prisma)

**Deliverables:** Working auth flow. Users can authenticate, get tokens, refresh tokens, and log out.

**Testing:** Unit tests for all auth logic. Integration tests for all 3 auth endpoints. Security tests for initData forgery, replay, token theft.

---

### Phase 2: User Profile & Basic State (Week 5)

**Goal:** User profiles created, basic state machine operational.

**Tasks:**
- Module 3: User Profile Service
- POST /auth/telegram user upsert logic
- GET /users/me endpoint
- PATCH /users/me endpoint (language preference)
- DELETE /users/me endpoint (soft delete with 30-day grace)
- State machine engine (transition validation, authorization)
- StateGuard full implementation

**Deliverables:** User CRUD, state transitions enforced. NEW → ONB_WELCOME auto-transition on first auth.

**Testing:** Profile CRUD tests, state transition tests, blocked action tests.

---

### Phase 3: Onboarding Engine (Week 6-7)

**Goal:** Users can progress through the onboarding flow with state tracking.

**Tasks:**
- Module 5: Onboarding State Engine
- Migration M004 (onboarding_progress table)
- GET /onboarding/state endpoint
- POST /onboarding/step endpoint
- Onboarding step validation (prerequisites enforced server-side)
- Welcome phase steps (welcome_start → welcome_complete)
- Stalled detection cron (daily check for 24h inactivity)
- Nudge schedule cron (3h, 12h, 48h)
- ONB_STALLED state resume logic

**Deliverables:** Onboarding flow from NEW → ONB_WELCOME → ONB_EDUCATION. State transitions enforced.

**Testing:** Full onboarding step advancement tests. Stalled detection + resume tests.

---

### Phase 4: Education System (Week 8-10)

**Goal:** Users can complete education modules and quiz.

**Tasks:**
- Module 6: Education Service
- Migration M005 (education_modules + seed data)
- Migration M006 (education_completions table)
- Seed script for 9 modules (crypto_basics through quiz)
- GET /education/modules endpoint
- GET /education/modules/:id endpoint
- POST /education/progress endpoint
- POST /education/quiz/answer endpoint
- POST /education/quiz/complete endpoint
- Quiz engine (validation, scoring, retry logic, attempts cap)
- Module versioning (detect stale completions)
- Education score computation
- GET /education/score endpoint
- Event: education.module_completed
- Event: education.all_modules_completed
- Offline-first: pre-cache module content on auth

**Deliverables:** Complete education flow. Users go through all 9 modules, take quiz, get scored.

**Testing:** Module progress tests, quiz answer validation, score computation, retry limiting, version staleness.

---

### Phase 5: Consent & Trust (Week 11-12)

**Goal:** Users record individual consents, reach ELIGIBLE state, get education score.

**Tasks:**
- Module 7: Consent Service
- Migration M007 (user_consents table)
- GET /consent/pending endpoint
- GET /consent/status endpoint
- POST /consent/:type endpoint
- Consent version tracking (ToS updates trigger re-consent)
- CONSENT_PENDING state integration
- READY_FOR_PLATFORM → ELIGIBLE transition (user clicks "Enter")
- ELIGIBLE → ACTIVE transition (first platform action)
- Education score displayed on profile
- Module 8: Audit Service
- Migration M008 (audit_events table)
- BullMQ audit queue + worker
- Event consumption from all other modules
- Monthly partition management

**Deliverables:** Full onboarding funnel complete. Users can reach ACTIVE state.

**Testing:** Full end-to-end onboarding journey test. Consent recording + re-consent tests. Audit event verification.

---

### Phase 6: Fraud Detection (Week 13-14)

**Goal:** Abuse detection and prevention operational.

**Tasks:**
- Module 10: Fraud Detection Service
- Migration M009 (user_fingerprints table)
- Migration M011 (security_events table)
- Real-time Fraud Guard middleware (fingerprint check, velocity check)
- Batch Fraud Analyzer (hourly: IP clustering, referral graph cycles)
- Fingerprint collision detection event
- Account auto-suspension logic
- FROZEN state implementation
- SUSPENDED state implementation
- Migration M010 (recovery_codes table)
- Recovery code generation (given during onboarding)
- /freeze bot command handler
- Unfreeze flow (support verification)

**Deliverables:** Fraud detection operational. Suspicious accounts flagged, auto-suspended.

**Testing:** Fingerprint collision tests, cluster analysis tests, auto-suspension tests, freeze/unfreeze tests.

---

### Phase 7: Notifications (Week 15)

**Goal:** Telegram bot messages, nudges, and notification delivery operational.

**Tasks:**
- Module 9: Notification Service
- Migration M012 (notification_templates + seed data)
- BullMQ notification queue + worker
- Telegram Bot API integration with rate limiting
- Template rendering with localization
- blocked_bot tracking
- Nudge message delivery (3h, 12h, 48h)
- Security alert delivery (freeze confirmation, suspension notice)
- Welcome message delivery (on onboarding completion)
- Dead letter queue for failed deliveries

**Deliverables:** All notification flows working. Users receive timely, localized messages.

**Testing:** Template rendering tests, rate limit enforcement tests, blocked_bot handling tests.

---

### Phase 8: Hardening (Week 16)

**Goal:** Production readiness.

**Tasks:**
- Load testing (k6): 1000 concurrent auth flows, 5000 concurrent requests
- Performance optimization (query tuning, Redis cache tuning)
- Security scan (SAST, dependency audit)
- Monitoring dashboards (Grafana: auth success rate, onboarding funnel, fraud alerts)
- Alerting rules (CRITICAL event rate > 0, error rate > 1%, p99 latency > 500ms)
- Documentation: runbooks for auth outages, fraud events, consent version changes
- Final security review

**Deliverables:** Production-ready system with monitoring, alerting, runbooks.

---

## 10. Engineering Tickets

### Ticket Format

```
TICKET-001: [Module] [Short Description]
  Priority: P0/P1/P2
  Dependencies: TICKET-xxx
  Description: ...
  Acceptance Criteria:
    - ...
```

---

### Phase 0 Tickets

```
TICKET-001: [Infra] Set up NestJS project scaffold
  Priority: P0
  Dependencies: None
  Description: Create services/api/ NestJS app with module structure, ConfigModule,
    global filters, interceptors, guards. Set up pnpm workspace integration.
  Acceptance Criteria:
    - `pnpm nx serve api` starts NestJS on port 3000
    - Health endpoint GET /health returns 200
    - Module structure mirrors doc: auth/, user/, onboarding/, education/, consent/
    - Global exception filter returns { success, error } format
    - Transform interceptor wraps responses in { success, data }

TICKET-002: [Infra] Configure Prisma with PostgreSQL
  Priority: P0
  Dependencies: TICKET-001
  Description: Set up Prisma ORM with PostgreSQL connection. Create initial schema
    with User and TelegramAccount models. Create migration M001 + M002.
  Acceptance Criteria:
    - Prisma generates client
    - Migration creates users and telegram_accounts tables
    - Seed script can insert test data
    - Database URL from env, validated by ConfigModule

TICKET-003: [Infra] Set up Redis connection
  Priority: P0
  Dependencies: TICKET-001
  Description: Configure Redis client for session caching, rate limiting, BullMQ.
  Acceptance Criteria:
    - RedisModule connects to Redis on app startup
    - Cache service can get/set with TTL
    - Connection failure is graceful (app starts, health endpoint reports Redis down)

TICKET-004: [Infra] Set up BullMQ
  Priority: P0
  Dependencies: TICKET-003
  Description: Configure BullMQ queues for audit, notification, onboarding-cron.
  Acceptance Criteria:
    - Queue definitions exist for audit-queue, notification-queue, onboarding-cron
    - Worker can process jobs
    - Dead letter queue configured
    - Failed jobs logged and alert sent

TICKET-005: [Infra] Secrets manager integration
  Priority: P0
  Dependencies: TICKET-001
  Description: Integrate Vault (or cloud-native) for secrets. Bot token, JWT keys,
    DB credentials from secrets manager, never from env vars.
  Acceptance Criteria:
    - Bot token loaded from secrets manager at startup
    - JWT private key loaded from secrets manager
    - Fallback to env vars in dev mode with warning
    - Secrets never logged
```

### Phase 1 Tickets

```
TICKET-006: [Auth] Telegram initData verification logic
  Priority: P0
  Dependencies: TICKET-005
  Description: Implement HMAC-SHA256 verification algorithm. Accept raw initData
    string, parse query params, sort alphabetically (excl hash), compute HMAC,
    compare. Enforce 5min auth_date tolerance. Enforce 4096 byte limit.
  Acceptance Criteria:
    - verifyTelegramInitData(validInitData, botToken) returns true
    - verifyTelegramInitData(invalidInitData, botToken) returns false
    - auth_date older than 5min returns false
    - initData > 4096 bytes returns false
    - HMAC computation completes within 500ms
    - query_id nonce stored in Redis with 5min TTL
    - Replayed query_id returns false

TICKET-007: [Auth] Session service — token creation and validation
  Priority: P0
  Dependencies: TICKET-002, TICKET-003, TICKET-006
  Description: Implement SessionService. createSession: generate access token
    (RS256 JWT, 5min), refresh token (128-bit hex). Store refresh token as SHA-256
    in sessions table. validateAccessToken: verify RS256 signature, check expiry.
    refreshSession: validate old refresh, issue new pair, revoke old.
  Acceptance Criteria:
    - createSession returns { accessToken, refreshToken }
    - Access token contains { sub: userId, role, sessionId, iat, exp }
    - validateAccessToken(validToken) → payload
    - validateAccessToken(expiredToken) → throws TOKEN_EXPIRED
    - validateAccessToken(invalidSignature) → throws TOKEN_INVALID
    - refreshSession(validToken) → new tokens, old revoked
    - refreshSession(revokedToken) → marks suspected_compromised on session
    - MAx 5 sessions per user — 6th revokes oldest

TICKET-008: [Auth] POST /auth/telegram endpoint
  Priority: P0
  Dependencies: TICKET-006, TICKET-007
  Description: Implement auth controller. Accept { initData }, verify via
    AuthVerificationService, lookup/create user via UserProfileService, create
    session via SessionService. Set refresh_token cookie. Return access token
    + user profile + onboarding state.
  Acceptance Criteria:
    - First-time user: creates user, telegram_account, onboarding_progress
    - Returning user: updates Telegram fields, returns existing state
    - Invalid initData: 401 with INVALID_INIT_DATA
    - Expired auth_date: 401 with AUTH_DATE_EXPIRED
    - Replay: 401 with NONCE_REUSED
    - Rate limit: 429 after 10 req/min/IP
    - Response includes set-cookie header for refresh_token

TICKET-009: [Auth] POST /auth/refresh endpoint
  Priority: P0
  Dependencies: TICKET-007
  Description: Implement refresh endpoint. Read refresh_token from cookie, validate,
    rotate. Issue new access + refresh. Update cookie.
  Acceptance Criteria:
    - Valid refresh → 200 + new access token
    - Expired refresh → 401 SESSION_EXPIRED
    - Revoked refresh (theft detected) → 200 + securityWarning in response
    - Rate limit: 429 after 5 req/min/IP, 3 req/min/user
    - Cookie attributes: HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth

TICKET-010: [Auth] POST /auth/logout endpoint
  Priority: P0
  Dependencies: TICKET-007
  Description: Revoke current session. Clear refresh cookie.
  Acceptance Criteria:
    - Session.is_active = false
    - Refresh cookie cleared
    - Subsequent refresh attempts fail

TICKET-011: [Auth] JwtAuthGuard
  Priority: P0
  Dependencies: TICKET-007
  Description: NestJS guard that extracts Authorization: Bearer token, validates
    via SessionService, attaches user to request. Fail with 401 on invalid/expired.
  Acceptance Criteria:
    - Valid token → request.user set
    - No token → 401
    - Invalid token → 401
    - Expired token → 401 TOKEN_EXPIRED

TICKET-012: [Auth] Rate limiting middleware
  Priority: P0
  Dependencies: TICKET-003
  Description: Redis-based sliding window rate limiter. Configurable limits per
    route. Applied globally with per-route overrides.
  Acceptance Criteria:
    - Limits enforced consistently across horizontal instances
    - 429 response includes Retry-After header
    - Configurable: window size, max requests, key prefix
```

### Phase 2 Tickets

```
TICKET-013: [User] User Profile Service
  Priority: P0
  Dependencies: TICKET-002
  Description: Implement UserProfileService. createUser: insert with Telegram data.
    upsertUser: find by Telegram ID, update if exists, create if not.
    updateUser: partial update of allowed fields. softDeleteUser: set deleted_at.
    transitionUserState: validate + execute state transition, emit audit event.
  Acceptance Criteria:
    - createUser creates user with state=NEW
    - upsertUser: existing user updates firstName/lastName/username
    - upsertUser: new user creates with state=NEW
    - transitionUserState: valid transition → state changes
    - transitionUserState: invalid transition → throws INVALID_TRANSITION
    - softDeleteUser: sets deleted_at, does not remove row
    - All operations emit audit events

TICKET-014: [User] GET, PATCH, DELETE /users/me
  Priority: P1
  Dependencies: TICKET-013
  Description: Implement user endpoints. GET returns profile. PATCH updates
    languageCode. DELETE initiates soft-delete with 30-day grace period.
  Acceptance Criteria:
    - GET /users/me returns user profile (no sensitive fields)
    - PATCH /users/me updates languageCode
    - PATCH /users/me rejects invalid fields
    - DELETE /users/me sets deletion_requested_at, state=PENDING_DELETION
    - Auth on PENDING_DELETION cancels deletion, restores previous state

TICKET-015: [State] State machine engine
  Priority: P0
  Dependencies: TICKET-013
  Description: Implement StateMachineService. Central state transition validation.
    STSTE_MACHINE config object with all transitions, triggers, blocked actions.
    canTransition(currentState, targetState) → boolean.
    getBlockedActions(state) → string[].
  Acceptance Criteria:
    - All allowed transitions from STATE_MACHINE config pass
    - All invalid transitions fail
    - getBlockedActions returns correct list per state
    - Action authorization: allow/block logic correct

TICKET-016: [State] StateGuard implementation
  Priority: P0
  Dependencies: TICKET-015
  Description: NestJS guard that checks user state against required state for
    each endpoint. Decorators: @RequireState('ACTIVE'), @BlockedInState('FROZEN').
  Acceptance Criteria:
    - @RequireState('ACTIVE'): only ACTIVE users can access
    - @BlockedInState('SUSPENDED'): SUSPENDED users get 403
    - Error response includes STATE_BLOCKED code
```

### Phase 3 Tickets

```
TICKET-017: [Onboarding] Onboarding service
  Priority: P0
  Dependencies: TICKET-013, TICKET-015
  Description: Implement OnboardingService. initializeOnboarding: create
    onboarding_progress row with phase=welcome, step=welcome_start.
    advanceStep: validate prerequisite step completed, add to completedSteps,
    update currentStep, return next steps. getState: return current phase,
    step, progress %. resumeOnboarding: return to last active step.
  Acceptance Criteria:
    - initializeOnboarding creates row with correct defaults
    - advanceStep: valid step is recorded
    - advanceStep: invalid step (prerequisite missing) throws error
    - advanceStep: completes all steps in phase → auto-advance phase
    - getState returns correct progress %
    - resumeOnboarding returns last active step for returning user

TICKET-018: [Onboarding] GET /onboarding/state + POST /onboarding/step
  Priority: P0
  Dependencies: TICKET-017
  Description: Implement onboarding endpoints. GET returns current onboarding
    position. POST advances to next step.
  Acceptance Criteria:
    - GET returns currentPhase, currentStep, completedSteps, progress
    - POST with valid stepId advances state
    - POST with invalid stepId throws INVALID_STEP_TRANSITION
    - POST with missing prerequisite throws PREREQUISITE_NOT_MIT
    - Rate limited: 10 req/min

TICKET-019: [Onboarding] Stalled detection cron
  Priority: P1
  Dependencies: TICKET-017
  Description: BullMQ recurring job (every 6h). Find users in onboarding state
    with last_active_at > 24h. Transition to ONB_STALLED. Queue nudge notification.
  Acceptance Criteria:
    - Cron finds users with 24h+ inactivity in ONB states
    - Transitions them to ONB_STALLED
    - Queues nudge notification for each
    - Does not re-nudge already-stalled users
    - Logs count of stalled users
```

### Phase 4 Tickets

```
TICKET-020: [Education] Education module seed data
  Priority: P0
  Dependencies: TICKET-002
  Description: Create education_modules table and seed script. 9 modules with
    content (slides, quiz questions). All mandatory except marketing_opt_in.
  Acceptance Criteria:
    - 9 modules seeded: crypto_basics, welcome, platform, funds, actions,
      risks, withdrawal, myths, quiz
    - Each module has localized content (en + ru)
    - Quiz has 5 questions, 80% threshold (100% on risk questions)
    - order_index correctly sequenced
    - Version set to 1

TICKET-021: [Education] Education service
  Priority: P0
  Dependencies: TICKET-020, TICKET-002
  Description: Implement EducationService. getModules: list all with user
    progress. getModuleContent: return slides/questions for module ID.
    updateProgress: save current slide index. submitAnswer: validate single
    quiz answer, check sequence, record. completeQuiz: finalize attempt,
    compute score, check pass threshold, enforce 3-attempt cap.
  Acceptance Criteria:
    - getModules returns modules with per-user progress status
    - getModuleContent returns correct content for module ID
    - updateProgress saves resume point
    - submitAnswer: correct → increments score
    - submitAnswer: out of order → throws
    - submitAnswer: duplicate question → throws
    - submitAnswer: <5s → throws ANSWER_TOO_FAST
    - completeQuiz: 5/5 or 4/5 (80%) → passed=true
    - completeQuiz: 3/5 → passed=false, retryAllowed=true
    - completeQuiz: 4th attempt → throws QUIZ_LOCKED
    - Education score computed on all modules complete

TICKET-022: [Education] Education API endpoints
  Priority: P0
  Dependencies: TICKET-021
  Description: Wire up education endpoints with guards and rate limiting.
  Acceptance Criteria:
    - GET /education/modules returns list with progress
    - GET /education/modules/:id returns content
    - POST /education/progress updates slide index
    - POST /education/quiz/answer validates and records
    - POST /education/quiz/complete computes and returns result
    - GET /education/score returns computed score

TICKET-023: [Education] Module versioning and staleness detection
  Priority: P1
  Dependencies: TICKET-021
  Description: When education module content changes (version increments), detect
    users who completed old version. Mark as stale, flag for re-completion.
  Acceptance Criteria:
    - Staleness detected on next auth after version increment
    - User sees "Updated content available" message
    - Must re-complete module to restore education score

TICKET-024: [Education] Offline-first content caching
  Priority: P2
  Dependencies: TICKET-021
  Description: On auth, pre-cache all education module content URLs to CDN.
    Bundle module content metadata in auth response for immediate display.
  Acceptance Criteria:
    - Auth response includes module list with content URLs
    - Module content loaded from CDN, not API server
    - Cache headers set for long browser caching
    - Versioned URLs for cache busting
```

### Phase 5 Tickets

```
TICKET-025: [Consent] Consent service
  Priority: P0
  Dependencies: TICKET-002
  Description: Implement ConsentService. recordConsent: insert row with type,
    version, document hash, IP, UA, session. getPendingConsents: return types
    not yet recorded for current version. checkAllRequiredComplete: boolean
    if all mandatory consents recorded. detectVersionChange: compare current
    ToS/privacy version against user's last consent version.
  Acceptance Criteria:
    - recordConsent creates row with all required fields
    - Duplicate (type + version) throws DUPLICATE_CONSENT
    - getPendingConsents returns only unrecorded types
    - checkAllRequiredComplete: true when all 4 mandatory consents exist
    - detectVersionChange: ToS v1.1 → v1.2 triggers CONSENT_EXPIRED
    - Consents expire on version change, not annually (no annual expiry)

TICKET-026: [Consent] Consent API endpoints
  Priority: P0
  Dependencies: TICKET-025
  Description: Wire up consent endpoints.
  Acceptance Criteria:
    - GET /consent/pending returns list
    - GET /consent/status returns all types with granted status
    - POST /consent/:type records consent
    - POST /consent/:type with invalid type throws 400
    - POST /consent/risk_acknowledgement creates audit trail

TICKET-027: [Audit] Audit service
  Priority: P0
  Dependencies: TICKET-003, TICKET-002
  Description: Implement AuditService. writeEvent: push to BullMQ audit queue
    with severity classification. Worker: batch write to audit_events table
    (every 30s for INFO, immediate for CRITICAL). Monthly partition management.
  Acceptance Criteria:
    - writeEvent pushes to correct queue priority
    - INFO events batched every 30s
    - CRITICAL events written immediately
    - Failed writes retried 3x, then dead letter
    - Monthly partitions created automatically
    - Append-only trigger on audit_events table
```

### Phase 6 Tickets

```
TICKET-028: [Fraud] Fingerprint management
  Priority: P1
  Dependencies: TICKET-003, TICKET-002
  Description: On every auth, compute device fingerprint hash from user-agent +
    IP prefix + header fingerprint. Store in user_fingerprints table. Check for
    collisions across user_ids.
  Acceptance Criteria:
    - Fingerprint computed on every auth
    - New fingerprint for existing user → upsert
    - Existing fingerprint for different user → SECURITY_FINGERPRINT_COLLISION event
    - Redis cache for fast fingerprint lookup (TTL 1h)

TICKET-029: [Fraud] Real-time fraud guard
  Priority: P1
  Dependencies: TICKET-028
  Description: NestJS middleware that runs on every authenticated request.
    Check: fingerprint mismatch with session, velocity (unusual number of actions),
    geo-velocity (login from US then China in 5min).
  Acceptance Criteria:
    - Runs on every request, < 100ms overhead
    - Fingerprint mismatch → 401 with re-auth required
    - Geo-velocity anomaly → security event, no block (informational)
    - High action velocity → rate limit
    - All checks pass-through (no false positives)

TICKET-030: [Fraud] Batch fraud analyzer
  Priority: P1
  Dependencies: TICKET-028
  Description: BullMQ recurring job (hourly + daily). Hourly: IP clustering
    (>3 accounts from /24 subnet), withdrawal address reuse. Daily: referral
    graph cycle detection, behavioral similarity analysis.
  Acceptance Criteria:
    - Hourly job flags IP clusters with 3+ accounts
    - Daily job detects referral cycles (A→B→C→A)
    - Withdrawal address reuse across users flagged
    - Findings written to security_events
    - Auto-suspension triggered for HIGH confidence clusters

TICKET-031: [Fraud] FROZEN and SUSPENDED states
  Priority: P1
  Dependencies: TICKET-015, TICKET-030
  Description: Implement FROZEN state (emergency freeze) and SUSPENDED state
    (temporary suspension with appeal). FROZEN: all sessions revoked, all actions
    blocked except support contact. SUSPENDED: appeal form accessible.
  Acceptance Criteria:
    - FROZEN blocks all API requests
    - SUSPENDED blocks all except GET /appeal
    - Transition to FROZEN revokes all active sessions
    - FROZEN → ACTIVE requires admin action
    - SUSPENDED → ACTIVE: appeal approved by admin
    - SUSPENDED → BANNED: appeal denied

TICKET-032: [Fraud] Recovery codes and /freeze
  Priority: P1
  Dependencies: TICKET-031
  Description: Generate 10 one-time recovery codes during onboarding. Store as
    SHA-256. Accept code in lieu of initData for auth if Telegram is down.
    Implement /freeze bot command handler.
  Acceptance Criteria:
    - 10 recovery codes generated and shown to user during onboarding
    - Codes stored as SHA-256 in recovery_codes table
    - Code can be used for emergency auth (bypasses initData)
    - Used code marked is_used=true
    - Code expires after 1 year
    - /freeze command transitions user to FROZEN state
    - /freeze sends confirmation message before executing
```

### Phase 7 Tickets

```
TICKET-033: [Notify] Notification service
  Priority: P1
  Dependencies: TICKET-003, TICKET-002
  Description: Implement NotificationService. sendNotification: queue message
    for delivery. Worker: rate-limited Telegram Bot API dispatch (30/s global,
    1/s per chat). Template rendering with variable substitution. Localization.
    blocked_bot detection.
  Acceptance Criteria:
    - sendNotification queues message with priority
    - Worker dispatches via Telegram Bot API
    - Rate limit: 30/s global, 1/s per chat enforced via Redis counters
    - Templates render with variables substituted
    - blocked_bot=true: skip dispatch, log warning
    - Failed deliveries: retry 3x, then dead letter
    - CRITICAL priority bypasses rate limit

TICKET-034: [Notify] Nudge message templates and schedules
  Priority: P1
  Dependencies: TICKET-033
  Description: Create nudge templates (3h, 12h, 48h). Wire up to stalled
    detection cron. Priority: lower than security notifications.
  Acceptance Criteria:
    - Templates exist for 3h, 12h, 48h nudges (localized)
    - Nudges only sent if blocked_bot = false
    - After 48h nudge with "No thanks": stop nudges permanently
    - Nudge sends user's current step in message
```

### Phase 8 Tickets

```
TICKET-035: [Infra] Load testing
  Priority: P2
  Dependencies: All Phase 0-6
  Description: Write k6 scripts for auth flow, onboarding flow, token refresh.
    Target: 1000 concurrent auth flows, 5000 concurrent API requests.
  Acceptance Criteria:
    - Auth: p99 < 500ms at 1000 concurrent
    - Refresh: p99 < 300ms at 500 concurrent
    - Onboarding step: p99 < 300ms at 500 concurrent
    - No 5xx errors under load
    - No rate limit false positives under normal load

TICKET-036: [Infra] Monitoring and alerting
  Priority: P2
  Dependencies: All Phase 0-6
  Description: Grafana dashboards for auth funnel, onboarding funnel, fraud
    events. Alert rules for: error rate > 1%, p99 latency > 500ms, CRITICAL
    audit events, rate limit threshold breaches.
  Acceptance Criteria:
    - Dashboard: auth success/failure rate over time
    - Dashboard: onboarding funnel (users at each stage)
    - Dashboard: fraud events by type + severity
    - Alert: error rate spike > 1% in 5min window
    - Alert: p99 auth latency > 500ms
    - Alert: any CRITICAL audit event
    - Alert: rate limiter threshold exceeded (>90% of limit)
```

---

## Appendix: File Structure

```
services/api/src/
├── app.module.ts
├── main.ts
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── state.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   └── transform.interceptor.ts
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   └── prisma-exception.filter.ts
│   └── decorators/
│       ├── require-state.decorator.ts
│       └── blocked-in-state.decorator.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth-verification.service.ts
│   │   ├── session.service.ts
│   │   ├── dto/
│   │   │   ├── auth-telegram.dto.ts
│   │   │   └── auth-refresh.dto.ts
│   │   └── strategies/
│   │       └── init-data.strategy.ts
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user-state.service.ts (state machine)
│   ├── onboarding/
│   │   ├── onboarding.module.ts
│   │   ├── onboarding.controller.ts
│   │   ├── onboarding.service.ts
│   │   └── cron/
│   │       └── stalled-detection.cron.ts
│   ├── education/
│   │   ├── education.module.ts
│   │   ├── education.controller.ts
│   │   ├── education.service.ts
│   │   ├── quiz-engine.service.ts
│   │   └── seed/
│   │       └── education-modules.seed.ts
│   ├── consent/
│   │   ├── consent.module.ts
│   │   ├── consent.controller.ts
│   │   └── consent.service.ts
│   ├── audit/
│   │   ├── audit.module.ts
│   │   ├── audit.service.ts
│   │   └── worker/
│   │       └── audit-writer.worker.ts
│   ├── notification/
│   │   ├── notification.module.ts
│   │   ├── notification.service.ts
│   │   ├── template.service.ts
│   │   └── worker/
│   │       └── notification-dispatcher.worker.ts
│   └── fraud/
│       ├── fraud.module.ts
│       ├── fraud-guard.middleware.ts
│       ├── fraud-detection.service.ts
│       └── workers/
│           ├── cluster-analyzer.worker.ts
│           └── graph-analyzer.worker.ts
├── config/
│   └── config.module.ts
└── database/
    ├── prisma/
    │   └── schema.prisma
    └── migrations/
```
