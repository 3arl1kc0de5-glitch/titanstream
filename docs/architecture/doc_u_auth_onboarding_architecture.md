# Document U: Authentication & Onboarding System Architecture

> **Status:** Draft v1.0
> **Design Authority:** Senior Fintech Product Architect
> **Scope:** Authentication, onboarding, education, trust, and user-state infrastructure for TitanStream, a Telegram-native financial application.

---

## Table of Contents

1. [High-Level Architecture Diagram](#1-high-level-architecture-diagram)
2. [Authentication Architecture](#2-authentication-architecture)
3. [User Lifecycle State Machine](#3-user-lifecycle-state-machine)
4. [Education Engine](#4-education-engine)
5. [Telegram Conversational Onboarding Flow](#5-telegram-conversational-onboarding-flow)
6. [Trust System Design](#6-trust-system-design)
7. [Database Architecture](#7-database-architecture)
8. [Backend Service Architecture](#8-backend-service-architecture)
9. [Security Model](#9-security-model)
10. [Event Architecture](#10-event-architecture)
11. [API Design](#11-api-design)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. High-Level Architecture Diagram

```
                                  ┌─────────────────────────────────────────────┐
                                  │              TELEGRAM CLOUD                │
                                  │  (Bot API + Mini App Platform)             │
                                  └──────────┬──────────────────┬──────────────┘
                                             │                  │
                    Mini App InitData   ─────┤                  ├───── Bot Messages
                    (auth credentials)        │                  │     (onboarding)
                                             ▼                  ▼
                            ┌─────────────────────────────────────────┐
                            │         CLOUDFLARE / NGINX             │
                            │    (TLS Termination, Rate Limiting)    │
                            └────────────────┬────────────────────────┘
                                             │
                                             ▼
                     ┌───────────────────────────────────────────────────┐
                     │           TITANSTREAM API GATEWAY               │
                     │         (NestJS — services/api/)                 │
                     │                                                   │
                     │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
                     │  │   Auth   │ │   User   │ │   Onboarding     │  │
                     │  │ Middleware│ │  Service │ │   Service        │  │
                     │  │(InitData │ │          │ │                  │  │
                     │  │ Verify)  │ │          │ │                  │  │
                     │  └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
                     │       │            │                 │            │
                     │  ┌────▼─────┐ ┌────▼─────┐ ┌────────▼─────────┐  │
                     │  │  Auth N  │ │Education │ │   Trust/Consent  │  │
                     │  │  Service │ │ Service  │ │   Service        │  │
                     │  └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
                     └───────┼────────────┼──────────────────┼───────────┘
                             │            │                  │
              ┌──────────────┼────────────┼──────────────────┼──────────────┐
              │              ▼            ▼                  ▼              │
              │     ┌──────────────────────────────────────────────┐       │
              │     │              REDIS CLUSTER                   │       │
              │     │  (Sessions, Cache, Rate Limiter, BullMQ)    │       │
              │     └──────────────────┬───────────────────────────┘       │
              │                        │                                   │
              │     ┌──────────────────▼───────────────────────────┐       │
              │     │          POSTGRESQL (Primary)                │       │
              │     │  users | telegram_accounts | sessions        │       │
              │     │  onboarding_progress | education_modules     │       │
              │     │  education_completion | user_consents        │       │
              │     │  audit_events | wallets | mining_sessions    │       │
              │     └──────────────────────────────────────────────┘       │
              │                                                            │
              │     ┌──────────────────────────────────────────────┐       │
              │     │         BULLMQ WORKER POOL                    │       │
              │     │  (onboarding-worker, notification-worker,    │       │
              │     │   referral-worker, quest-worker)             │       │
              │     └──────────────────────────────────────────────┘       │
              └────────────────────────────────────────────────────────────┘
```

**Data Flow Summary:**

| Step | Component | Description |
|------|-----------|-------------|
| 1 | Telegram Client | User opens Mini App → `initData` sent via POST |
| 2 | Auth Middleware | HMAC-SHA256 verification of initData signature |
| 3 | Auth Service | JWT generation, user lookup/creation, session creation |
| 4 | Onboarding Service | State machine routing, step resolution |
| 5 | Education Service | Module delivery, comprehension checks |
| 6 | Trust/Consent Service | Acknowledgement tracking, risk disclosure logging |
| 7 | Notification Service | Telegram bot message dispatch for conversational flow |
| 8 | Worker Pool | Async processing for referrals, notifications, quests |

---

## 2. Authentication Architecture

### 2.1 Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌────────────┐     ┌───────────┐
│Telegram  │     │  API Gateway  │     │Auth Service│     │PostgreSQL │
│  Client  │     │              │     │            │     │           │
└────┬─────┘     └──────┬───────┘     └─────┬──────┘     └─────┬─────┘
     │                  │                    │                  │
     │ 1. Open Mini App │                    │                  │
     │─────────────────>│                    │                  │
     │                  │                    │                  │
     │ 2. POST /auth    │                    │                  │
     │    {initData}    │                    │                  │
     │─────────────────>│                    │                  │
     │                  │ 3. Verify InitData │                  │
     │                  │  (HMAC-SHA256)     │                  │
     │                  │───────────────────>│                  │
     │                  │                    │                  │
     │                  │ 4. Parse:          │                  │
     │                  │    auth_date       │                  │
     │                  │    id, first_name, │                  │
     │                  │    username,       │                  │
     │                  │    hash,           │                  │
     │                  │    start_param     │                  │
     │                  │                    │                  │
     │                  │ 5. Check replay:  │                  │
     │                  │    now - auth_date │                  │
     │                  │    < 24h?          │                  │
     │                  │                    │                  │
     │                  │ 6. Lookup user     │                  │
     │                  │──────────────────────────────────────>│
     │                  │                    │                  │
     │                  │    [User exists]   │                  │
     │                  │<──────────────────────────────────────│
     │                  │                    │                  │
     │                  │ 7. Update:         │                  │
     │                  │    last_seen,      │                  │
     │                  │    language_code   │                  │
     │                  │──────────────────────────────────────>│
     │                  │                    │                  │
     │                  │ 8. Create session  │                  │
     │                  │  + JWT + Refresh   │                  │
     │                  │<───────────────────│                  │
     │                  │                    │                  │
     │ 9. 200 OK:      │                    │                  │
     │  {access_token,  │                    │                  │
     │   refresh_cookie,│                    │                  │
     │   user_profile,  │                    │                  │
     │   onboarding_state}                   │                  │
     │<─────────────────│                    │                  │
     │                  │                    │                  │
     │ 10. Store token  │                    │                  │
     │  in memory       │                    │                  │
     │  (not localStorage)                   │                  │
```

### 2.2 Identity Verification Process

The system does **not** perform KYC/ID verification at this stage. Identity is established through:

| Factor | Mechanism | Assurance Level |
|--------|-----------|-----------------|
| Telegram Identity | HMAC-SHA256 signed initData — cryptographically proves the user is who Telegram says they are | High (within Telegram ecosystem) |
| Device Binding | Session fingerprint (user-agent, IP, Telegram client hash) | Medium |
| Behavioral | Mining patterns, referral graph, usage consistency | Low-Medium |

**Future KYC Integration Point:**
```
POST /api/v1/kyc/start
→ User redirected to third-party KYC provider (e.g., Sumsub, Onfido)
→ Webhook: POST /api/v1/kyc/callback
→ User.kyc_status: UNVERIFIED → PENDING → VERIFIED | REJECTED
→ Higher withdrawal limits unlocked on VERIFIED
```

### 2.3 Session Management

| Property | Access Token | Refresh Token |
|----------|-------------|---------------|
| Format | JWT (RS256 signed) | JWT or Opaque (HEX-128) |
| Lifetime | 15 minutes | 30 days |
| Storage | Client memory (JS variable) | HTTP-Only Secure SameSite=Strict cookie |
| Payload | `{ sub, role, session_id, iat, exp }` | `{ jti, sub, iat, exp }` |
| Rotation | N/A | Rotated on every use (old revoked) |
| Revocation | Cannot be revoked (short-lived) | DB-backed; can be revoked on logout/security event |

**Refresh Token Rotation Protocol:**
```
1. Access token expires → client receives 401
2. Client calls POST /auth/refresh (cookie sent automatically)
3. Server:
   a. Validates refresh token JWT signature + expiry
   b. Checks refresh token exists in DB and is not revoked
   c. Issues NEW access token + NEW refresh token
   d. Revokes OLD refresh token in DB
   e. Returns 200 with new tokens
4. If refresh token is reused after revocation → ALL sessions for user are revoked
   (detects token theft)
```

### 2.4 Security Considerations

| Threat | Mitigation |
|--------|-----------|
| InitData replay | `auth_date` tolerance ≤ 24h; one-time nonce per session |
| InitData forgery | HMAC-SHA256 with bot token secret — only Telegram can produce valid signatures |
| JWT token theft | 15-min access token window; refresh rotation with theft detection |
| CSRF | Refresh token is HTTP-Only; API uses `X-Requested-With` header check |
| XSS | Access token never touches localStorage; stored in closure variable |
| Session fixation | New session_id on each authentication |
| MITM | All traffic over TLS 1.3; HSTS headers; certificate pinning (mobile) |

### 2.5 Authentication Failure Handling

| Failure Scenario | HTTP Status | Response | Client Action |
|-----------------|-------------|----------|---------------|
| Invalid initData signature | 401 | `{ error: "INVALID_INIT_DATA" }` | Show "Session expired, please reopen" |
| Expired auth_date (>24h) | 401 | `{ error: "AUTH_DATE_EXPIRED" }` | Refresh Mini App → new initData |
| Malformed initData | 400 | `{ error: "MALFORMED_INIT_DATA" }` | Log error, prompt reopen |
| Missing hash field | 400 | `{ error: "MISSING_HASH" }` | Log error, prompt reopen |
| Expired access token | 401 | `{ error: "TOKEN_EXPIRED" }` | Attempt silent refresh → if fail, re-auth |
| Revoked refresh token | 401 | `{ error: "SESSION_REVOKED" }` | Force re-auth, invalidate all sessions |
| Rate limit exceeded | 429 | `{ error: "RATE_LIMITED", retry_after: N }` | Retry with backoff |

### 2.6 Account Recovery Strategy

Since identity is bound to Telegram, account recovery is **Telegram-bound**:

```
┌─────────────────────────────────────────────────────────────────┐
│                   ACCOUNT RECOVERY FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scenario: User loses device / clears browser data              │
│                                                                 │
│  1. User opens Mini App on any device                          │
│  2. Telegram provides fresh initData                           │
│  3. Server verifies signature → identifies user by Telegram ID │
│  4. Creates new session, new JWT                               │
│  5. User is logged in — all previous sessions invalidated      │
│     (optional: user can choose "Keep other sessions active")   │
│                                                                 │
│  Scenario: User changes Telegram phone number                  │
│                                                                 │
│  1. Telegram's initData reflects new phone number              │
│  2. But Telegram ID remains the same                           │
│  3. Authentication works transparently                         │
│  4. User profile receives update notification                  │
│                                                                 │
│  Scenario: User wants to transfer account to new Telegram      │
│                                                                 │
│  NOT SUPPORTED. Account is permanently tied to Telegram ID.    │
│  Funds must be withdrawn before switching.                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.7 Database Entities (Authentication)

```sql
-- Existing: users table (extended with auth-related fields)
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) DEFAULT 'UNVERIFIED';
ALTER TABLE users ADD COLUMN kyc_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN security_level INTEGER DEFAULT 1;

-- New: telegram_accounts (separate to support future multi-account linking)
CREATE TABLE telegram_accounts (
    id              BIGINT PRIMARY KEY,           -- Telegram user_id
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username        VARCHAR(255),
    first_name      VARCHAR(255) NOT NULL,
    last_name       VARCHAR(255),
    language_code   VARCHAR(10) DEFAULT 'en',
    photo_url       TEXT,
    is_premium      BOOLEAN DEFAULT FALSE,
    last_sync_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(user_id);

-- New: sessions
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(512) NOT NULL UNIQUE, -- Hashed SHA-256 of refresh token
    fingerprint     JSONB,                         -- Device fingerprint
    ip_address      INET,
    user_agent      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

---

## 3. User Lifecycle State Machine

### 3.1 State Machine Diagram

```
                        ┌──────────────┐
                        │  GHOST_USER  │ (initData verified, no user record yet)
                        └──────┬───────┘
                               │ POST /auth/telegram (first time)
                               ▼
                     ┌──────────────────┐
              ┌──────│  NEW_USER        │──────┐
              │      │ (user row created)│      │
              │      └────────┬─────────┘      │
              │               │                │
              │       [onboarding:start]        │
              │               ▼                │
              │      ┌──────────────────┐       │ [session expires
              │      │ONBOARDING_WELCOME│       │  before starting]
              │      └────────┬─────────┘       │
              │               │                 │
              │       [user clicks "Continue"]   │
              │               ▼                 │
              │      ┌──────────────────┐       │
              │      │ ONBOARDING_      │       │
              │      │ EDUCATION        │       │  [abandoned > 7d]
              │      └────────┬─────────┘       │
              │               │                 │
              │       [all modules complete]     │
              │               ▼                 ▼
              │      ┌──────────────────┐  ┌──────────────┐
              │      │  EDUCATION_      │  │ ONBOARDING_  │
              │      │  COMPLETE        │  │  STALLED     │
              │      └────────┬─────────┘  └──────┬───────┘
              │               │                    │
              │       [acknowledgements done]     [re-engagement
              │               ▼                    │  notification]
              │      ┌──────────────────┐          │
              │      │  READY_FOR_      │          │
              │      │  PLATFORM        │          │
              │      └────────┬─────────┘          │
              │               │                    │
              │      [user confirms ready]          │
              │               ▼                    │
              │      ┌──────────────────┐           │
              │      │  ELIGIBLE_USER   │◄─────────┘
              │      └────────┬─────────┘
              │               │
              │         [first platform action]
              │               ▼
              │      ┌──────────────────┐
              │      │   ACTIVE_USER    │
              │      └────────┬─────────┘
              │               │
              │         [inactive > 30d]
              │               ▼
              │      ┌──────────────────┐
              │      │  DORMANT_USER    │
              │      └────────┬─────────┘
              │               │
              │         [re-engage / login]
              │               │
              └───────────────┘  (returns to ACTIVE_USER)

              ┌──────────────────┐
              │   SUSPENDED_USER  │ (admin action / fraud detection)
              └──────────────────┘

              ┌──────────────────┐
              │   BANNED_USER     │ (irreversible — policy violation)
              └──────────────────┘

              ┌──────────────────┐
              │  DELETED_USER     │ (soft delete — GDPR right to erasure)
              └──────────────────┘
```

### 3.2 State Definitions

| State | Code | Description | Restrictions |
|-------|------|-------------|--------------|
| GHOST_USER | `GHOST` | InitData verified but no DB record yet. Transient state during auth processing. | None (not persisted) |
| NEW_USER | `NEW` | User row created in DB. No onboarding started. | Cannot mine, withdraw, use platform features |
| ONBOARDING_WELCOME | `ONB_WELCOME` | User has seen welcome message, picking language. | Same as NEW_USER |
| ONBOARDING_EDUCATION | `ONB_EDU` | User is going through education modules. | Cannot access platform features |
| EDUCATION_COMPLETE | `ONB_EDU_DONE` | All mandatory education modules completed. | Cannot mine/withdraw until consents given |
| READY_FOR_PLATFORM | `ONB_READY` | Education + consents done. Awaiting user's final confirmation to proceed. | Cannot mine/withdraw until confirmed |
| ELIGIBLE_USER | `ELIGIBLE` | Full onboarding complete. User can use platform. | Cannot withdraw large amounts without KYC |
| ACTIVE_USER | `ACTIVE` | Has performed at least one platform action. | Standard platform rules |
| DORMANT_USER | `DORMANT` | No activity for 30+ consecutive days. | Mining speed decays to base; notifications paused |
| ONBOARDING_STALLED | `ONB_STALLED` | Started onboarding but inactive for 7+ days. | Cannot use platform; re-engagement nudges sent |
| SUSPENDED_USER | `SUSPENDED` | Temporary suspension for suspicious behavior. | All actions blocked; appeal process available |
| BANNED_USER | `BANNED` | Permanent ban for ToS violation. | All actions blocked; no appeal |
| DELETED_USER | `DELETED` | Account soft-deleted (GDPR). | All actions blocked; data retained per legal |

### 3.3 Allowed Transitions

| From | To | Trigger | Notes |
|------|----|---------|-------|
| GHOST_USER | NEW_USER | POST /auth/telegram (first time) | Auto-transition |
| NEW_USER | ONBOARDING_WELCOME | Onboarding Service: `start_onboarding` | Auto-transition on first auth |
| NEW_USER | ONBOARDING_STALLED | Cron: 7d inactivity in NEW state | |
| ONBOARDING_WELCOME | ONBOARDING_EDUCATION | User clicks "Begin" | |
| ONBOARDING_WELCOME | ONBOARDING_STALLED | Cron: 7d inactivity | |
| ONBOARDING_EDUCATION | EDUCATION_COMPLETE | Education Service: `complete_education` | All mandatory modules done |
| ONBOARDING_EDUCATION | ONBOARDING_STALLED | Cron: 7d inactivity in education | |
| EDUCATION_COMPLETE | READY_FOR_PLATFORM | Consent Service: `record_consents` | All required acknowledgements signed |
| READY_FOR_PLATFORM | ELIGIBLE_USER | User clicks "Enter TitanStream" | Final gate |
| READY_FOR_PLATFORM | ONBOARDING_STALLED | Cron: 7d inactivity | |
| ELIGIBLE_USER | ACTIVE_USER | First platform action (mine, tap, invite) | Auto-transition |
| ACTIVE_USER | DORMANT_USER | Cron: 30d no activity | |
| DORMANT_USER | ACTIVE_USER | Any authenticated request | Auto-reactivate |
| ELIGIBLE_USER / ACTIVE_USER / DORMANT_USER | SUSPENDED_USER | Admin action or fraud detection alert | |
| SUSPENDED_USER | ELIGIBLE_USER | Admin action (appeal approved) | |
| ANY | DELETED_USER | User requests deletion or GDPR erasure | Soft delete |
| ANY | BANNED_USER | Admin action (ToS violation) | No return path |

### 3.4 Backend Triggers

| Trigger | Mechanism | Description |
|---------|-----------|-------------|
| On auth | Auth Service | Checks user state, routes to appropriate onboarding step |
| State transition | Onboarding Service | Updates `users.onboarding_state` after validation |
| Cron job | BullMQ recurring job | Runs every 6 hours, checks for stalled/dormant users |
| Admin action | Admin Service | Manual state override with audit trail |
| Fraud detection | Security Service | Suspicious activity → SUSPENDED state |

### 3.5 Restrictions Per State

```typescript
const STATE_RESTRICTIONS: Record<UserState, StateRestrictions> = {
  GHOST:             { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
  NEW:               { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
  ONB_WELCOME:       { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
  ONB_EDU:           { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
  ONB_EDU_DONE:      { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: true },
  ONB_READY:         { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: true },
  ELIGIBLE:          { canMine: true,  canWithdraw: false, canInvite: true, canViewDashboard: true },
  ACTIVE:            { canMine: true,  canWithdraw: true,  canInvite: true, canViewDashboard: true },
  DORMANT:           { canMine: true,  canWithdraw: true,  canInvite: true, canViewDashboard: true },
  ONB_STALLED:       { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
  SUSPENDED:         { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
  BANNED:            { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
  DELETED:           { canMine: false, canWithdraw: false, canInvite: false, canViewDashboard: false },
};
```

### 3.6 Recovery Paths for Stalled Onboarding

```
┌─────────────────────────────────────────────────────────────────────┐
│                   STALLED ONBOARDING RECOVERY                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Day 1: User stops mid-onboarding                                   │
│  Day 3: Telegram bot sends: "Hey! You didn't finish setting up.    │
│          Tap here to continue where you left off."                  │
│          → Deep link: https://t.me/titanstream_bot/app?start=resume │
│                                                                     │
│  Day 7: User moved to ONBOARDING_STALLED state                     │
│          Bot sends: "Your onboarding link has expired. Restart?     │
│          → Deep link: https://t.me/titanstream_bot/app?start=restart│
│                                                                     │
│  Day 14: Final nudge: "We've saved your progress. Come back        │
│           anytime to pick up where you left off."                   │
│           → Deep link as above                                      │
│                                                                     │
│  Day 30: No more nudges. User remains in ONBOARDING_STALLED.       │
│          Progress is preserved indefinitely (resumable).            │
│                                                                     │
│  On resume:                                                         │
│  → Server detects ONBOARDING_STALLED state                          │
│  → Checks last saved onboarding_step                                │
│  → Returns current step to client                                   │
│  → State transitions back to the appropriate ONB_* state            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Education Engine

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EDUCATION ENGINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   MODULE REGISTRY                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Module 1 │ │ Module 2 │ │ Module 3 │ │ Module 4 │  │    │
│  │  │ Welcome  │ │ Platform │ │  Funds   │ │ Actions  │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Module 5 │ │ Module 6 │ │ Module 7 │ │ Module 8 │  │    │
│  │  │  Risks   │ │Withdrawal│ │ Myths    │ │  Quiz    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  DELIVERY ADAPTERS                      │    │
│  │  ┌──────────────────┐  ┌────────────────────────────┐   │    │
│  │  │ In-App (Mini App)│  │  Telegram Bot Messages     │   │    │
│  │  │ Rich interactive │  │  Text + buttons            │   │    │
│  │  │ Slides, checks   │  │  Fallback for non-mini-app │   │    │
│  │  └──────────────────┘  └────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PROGRESS TRACKER                           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Per-user │ │  Resume  │ │ Check-   │ │ Scoring  │  │    │
│  │  │ progress │ │ support  │ │ points   │ │ (trust)  │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Education Modules

| # | Module ID | Title | Content Summary | Format | Mandatory | Est. Time |
|---|-----------|-------|-----------------|--------|-----------|-----------|
| 1 | `welcome` | Welcome to TitanStream | What this platform is, what it is not, high-level opportunity | Text + 1 image | Yes | 30s |
| 2 | `platform` | How the Platform Works | Mining mechanics, earning model, boost system | Interactive slides | Yes | 2min |
| 3 | `funds` | How Funds Move | USDT vs TON, on-chain vs in-app balance, no real money mining | Diagram + text | Yes | 1min |
| 4 | `actions` | What You Can Do | Mining, inviting friends, boosts, quests, games, withdrawals | Bullet list + icons | Yes | 1min |
| 5 | `risks` | Risks & Responsibilities | Market risk, smart contract risk, scam awareness, no guarantees | Text + warning boxes | Yes | 2min |
| 6 | `withdrawal` | Withdrawal Process | Minimum amounts, fees, processing times, network selection | Step-by-step guide | Yes | 1min |
| 7 | `myths` | Common Misconceptions | "This is not a bank", "not an investment", "not guaranteed returns" | Myth vs Fact format | Yes | 1min |
| 8 | `quiz` | Comprehension Check | 5 multiple-choice questions covering modules 1-7 | Interactive quiz | Yes | 2min |

### 4.3 Module Data Structure

```typescript
interface EducationModule {
  id: string;
  title: string;                    // Localized title
  content: ModuleContent[];         // Ordered slides/steps
  mandatory: boolean;               // Must complete to proceed
  estimatedSeconds: number;
  orderIndex: number;               // Display order
  completionCriteria: {
    type: 'view_all' | 'quiz_pass' | 'acknowledge';
    threshold?: number;             // For quiz: minimum correct answers
  };
  content: ModuleContent[];
}

interface ModuleContent {
  type: 'text' | 'image' | 'diagram' | 'quiz_question' | 'acknowledgement' | 'myth_fact';
  data: Record<string, any>;        // Type-specific content
  localizationKey: string;          // For i18n
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;              // Shown after answer
}
```

### 4.4 Completion Tracking

```typescript
interface EducationProgress {
  userId: string;
  moduleId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  currentSlideIndex: number;        // Resume point
  startedAt: Date;
  completedAt?: Date;
  quizScore?: number;               // For quiz module
  quizAnswers?: QuizAnswer[];       // For audit
  attempts: number;                 // Number of quiz retries
}

interface QuizAnswer {
  questionIndex: number;
  selectedIndex: number;
  correct: boolean;
  timestamp: Date;
}
```

### 4.5 Progress Persistence

- **Storage:** `education_completion` table in PostgreSQL
- **Resume:** User can leave mid-module and resume from `current_slide_index`
- **Cache:** Redis hash key `edu:progress:{userId}` for fast reads on dashboard
- **Event on completion:** `education.module_completed` event published to event bus
- **Event on all complete:** `education.all_completed` triggers state transition to `EDUCATION_COMPLETE`

### 4.6 User Comprehension Checkpoints

| Checkpoint | Location | Method | Pass Threshold | Retry Policy |
|------------|----------|--------|----------------|--------------|
| Post-Module 5 (Risks) | After risk module | Explicit acknowledgement checkbox | Must check "I understand" | Must acknowledge |
| Module 8 Quiz | After all modules | 5 MC questions | 4/5 correct | Unlimited retries, questions shuffle |
| Final Consent | Before ELIGIBLE | Multi-check acknowledgement form | All boxes checked | Must check all |

### 4.7 Required Acknowledgements

```
┌─────────────────────────────────────────────────────────────────┐
│                   FINAL CONSENT FORM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☐ I understand that TitanStream is not a bank or financial   │
│    institution.                                                 │
│                                                                 │
│  ☐ I understand that mining rewards are not guaranteed and     │
│    may fluctuate.                                               │
│                                                                 │
│  ☐ I understand that I may lose value in my in-app balance.    │
│                                                                 │
│  ☐ I understand that withdrawals are subject to minimum        │
│    amounts, network fees, and processing times.                 │
│                                                                 │
│  ☐ I accept the Terms of Service and Privacy Policy.           │
│                                                                 │
│  ☐ I confirm I am not a resident of a restricted jurisdiction. │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            I ACKNOWLEDGE AND PROCEED                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Telegram Conversational Onboarding Flow

### 5.1 Complete User Journey: /start → Platform Ready

#### Phase 1: Entry

---

**Step 1: User sends /start to bot**

| Element | Detail |
|---------|--------|
| **User action** | Opens Telegram, finds @titanstream_bot, sends `/start` |
| **System response** | `Welcome to TitanStream! 🚀\n\nTitanStream is a Telegram-native earning platform where you can participate in simulated mining activities.\n\n⚠️ *Important:* TitanStream is not a bank, not an investment platform, and not a guaranteed income source.\n\nReady to get started?` |
| **Buttons** | `🚀 Let's Go!` \| `🌐 Language: English` \| `❓ What is TitanStream?` |
| **Backend event** | `auth.pre_onboarding_started` |
| **Database change** | User created in `users` table with state `NEW`. `telegram_accounts` row inserted. `auth_date` logged. |
| **Next paths** | → Step 2 (Let's Go) → Step 1 (What is TitanStream? — shows FAQ then returns) |

---

**Step 2: User clicks "Let's Go!"**

| Element | Detail |
|---------|--------|
| **User action** | Taps `🚀 Let's Go!` button |
| **System response** | TitanStream Mini App opens. Splash screen loads. Telegram `initData` is gathered.\n\nClient calls `POST /api/v1/auth/telegram`.\n\nServer verifies initData → creates/finds user → returns JWT + user state. |
| **Buttons** | In Mini App: `Begin Onboarding` |
| **Backend event** | `auth.authenticated` \| `onboarding.started` |
| **Database change** | User state → `ONBOARDING_WELCOME`. Session created in `sessions` table. Onboarding progress row created in `onboarding_progress`. |
| **Next paths** | → Step 3 (Begin Onboarding) |

---

#### Phase 2: Education

---

**Step 3: Welcome Module**

| Element | Detail |
|---------|--------|
| **User action** | Clicks `Begin Onboarding` in Mini App |
| **System response** | **Slide 1:** "Welcome to TitanStream — a platform where you can earn rewards through simulated mining activities. No real crypto required to start."\n\n**Slide 2:** "Your goal: mine USDT and TON by interacting with the app. Invite friends, complete quests, and boost your earnings."\n\n**Slide 3:** "Let's walk through how everything works." |
| **Buttons** | `Next →` (per slide) \| `Skip Tutorial` (with confirm dialog) |
| **Backend event** | `education.module_started { module_id: "welcome" }` |
| **Database change** | `education_completion` row for module `welcome` → `IN_PROGRESS` |
| **Next paths** | → Step 4 (Platform Module) \| → Skip confirmation dialog |

---

**Step 4: How the Platform Works Module**

| Element | Detail |
|---------|--------|
| **User action** | Views slides about mining mechanics |
| **System response** | **Slide 1:** "Mining: Tap the spinner to earn. Your mining speed (GH/s) determines your rate."\n\n**Slide 2:** "Cooler System: Tap the cooler to multiply your speed. Multiplier decays over time — keep tapping!"\n\n**Slide 3:** "Boosts: Purchase multipliers to accelerate earnings for a limited time."\n\n**Slide 4:** "Invite Friends: Earn a percentage of your referrals' mining output." |
| **Buttons** | `Next →` \| `← Back` \| `I Understand, Continue` |
| **Backend event** | `education.module_completed { module_id: "platform" }` |
| **Database change** | `education_completion` for module `platform` → `COMPLETED` |
| **Next paths** | → Step 5 (Funds Module) |

---

**Step 5: How Funds Move Module**

| Element | Detail |
|---------|--------|
| **User action** | Views fund movement explanation |
| **System response** | **Diagram:**\n```\nIn-App Balance (simulated)\n        │\n        ▼\nWithdrawal Request\n        │\n        ▼\nNetwork Transfer (BEP20 / TON)\n        │\n        ▼\nYour External Wallet\n```\n\n**Text:** "Funds you earn exist as in-app balances. When you withdraw, a real blockchain transaction is initiated. Mining itself is simulated — you earn by participating, not by computing hashes." |
| **Buttons** | `Next →` \| `← Back` \| `I Understand` |
| **Backend event** | `education.module_completed { module_id: "funds" }` |
| **Database change** | `education_completion` for module `funds` → `COMPLETED` |
| **Next paths** | → Step 6 (Actions Module) |

---

**Step 6: What You Can Do Module**

| Element | Detail |
|---------|--------|
| **User action** | Reviews available actions |
| **System response** | **List:**\n• ⛏️ Mine — Tap the spinner to earn\n• 🧊 Cooler — Tap to multiply speed\n• 🚀 Boosts — Buy speed multipliers\n• 👥 Friends — Invite and earn referral rewards\n• 📋 Quests — Complete tasks for bonuses\n• 🎮 Games — Play mini-games for crystals\n• 💰 Withdraw — Move funds to your wallet |
| **Buttons** | `Next →` \| `← Back` |
| **Backend event** | `education.module_completed { module_id: "actions" }` |
| **Database change** | `education_completion` for module `actions` → `COMPLETED` |
| **Next paths** | → Step 7 (Risks Module) |

---

**Step 7: Risks & Responsibilities Module**

| Element | Detail |
|---------|--------|
| **User action** | Reads risk disclosures |
| **System response** | **⚠️ Risk Disclosure (3 slides):**\n\n**Slide 1:** "Market Risk: The value of USDT and TON can fluctuate. Your earnings' real-world value is not guaranteed."\n\n**Slide 2:** "Platform Risk: Mining rewards are determined by platform algorithms. We reserve the right to adjust mechanics."\n\n**Slide 3:** "Security: Never share your account. TitanStream will never ask for your private keys or seed phrase."\n\n**Acknowledgement checkbox:** "I have read and understand these risks." |
| **Buttons** | `Next →` \| `I Acknowledge the Risks` (only enabled after checkbox) |
| **Backend event** | `education.module_completed { module_id: "risks" }` \| `consent.risk_acknowledged` |
| **Database change** | `education_completion` for module `risks` → `COMPLETED`. `user_consents` row created for `risk_acknowledgement`. |
| **Next paths** | → Step 8 (Withdrawal Module) |

---

**Step 8: Withdrawal Process Module**

| Element | Detail |
|---------|--------|
| **User action** | Views withdrawal process |
| **System response** | **Step-by-step:**\n1. Navigate to Withdraw tab\n2. Select currency (USDT or TON)\n3. Enter amount (minimum: 10 USDT / 1 TON)\n4. Select network (BEP20 or TON)\n5. Enter wallet address\n6. Confirm — processing takes 1-24 hours\n\n**Note:** "First withdrawal may require additional verification." |
| **Buttons** | `Next →` \| `← Back` |
| **Backend event** | `education.module_completed { module_id: "withdrawal" }` |
| **Database change** | `education_completion` for module `withdrawal` → `COMPLETED` |
| **Next paths** | → Step 9 (Myths Module) |

---

**Step 9: Common Misconceptions Module**

| Element | Detail |
|---------|--------|
| **User action** | Views myth vs fact comparisons |
| **System response** | **Myth vs Fact cards:**\n\n❌ "This is a bank" → ✅ "TitanStream is a gaming/mining platform"\n❌ "Guaranteed returns" → ✅ "Rewards vary based on activity"\n❌ "Get rich quick" → ✅ "Small, consistent earnings over time"\n❌ "No risk involved" → ✅ "All earnings carry some risk"\n❌ "It's crypto trading" → ✅ "It's simulated mining, not trading" |
| **Buttons** | `Next →` \| `← Back` \| `Got it!` |
| **Backend event** | `education.module_completed { module_id: "myths" }` |
| **Database change** | `education_completion` for module `myths` → `COMPLETED` |
| **Next paths** | → Step 10 (Quiz) |

---

**Step 10: Comprehension Quiz**

| Element | Detail |
|---------|--------|
| **User action** | Answers 5 multiple-choice questions |
| **System response** | **Question examples:**\n1. "What determines your mining speed?"\n   a) Account age\n   b) GH/s rate and multipliers ✅\n   c) Number of friends invited\n\n2. "Can you lose money on TitanStream?"\n   a) No, it's risk-free\n   b) Yes, earnings are not guaranteed ✅\n   c) Only if you withdraw\n\n3. "How do you withdraw funds?"\n   a) Send a request to support\n   b) Use the Withdraw tab ✅\n   c) Convert to Telegram Stars\n\n4. "Is TitanStream a bank?"\n   a) Yes\n   b) No ✅\n\n5. "What should you never share?"\n   a) Your username\n   b) Your private keys / seed phrase ✅\n   c) Your mining speed |
| **Buttons** | Per question: 3-4 option buttons \| `Submit Answer` |
| **Backend event** | `education.quiz_attempt` (per question) \| `education.quiz_completed` |
| **Database change** | Quiz answers stored in `education_completion.quiz_answers`. Score recorded. If ≥ 4/5 → step 11. If < 4/5 → show explanations, offer retry. |
| **Next paths** | → Step 11 (if pass) \| → Review incorrect answers + retry (if fail) |

---

#### Phase 3: Consent & Trust

---

**Step 11: Final Consent Form**

| Element | Detail |
|---------|--------|
| **User action** | Reviews and checks all acknowledgement boxes |
| **System response** | Full consent form displayed (see section 4.7). All 6 checkboxes must be checked. Terms of Service and Privacy Policy linked. |
| **Buttons** | Checkboxes \| `I Acknowledge and Proceed` (disabled until all checked) \| `View Terms of Service` \| `View Privacy Policy` |
| **Backend event** | `consent.all_acknowledged` |
| **Database change** | 6 `user_consents` rows created (one per acknowledgement type). User state → `READY_FOR_PLATFORM`. |
| **Next paths** | → Step 12 |

---

#### Phase 4: Platform Entry

---

**Step 12: Ready for Platform**

| Element | Detail |
|---------|--------|
| **User action** | Sees congratulations message |
| **System response** | `🎉 You're all set!\n\nYou've completed onboarding. Here's a quick summary:\n\n✅ Education modules completed\n✅ Risks acknowledged\n✅ Consent given\n\nYou're now ready to explore TitanStream!` |
| **Buttons** | `⛏️ Start Mining` \| `👥 Invite Friends` \| `📋 View Dashboard` |
| **Backend event** | `onboarding.completed` |
| **Database change** | User state → `ELIGIBLE_USER`. `onboarding_progress.completed_at` set. Welcome bonus queued if applicable. |
| **Next paths** | → Mining screen → Friends screen → Dashboard (Mini App main screen) |

---

### 5.2 Onboarding Progress Data Model

```typescript
interface OnboardingProgress {
  userId: string;
  currentPhase: 'welcome' | 'education' | 'consent' | 'complete';
  currentStep: string;              // Granular step identifier
  completedSteps: string[];         // Set of completed step IDs
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  totalTimeSpentSeconds: number;
  metadata: {
    language: string;
    entryPoint: 'direct' | 'referral' | 'deep_link';
    referrerId?: string;
  };
}
```

### 5.3 Nudge/Reminder Schedule

| Time | Channel | Message | Trigger |
|------|---------|---------|---------|
| 3h after stall | Telegram Bot | "You're halfway there! Complete onboarding to start earning." | Cron: check stalled users |
| 24h after stall | Telegram Bot | "Your TitanStream account is waiting. Finish setup in 2 minutes." | Cron |
| 72h after stall | Telegram Bot | "We saved your progress. Come back anytime!" + deep link | Cron |
| 7d after stall | State change | Move to ONBOARDING_STALLED, stop nudges | Cron |

---

## 6. Trust System Design

### 6.1 Trust Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       TRUST SYSTEM                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ User Confidence   │  │ Transparency     │  │ Risk          │  │
│  │ Mechanisms        │  │ Elements         │  │ Communication │  │
│  ├───────────────────┤  ├──────────────────┤  ├───────────────┤  │
│  │ • Progress bar    │  │ • Clear fee      │  │ • Warning     │  │
│  │ • Achievement     │  │   display        │  │   boxes       │  │
│  │   badges          │  │ • Real-time      │  │ • Plain       │  │
│  │ • Education       │  │   balance        │  │   language    │  │
│  │   score display   │  │ • Transaction    │  │ • Multi-stage │  │
│  │ • Onboarding      │  │   history        │  │   consent     │  │
│  │   % indicator     │  │ • Status labels  │  │ • Quiz        │  │
│  └───────────────────┘  └──────────────────┘  └───────────────┘  │
│                                                                   │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Consent Tracking  │  │ Audit Logging    │  │ Education     │  │
│  │                   │  │                  │  │ Scoring       │  │
│  ├───────────────────┤  ├──────────────────┤  ├───────────────┤  │
│  │ • Timestamped     │  │ • All state      │  │ • Quiz score  │  │
│  │   consent records │  │   transitions    │  │ • Time spent  │  │
│  │ • Versioned ToS   │  │ • Admin actions  │  │ • Modules     │  │
│  │ • IP + fingerprint│  │ • Consent events │  │   completed   │  │
│  │ • Expiry/renewal  │  │ • Auth events    │  │ • Retry count │  │
│  └───────────────────┘  └──────────────────┘  └───────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 User Confidence Mechanisms

| Mechanism | Description | Implementation |
|-----------|-------------|----------------|
| Onboarding Progress Bar | Visual indicator of completion % | `onboarding_progress.completedSteps.length / totalSteps` |
| Education Score Badge | Display quiz score on profile | `education_completion.quiz_score` |
| Trust Level Indicator | Bronze/Silver/Gold based on time + activity | Computed from user age, actions, referrals |
| Achievement Badges | "Education Graduate", "Early Adopter", etc. | `user_achievements` table |
| Clear Status Labels | "Onboarding", "Active", "Suspended" shown on profile | Derived from `users.onboarding_state` |
| FAQ Access | "Common Questions" always accessible during onboarding | Static content served from CDN |

### 6.3 Transparency Elements

| Element | Where Shown | What It Shows |
|---------|-------------|---------------|
| Fee Disclosure | Before any withdrawal | Network fee amount (USDT/TON), platform fee (if any) |
| Mining Rate Display | Mining main screen | Current GH/s, multiplier, estimated daily earnings |
| Transaction History | Wallet/Treasury tab | All deposits, withdrawals, reward events with timestamps |
| Status Labels | Profile header | Account state, trust level, verification status |
| Algorithm Explanation | FAQ / Education | Plain-language explanation of mining reward calculation |
| Processing Time Estimate | Withdrawal confirmation | "Estimated 1-24 hours for processing" |
| Minimum/Maximum Limits | Withdrawal form | "Min: 10 USDT / Max: 10,000 USDT per withdrawal" |

### 6.4 Risk Communication

```
┌──────────────────────────────────────────────────────────────────┐
│              RISK COMMUNICATION FRAMEWORK                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Principle 1: Plain Language                                     │
│  No legal jargon. Use "you might earn less" not                  │
│  "compensation is not guaranteed."                                │
│                                                                   │
│  Principle 2: Layered Disclosure                                 │
│  - Level 1 (Header): ⚠️ "Earnings are not guaranteed"            │
│  - Level 2 (Tap): Expand to see 2-sentence explanation           │
│  - Level 3 (Link): Full terms and risk document                  │
│                                                                   │
│  Principle 3: Just-in-Time Warnings                              │
│  - Before first withdrawal: "This will send real USDT/TON"       │
│  - Before first boost purchase: "Boosts have expiry dates"       │
│  - Before large withdrawal: "Large withdrawals may take longer"  │
│                                                                   │
│  Principle 4: Positive + Negative Balance                        │
│  Show both "Potential earnings" AND "Risks to consider"          │
│  side by side. Never show only upside.                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.5 Consent Tracking

Each consent event is recorded as an immutable row:

```typescript
interface UserConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  // 'risk_acknowledgement' | 'tos_acceptance' | 'privacy_acceptance' |
  // 'kyc_consent' | 'marketing_opt_in' | 'data_processing'
  version: string;                   // Version of ToS/Privacy at time of consent
  granted: boolean;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  metadata: Record<string, any>;     // e.g., { document_url, document_hash }
  createdAt: Date;
  expiresAt?: Date;                  // Some consents expire and need renewal
}

// Unique constraint: one active consent per type per user
// UNIQUE(user_id, consent_type) WHERE granted = true
```

### 6.6 Audit Logging

```typescript
interface AuditEvent {
  id: string;
  userId?: string;
  eventType: AuditEventType;
  // 'auth.login' | 'auth.logout' | 'auth.token_refresh' |
  // 'onboarding.step' | 'education.complete' | 'consent.given' |
  // 'state.transition' | 'admin.action' | 'security.flag'
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  data: Record<string, any>;         // Event-specific payload
  ipAddress?: string;
  sessionId?: string;
  createdAt: Date;
}

// Retention: 7 years (regulatory requirement for fintech)
// Partitioned by month for query performance
// Indexed on (user_id, event_type, created_at)
```

### 6.7 User Education Scoring

```typescript
interface EducationScore {
  userId: string;
  overallScore: number;              // 0-100
  moduleScores: Record<string, number>;  // Per-module scores
  quizScore: number;                 // 0-100
  timeSpentSeconds: number;
  retakes: number;                   // How many times retook quiz
  comprehensionLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  lastAssessedAt: Date;
}

// Overall score formula:
// 30% modules completed + 40% quiz score + 15% time spent (optimal) + 15% retake penalty
// Score = (completedModules / totalModules * 30) +
//         (quizCorrect / quizTotal * 40) +
//         (timeScore * 15) +
//         (retakeScore * 15)
//
// Where timeScore = min(spentSeconds / optimalSeconds, 1.0)
// And retakeScore = retakes === 1 ? 1.0 : retakes === 2 ? 0.7 : retakes >= 3 ? 0.4 : 0
```

---

## 7. Database Architecture

### 7.1 Complete Prisma Schema

```prisma
enum UserState {
  NEW
  ONB_WELCOME
  ONB_EDU
  ONB_EDU_DONE
  ONB_READY
  ELIGIBLE
  ACTIVE
  DORMANT
  ONB_STALLED
  SUSPENDED
  BANNED
  DELETED
}

enum KycStatus {
  UNVERIFIED
  PENDING
  VERIFIED
  REJECTED
}

enum ConsentType {
  RISK_ACKNOWLEDGEMENT
  TOS_ACCEPTANCE
  PRIVACY_ACCEPTANCE
  KYC_CONSENT
  MARKETING_OPT_IN
  DATA_PROCESSING
}

enum EducationModuleId {
  WELCOME
  PLATFORM
  FUNDS
  ACTIONS
  RISKS
  WITHDRAWAL
  MYTHS
  QUIZ
}

enum EducationModuleStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum AuditSeverity {
  INFO
  WARNING
  CRITICAL
}

// ─────────────────────────────────────────────
// USERS (extended from existing schema)
// ─────────────────────────────────────────────
model User {
  id                        BigInt              @id @map("id")
  username                  String?             @unique @map("username")
  firstName                 String              @map("first_name")
  lastName                  String?             @map("last_name")
  role                      Role                @default(USER) @map("role")
  state                     UserState           @default(NEW) @map("state")
  kycStatus                 KycStatus           @default(UNVERIFIED) @map("kyc_status")
  kycVerifiedAt             DateTime?           @map("kyc_verified_at")
  securityLevel             Int                 @default(1) @map("security_level")
  lastLoginAt               DateTime?           @map("last_login_at")
  loginCount                Int                 @default(0) @map("login_count")
  referrerId                BigInt?             @map("referrer_id")
  invitedCount              Int                 @default(0) @map("invited_count")
  referralBoostMultiplier   Decimal             @default(1.0) @db.Decimal(4, 2) @map("referral_boost_multiplier")
  languageCode              String              @default("en") @map("language_code")
  educationScore            Int?                @map("education_score")
  createdAt                 DateTime            @default(now()) @map("created_at")
  updatedAt                 DateTime            @updatedAt @map("updated_at")
  deletedAt                 DateTime?           @map("deleted_at")

  // Relations
  wallet                    Wallet?
  miningSession             MiningSession?
  telegramAccount           TelegramAccount?
  sessions                  Session[]
  onboardingProgress        OnboardingProgress?
  educationCompletions      EducationCompletion[]
  consents                  UserConsent[]
  auditEvents               AuditEvent[]
  quests                    UserQuest[]
  boosts                    UserBoost[]
  withdrawals               WithdrawalRequest[]

  referrer                  User?               @relation("UserReferrals", fields: [referrerId], references: [id])
  referees                  User[]              @relation("UserReferrals")

  @@index([state])
  @@index([referrerId])
  @@index([kycStatus])
  @@map("users")
}

// ─────────────────────────────────────────────
// TELEGRAM ACCOUNTS
// ─────────────────────────────────────────────
model TelegramAccount {
  id                        BigInt              @id @map("id") // Telegram user_id
  userId                    BigInt              @unique @map("user_id")
  username                  String?             @map("username")
  firstName                 String              @map("first_name")
  lastName                  String?             @map("last_name")
  languageCode              String?             @default("en") @map("language_code")
  photoUrl                  String?             @map("photo_url")
  isPremium                 Boolean             @default(false) @map("is_premium")
  allowsWriteToPm           Boolean             @default(true) @map("allows_write_to_pm")
  lastSyncAt                DateTime            @default(now()) @map("last_sync_at")
  createdAt                 DateTime            @default(now()) @map("created_at")
  updatedAt                 DateTime            @updatedAt @map("updated_at")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("telegram_accounts")
}

// ─────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────
model Session {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt              @map("user_id")
  refreshTokenHash          String              @unique @map("refresh_token_hash")
  fingerprint               Json?               @map("fingerprint")
  ipAddress                  String?            @map("ip_address")
  userAgent                 String?             @map("user_agent")
  isActive                  Boolean             @default(true) @map("is_active")
  lastUsedAt                DateTime            @default(now()) @map("last_used_at")
  expiresAt                 DateTime            @map("expires_at")
  createdAt                 DateTime            @default(now()) @map("created_at")
  revokedAt                 DateTime?           @map("revoked_at")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

// ─────────────────────────────────────────────
// ONBOARDING PROGRESS
// ─────────────────────────────────────────────
model OnboardingProgress {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt              @unique @map("user_id")
  currentPhase              String              @default("welcome") @map("current_phase")
  currentStep               String              @default("welcome_start") @map("current_step")
  completedSteps            String[]            @default([]) @map("completed_steps")
  startedAt                 DateTime            @default(now()) @map("started_at")
  lastActiveAt              DateTime            @default(now()) @map("last_active_at")
  completedAt               DateTime?           @map("completed_at")
  totalTimeSpentSeconds     Int                 @default(0) @map("total_time_spent_seconds")
  metadata                  Json?               @map("metadata")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([currentPhase])
  @@map("onboarding_progress")
}

// ─────────────────────────────────────────────
// EDUCATION MODULES (catalog — seed data)
// ─────────────────────────────────────────────
model EducationModule {
  id                        EducationModuleId    @id @map("id")
  title                     String               @map("title")
  description               String?              @map("description")
  contentType               String               @map("content_type") // 'slides' | 'quiz' | 'acknowledgement'
  content                   Json                 @map("content")      // Module slides/content data
  orderIndex                Int                  @map("order_index")
  mandatory                 Boolean              @default(true) @map("mandatory")
  estimatedSeconds          Int                  @default(60) @map("estimated_seconds")
  isActive                  Boolean              @default(true) @map("is_active")
  createdAt                 DateTime             @default(now()) @map("created_at")
  updatedAt                 DateTime             @updatedAt @map("updated_at")

  completions               EducationCompletion[]

  @@map("education_modules")
}

// ─────────────────────────────────────────────
// EDUCATION COMPLETION (per user per module)
// ─────────────────────────────────────────────
model EducationCompletion {
  id                        String               @id @default(uuid()) @map("id")
  userId                    BigInt               @map("user_id")
  moduleId                  EducationModuleId     @map("module_id")
  status                    EducationModuleStatus @default(NOT_STARTED) @map("status")
  currentSlideIndex         Int                  @default(0) @map("current_slide_index")
  startedAt                 DateTime?            @map("started_at")
  completedAt               DateTime?            @map("completed_at")
  quizScore                 Int?                 @map("quiz_score")
  quizAnswers               Json?                @map("quiz_answers")  // Array of quiz responses
  attempts                  Int                  @default(0) @map("attempts")
  timeSpentSeconds          Int                  @default(0) @map("time_spent_seconds")

  user                      User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  module                    EducationModule      @relation(fields: [moduleId], references: [id])

  @@unique([userId, moduleId])
  @@map("education_completions")
}

// ─────────────────────────────────────────────
// USER CONSENTS
// ─────────────────────────────────────────────
model UserConsent {
  id                        String               @id @default(uuid()) @map("id")
  userId                    BigInt               @map("user_id")
  consentType               ConsentType           @map("consent_type")
  version                   String               @map("version")       // e.g., "tos_v1.2"
  granted                   Boolean              @default(true) @map("granted")
  ipAddress                 String?              @map("ip_address")
  userAgent                 String?              @map("user_agent")
  sessionId                 String?              @map("session_id")
  metadata                  Json?                @map("metadata")
  createdAt                 DateTime             @default(now()) @map("created_at")
  expiresAt                 DateTime?            @map("expires_at")

  user                      User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, consentType, version])
  @@index([userId, consentType])
  @@map("user_consents")
}

// ─────────────────────────────────────────────
// AUDIT EVENTS
// ─────────────────────────────────────────────
model AuditEvent {
  id                        String               @id @default(uuid()) @map("id")
  userId                    BigInt?              @map("user_id")
  eventType                 String               @map("event_type")
  severity                  AuditSeverity        @default(INFO) @map("severity")
  data                      Json?                @map("data")
  ipAddress                 String?              @map("ip_address")
  sessionId                 String?              @map("session_id")
  createdAt                 DateTime             @default(now()) @map("created_at")

  user                      User?                @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([eventType])
  @@index([createdAt])
  @@index([severity])
  @@map("audit_events")
}

// ─────────────────────────────────────────────
// USER ACHIEVEMENTS (trust layer)
// ─────────────────────────────────────────────
model UserAchievement {
  id                        String               @id @default(uuid()) @map("id")
  userId                    BigInt               @map("user_id")
  achievementType           String               @map("achievement_type")
  // 'education_graduate' | 'early_adopter' | 'referral_master' | 'mining_veteran'
  title                     String               @map("title")
  description               String?              @map("description")
  iconUrl                   String?              @map("icon_url")
  unlockedAt                DateTime             @default(now()) @map("unlocked_at")

  @@unique([userId, achievementType])
  @@index([userId])
  @@map("user_achievements")
}
```

### 7.2 Entity Relationships Diagram

```
┌─────────────┐       ┌──────────────────┐
│     User    │1──1── │ TelegramAccount  │
│  (extended) │       └──────────────────┘
│             │1──0..1│ OnboardingProgress
│             │1──0..N│ Session
│             │1──0..N│ EducationCompletion
│             │1──0..N│ UserConsent
│             │1──0..N│ AuditEvent
│             │1──0..N│ UserAchievement
│             │1──0..1│ Wallet (existing)
│             │1──0..1│ MiningSession (existing)
│             │1──0..N│ UserQuest (existing)
│             │1──0..N│ UserBoost (existing)
│             │1──0..N│ WithdrawalRequest (existing)
└─────────────┘
       │
       │ self-ref (referrer)
       │
┌──────┴──────────┐
│ EducationModule │ (seed data catalog)
└─────────────────┘
       │1
       │
┌──────┴──────────┐
│EducationComplete│ (junction)
└─────────────────┘
```

### 7.3 Indexing Strategy

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `users` | `(state)` | B-tree | Filter onboarding states, cron queries |
| `users` | `(kyc_status)` | B-tree | KYC status queries |
| `users` | `(referrer_id)` | B-tree | Referral lookups |
| `sessions` | `(refresh_token_hash)` | B-tree (unique) | Refresh token lookup |
| `sessions` | `(expires_at)` | B-tree | Session cleanup cron |
| `onboarding_progress` | `(current_phase)` | B-tree | Stalled user detection |
| `education_completions` | `(user_id, module_id)` | B-tree (unique) | Progress lookup |
| `education_completions` | `(status)` | B-tree | Completion stats |
| `user_consents` | `(user_id, consent_type)` | B-tree | Active consent lookup |
| `audit_events` | `(user_id, event_type, created_at)` | B-tree (composite) | Audit trail queries |
| `audit_events` | `(severity, created_at)` | B-tree | Security monitoring |
| `audit_events` | `(created_at)` | B-tree | Monthly partition pruning |

### 7.4 Security Considerations

| Concern | Implementation |
|---------|---------------|
| PII data | `users` table: first_name, last_name are PII. Encrypt at rest using PostgreSQL TDE or column-level encryption. |
| Refresh tokens | Stored as SHA-256 hash. Original token never persisted. |
| Audit retention | 7 years. Monthly partitioning with `created_at` range. |
| Soft delete | `users.deleted_at` set on GDPR erasure. Cascade behavior preserves financial records. |
| Access control | Row-level security (RLS) policies on PostgreSQL for multi-tenant isolation (future). |
| Connection pooling | PgBouncer in transaction mode. Max 100 connections per service instance. |

---

## 8. Backend Service Architecture

### 8.1 Service Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (NestJS)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Auth   │ │   User  │ │Onboarding│ │Education │ │   Trust  │  │
│  │ Middleware│ │ Service │ │ Service  │ │ Service  │ │ Service  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │            │            │            │            │         │
│  ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐ │
│  │   Auth   │ │   User  │ │Consent   │ │   Quiz   │ │  Fraud   │ │
│  │  Service │ │  Profile│ │ Service  │ │ Engine   │ │  Detect  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
         │            │            │            │            │
         ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BULLMQ WORKER POOL                           │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────────────────┐ │
│  │ Onboarding     │ │ Notification   │ │ Referral / Quest /       │ │
│  │ Worker         │ │ Worker         │ │ Withdrawal Workers       │ │
│  │ (nudges, time- │ │ (Telegram bot  │ │ (existing)               │ │
│  │  based events) │ │  dispatches)   │ │                          │ │
│  └────────────────┘ └────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Service Definitions

---

#### 8.2.1 Authentication Service

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | InitData verification, JWT signing/verification, session management, refresh token rotation, rate limiting |
| **Dependencies** | Bot token (env), Redis (blacklist), PostgreSQL (sessions) |
| **APIs** | `POST /auth/telegram` — authenticate with initData, `POST /auth/refresh` — rotate tokens, `POST /auth/logout` — revoke session, `GET /auth/session` — validate current session |
| **Events emitted** | `auth.user_authenticated`, `auth.token_refreshed`, `auth.session_revoked`, `auth.login_failed` |
| **Events consumed** | `user.account_deleted` (revoke all sessions) |

---

#### 8.2.2 Onboarding Service

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | State machine management, onboarding progress tracking, step routing, stalled user detection, nudge scheduling |
| **Dependencies** | User Service, Education Service, Consent Service, Redis (progress cache) |
| **APIs** | `GET /onboarding/state` — get current step, `POST /onboarding/step` — advance step, `POST /onboarding/skip` — resume from last checkpoint |
| **Events emitted** | `onboarding.started`, `onboarding.step_completed`, `onboarding.completed`, `onboarding.stalled`, `onboarding.resumed` |
| **Events consumed** | `auth.user_authenticated` (trigger or resume), `education.all_completed`, `consent.all_acknowledged` |

---

#### 8.2.3 Education Service

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Module delivery, progress tracking, quiz engine, scoring, comprehension assessment |
| **Dependencies** | Onboarding Service, Module Registry (DB seed data) |
| **APIs** | `GET /education/modules` — list modules, `GET /education/modules/:id` — get module content, `POST /education/progress` — update slide progress, `POST /education/quiz/answer` — submit answer, `POST /education/quiz/complete` — finish quiz |
| **Events emitted** | `education.module_started`, `education.module_completed`, `education.quiz_attempt`, `education.quiz_completed`, `education.all_completed` |
| **Events consumed** | `onboarding.started` (initialize education tracking) |

---

#### 8.2.4 User Profile Service

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | User CRUD, profile sync from Telegram, state management, achievement tracking |
| **Dependencies** | PostgreSQL, Redis (profile cache) |
| **APIs** | `GET /users/me` — get profile, `PATCH /users/me` — update preferences, `GET /users/me/achievements` — list achievements |
| **Events emitted** | `user.profile_updated`, `user.state_changed`, `user.achievement_unlocked` |
| **Events consumed** | `auth.user_authenticated` (sync Telegram profile), `onboarding.completed` (trigger state change), `education.all_completed` (update education score) |

---

#### 8.2.5 Consent Service

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Consent record management, version tracking, expiry handling, audit logging |
| **Dependencies** | User Service, Audit Service |
| **APIs** | `POST /consent/:type` — record consent, `GET /consent/:type/status` — check active consent, `GET /consent/pending` — list required consents |
| **Events emitted** | `consent.recorded`, `consent.all_acknowledged`, `consent.expired` |
| **Events consumed** | `onboarding.started` (check required consents), `user.account_deleted` (anonymize consents) |

---

#### 8.2.6 Notification Service

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Telegram bot message dispatch, nudge scheduling, template rendering, localization |
| **Dependencies** | BullMQ (notification queue), Redis, PostgreSQL (templates) |
| **APIs** | `POST /notifications/send` — send message, `POST /notifications/template` — create/update template |
| **Events emitted** | `notification.sent`, `notification.delivery_failed` |
| **Events consumed** | `onboarding.stalled` (send nudge), `onboarding.resumed` (send welcome back), `education.quiz_completed` (congratulate), `consent.all_acknowledged` (transition message) |

---

#### 8.2.7 Fraud Detection Service

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Multiple account detection, bot behavior analysis, suspicious pattern identification, state suspension |
| **Dependencies** | Audit Service, PostgreSQL, Redis (rate limiter) |
| **APIs** | Internal event consumer only |
| **Events emitted** | `security.multiple_accounts_detected`, `security.suspicious_activity`, `security.account_suspended` |
| **Events consumed** | `auth.user_authenticated`, `auth.login_failed`, `onboarding.step_completed` (abnormal speed) |

---

### 8.3 Service Interactions Flow

```
AUTH FLOW:
  Auth Middleware → Auth Service → User Profile Service (sync) → Onboarding Service (state check) → Response

ONBOARDING FLOW:
  Client → Onboarding Service → Education Service (if on edu step) → Consent Service (if on consent step) → User Profile Service (state update) → Response

NUDGE FLOW:
  Cron (BullMQ recurring) → Onboarding Service (find stalled) → Notification Service (send message)

EDUCATION COMPLETION FLOW:
  Client → Education Service (post quiz) → Education Service (score, check all complete)
  → Event: education.all_completed → Onboarding Service (advance state) → Response
```

---

## 9. Security Model

### 9.1 Authentication Security

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| Transport | TLS 1.3 | All API traffic over HTTPS. HSTS header: `max-age=31536000; includeSubDomains` |
| Request verification | HMAC-SHA256 | Every request includes `X-Telegram-Init-Data` header. Server verifies signature on auth |
| Token security | RS256 JWT | Access tokens signed with private key. Public key for verification. |
| Refresh token | SHA-256 hash | Stored hashed in DB. Original is opaque 128-bit random. |
| Session binding | Fingerprint | Token bound to `(user_id, session_id)`. Invalid if fingerprint changes. |

### 9.2 Session Protection

```
┌──────────────────────────────────────────────────────────────────┐
│                    SESSION PROTECTION LAYERS                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Access Token: 15 min TTL, stored in-memory only              │
│     → Cannot be stolen from localStorage                         │
│                                                                   │
│  2. Refresh Token: HTTP-Only, Secure, SameSite=Strict cookie     │
│     → Cannot be read by JS, only sent over HTTPS, same-site      │
│                                                                   │
│  3. Token Rotation: Every refresh issues NEW refresh token       │
│     → Old token revoked. Theft detection if old token reused.    │
│                                                                   │
│  4. Session Fingerprinting:                                     │
│     Fingerprint = SHA256(user_agent + tg_client + ip_prefix)    │
│     → If fingerprint changes significantly, require re-auth     │
│                                                                   │
│  5. Concurrent Session Limit: Max 5 sessions per user           │
│     → Oldest session auto-revoked on 6th login                  │
│                                                                   │
│  6. Inactivity Timeout: 7 days → require re-auth                │
│     → Protects against abandoned sessions                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 9.3 Fraud Prevention

| Threat | Detection | Prevention |
|--------|-----------|------------|
| Multiple accounts per user | Fingerprint + IP clustering + referral graph analysis | Max 1 account per Telegram ID (enforced). Suspicious cluster → SUSPENDED |
| Bot/script automation | Rate limiting, mouse movement analysis (future WebApp API), action timing patterns | 429 throttling, CAPTCHA on suspicious actions |
| Referral fraud | Referral graph cycle detection, IP overlap analysis | Flag suspicious referrals, void rewards |
| InitData replay | auth_date tolerance, one-time nonce per initData | Reject old packets |
| JWT forgery | RS256 signature verification | Reject invalid signatures |
| Session hijacking | Fingerprint mismatch detection | Force re-auth on mismatch |
| Quiz farming | Time-per-question analysis, pattern detection | Flag abnormally fast completions, require manual review |

### 9.4 Bot Abuse Prevention

| Strategy | Implementation |
|----------|----------------|
| Rate limiting | Token bucket per user: 60 req/min general, 300 req/min for mining taps |
| IP-based throttling | 1000 req/min per IP (behind Cloudflare) |
| Telegram-only access | Block non-Telegram user agents (future: verify Telegram proxy IP ranges) |
| Action timeouts | Minimum 500ms between actions (mining taps, button clicks) |
| Quiz timing | Minimum 30s to complete 5-question quiz |
| Progressive delays | After 3 rapid failures, add exponential backoff |

### 9.5 Multiple Account Detection

```typescript
interface AccountClusterAnalysis {
  criteria: {
    sameIP: boolean;              // Same IP address at registration
    sameDevice: boolean;          // Same device fingerprint
    sameReferralPath: boolean;    // A invited B, B invited C — cycle?
    samePattern: boolean;         // Similar onboarding timing
  };
  riskScoring: {
    matchCount: number;           // How many criteria match
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  action: {
    riskLevel === 'LOW':      → log only
    riskLevel === 'MEDIUM':   → flag for review
    riskLevel === 'HIGH':     → suspend secondary accounts, keep primary
    riskLevel === 'CRITICAL': → suspend all accounts, admin review
  };
}
```

### 9.6 Audit Requirements

| Requirement | Implementation |
|-------------|---------------|
| All auth events | Logged to `audit_events` with timestamp, IP, user ID |
| All state transitions | Logged with before/after state, trigger source |
| All consent events | Logged with consent type, version, IP, user agent |
| All admin actions | Logged with admin ID, action type, target, metadata |
| All security events | Logged with severity CRITICAL, immediate alert to ops channel |
| Retention | 7 years; monthly partitioned |
| Immutability | Append-only; `UPDATE` and `DELETE` prohibited via DB triggers/RLS |
| Tamper detection | Daily hash chain validation (hash of all audit records, published to blockchain or public log) |

---

## 10. Event Architecture

### 10.1 Event Bus Design

```
┌──────────────────────────────────────────────────────────────────────┐
│                        EVENT BUS (Redis Pub/Sub + BullMQ)           │
└──────────────────────────────────────────────────────────────────────┘
         │
         ├── Topic: auth.*
         │   ├── auth.user_authenticated     → Onboarding Service, User Profile Service, Fraud Detection
         │   ├── auth.token_refreshed        → Audit Service
         │   └── auth.login_failed           → Fraud Detection
         │
         ├── Topic: onboarding.*
         │   ├── onboarding.started          → Education Service, Consent Service, Notification
         │   ├── onboarding.step_completed   → User Profile Service
         │   ├── onboarding.completed        → User Profile, Wallet (welcome bonus), Notification
         │   ├── onboarding.stalled          → Notification (nudge)
         │   └── onboarding.resumed          → Notification
         │
         ├── Topic: education.*
         │   ├── education.module_started    → Audit Service
         │   ├── education.module_completed   → Onboarding Service
         │   ├── education.quiz_completed    → User Profile Service, Notification
         │   └── education.all_completed     → Onboarding Service
         │
         ├── Topic: consent.*
         │   ├── consent.recorded            → Audit Service
         │   ├── consent.all_acknowledged    → Onboarding Service
         │   └── consent.expired             → Notification
         │
         └── Topic: security.*
             ├── security.multiple_accounts  → Admin Service, Notification
             ├── security.suspicious_activity→ Admin Service
             └── security.account_suspended  → Notification, Session Service
```

### 10.2 Event Schema

```typescript
interface Event {
  id: string;                    // UUID v4
  type: string;                  // e.g., "onboarding.step_completed"
  source: string;                // Service name: "auth", "onboarding", etc.
  version: number;               // Schema version for backward compat
  timestamp: string;             // ISO 8601
  correlationId: string;         // Trace ID across services
  userId?: string;               // Affected user
  data: Record<string, any>;     // Type-specific payload
  metadata: {
    requestId?: string;
    sessionId?: string;
    ipAddress?: string;
  };
}
```

### 10.3 Queue Definitions (BullMQ)

| Queue | Purpose | Concurrency | Retry Policy |
|-------|---------|-------------|--------------|
| `auth-queue` | Token revocation, session cleanup | 5 | 3 retries, exponential backoff 1s-30s |
| `onboarding-nudge-queue` | Stalled user reminders | 10 | 2 retries, 5s delay |
| `onboarding-recurring` | Cron: check stalled users every 6h | 1 (singleton) | 3 retries, 1min delay |
| `notification-queue` | Telegram bot message dispatch | 20 | 5 retries, exponential backoff 1s-60s |
| `audit-queue` | Async audit log writes | 10 | 3 retries, 1s delay |

---

## 11. API Design

### 11.1 Complete API Surface

All endpoints prefixed with `/api/v1`. All responses wrapped in `{ success: boolean, data?: any, error?: { code: string, message: string } }`.

#### Authentication

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/auth/telegram` | None (initData) | 10/min | Authenticate with Telegram initData |
| POST | `/auth/refresh` | Cookie | 10/min | Refresh access token |
| POST | `/auth/logout` | JWT | 10/min | Revoke current session |
| GET | `/auth/session` | JWT | 30/min | Validate current session, get user state |

**POST /auth/telegram**
```typescript
// Request
{
  "initData": "query_id=...&auth_date=...&hash=..."   // Raw initData string
}

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 900,
    "user": {
      "id": 123456789,
      "firstName": "Alice",
      "username": "alice_123",
      "state": "ONB_WELCOME",
      "role": "USER"
    },
    "onboarding": {
      "currentPhase": "education",
      "currentStep": "platform",
      "completedSteps": ["welcome"],
      "progress": 12.5            // percentage
    }
  }
}

// Response 401
{
  "success": false,
  "error": {
    "code": "INVALID_INIT_DATA",
    "message": "Telegram data verification failed"
  }
}
```

#### Onboarding

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/onboarding/state` | JWT | 60/min | Get current onboarding state + progress |
| POST | `/onboarding/step` | JWT | 30/min | Advance to next onboarding step |
| POST | `/onboarding/resume` | JWT | 10/min | Resume stalled onboarding |
| GET | `/onboarding/progress` | JWT | 60/min | Get detailed onboarding progress |

**POST /onboarding/step**
```typescript
// Request
{
  "stepId": "platform_complete",       // Identifies which step was completed
  "metadata": {                        // Optional context
    "timeSpentSeconds": 45,
    "interactions": 3
  }
}

// Response 200
{
  "success": true,
  "data": {
    "currentPhase": "education",
    "currentStep": "funds_intro",
    "completedSteps": ["welcome_done", "platform_complete"],
    "progress": 25.0,
    "nextSteps": {
      "type": "education_module",
      "moduleId": "funds"
    }
  }
}
```

#### Education

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/education/modules` | JWT | 30/min | List all modules with user's progress |
| GET | `/education/modules/:id` | JWT | 30/min | Get module content |
| POST | `/education/progress` | JWT | 30/min | Update slide progress within module |
| POST | `/education/quiz/answer` | JWT | 30/min | Submit single quiz answer |
| POST | `/education/quiz/complete` | JWT | 10/min | Finalize quiz attempt |
| GET | `/education/score` | JWT | 30/min | Get education score |

**POST /education/quiz/complete**
```typescript
// Request
{
  "moduleId": "quiz",
  "answers": [
    { "questionIndex": 0, "selectedIndex": 1 },
    { "questionIndex": 1, "selectedIndex": 0 },
    { "questionIndex": 2, "selectedIndex": 2 },
    { "questionIndex": 3, "selectedIndex": 1 },
    { "questionIndex": 4, "selectedIndex": 0 }
  ],
  "timeSpentSeconds": 85
}

// Response 200 (pass)
{
  "success": true,
  "data": {
    "passed": true,
    "score": 4,
    "total": 5,
    "percentage": 80,
    "correctAnswers": [0, 1, 2, 3, 4],     // Indices of correct answers
    "explanations": {                         // Shown after submission
      "0": "Mining speed is measured in GH/s...",
      "2": "Withdrawals are processed through..."
    },
    "educationScore": 85,
    "nextStep": {
      "type": "consent_form",
      "consentTypes": ["risk", "tos", "privacy"]
    }
  }
}

// Response 200 (fail — < 4/5)
{
  "success": true,
  "data": {
    "passed": false,
    "score": 2,
    "total": 5,
    "percentage": 40,
    "correctAnswers": [0, 2, 3, 1, 4],     // Show which were correct
    "explanations": {
      "1": "TitanStream is not a bank...",
      "3": "You should never share private keys..."
    },
    "retryAllowed": true,
    "remainingAttempts": null               // null = unlimited
  }
}
```

#### Consent

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/consent/pending` | JWT | 30/min | List consents still required |
| GET | `/consent/status` | JWT | 30/min | Get all consent statuses |
| POST | `/consent/:type` | JWT | 30/min | Record a consent acknowledgement |
| GET | `/consent/:type/history` | JWT | 30/min | Get consent history for a type |

**POST /consent/:type**
```typescript
// Path: /consent/risk_acknowledgement
// Request
{
  "granted": true,
  "version": "v1.0",
  "metadata": {
    "documentUrl": "https://titanstream.com/risk-disclosure-v1"
  }
}

// Response 200
{
  "success": true,
  "data": {
    "consentType": "risk_acknowledgement",
    "granted": true,
    "version": "v1.0",
    "createdAt": "2026-07-28T12:00:00Z",
    "pendingConsents": ["tos_acceptance", "privacy_acceptance"]
  }
}
```

#### User Profile

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/users/me` | JWT | 60/min | Get current user profile |
| PATCH | `/users/me` | JWT | 30/min | Update profile (language, preferences) |
| DELETE | `/users/me` | JWT | 5/min | Request account deletion |
| GET | `/users/me/achievements` | JWT | 30/min | List achievements |

---

## 12. Implementation Roadmap

### Phase 1: Minimum Viable Authentication (Week 1-2)

**Goal:** Users can authenticate via Telegram and receive a JWT.

| Deliverable | Details |
|-------------|---------|
| Bot token configuration | Env vars, secret management, bot setup |
| Auth middleware | InitData HMAC-SHA256 verification |
| Auth endpoints | `POST /auth/telegram`, `POST /auth/refresh`, `POST /auth/logout` |
| JWT signing/verification | RS256 key pair, configurable TTL |
| Session management | Refresh token rotation, DB-backed sessions |
| User model | Basic `users` table with Telegram ID as PK |
| Session table | `sessions` table with hashed refresh tokens |
| Client integration | Update `auth.service.ts` to call real endpoints |
| Rate limiting | Initial rate limiter on auth endpoints |

**Files to create/modify:**
- `services/api/src/modules/auth/` (controller, service, guard, middleware, DTOs)
- `services/api/src/modules/user/` (controller, service)
- `packages/prisma/schema.prisma` (User, Session, TelegramAccount models)
- `apps/web/src/services/auth.service.ts` (update for real API)
- `apps/web/src/store/useUserStore.ts` (update for server state)

### Phase 2: Onboarding Engine (Week 3-4)

**Goal:** State machine drives user through onboarding; backend enforces restrictions.

| Deliverable | Details |
|-------------|---------|
| User state machine | Full state model with allowed transitions |
| Onboarding service | REST endpoints, state management, progress tracking |
| State middleware | Restrict API access based on user state |
| Onboarding progress table | `onboarding_progress` table with step tracking |
| Miniapp state sync | Frontend reads/writes onboarding state |
| Stalled user detection | Cron job: check 7d inactivity → ONBOARDING_STALLED |
| Nudge system | Basic Telegram bot nudge messages |

**Files to create/modify:**
- `services/api/src/modules/onboarding/` (controller, service, DTOs)
- `services/api/src/common/guards/StateGuard.ts`
- `packages/prisma/schema.prisma` (OnboardingProgress model)
- `services/worker/src/jobs/onboarding-nudge.job.ts`

### Phase 3: Education System (Week 5-6)

**Goal:** Users complete interactive education modules before accessing platform.

| Deliverable | Details |
|-------------|---------|
| Module catalog | Seed `education_modules` table with 8 modules |
| Education service | Module delivery, progress tracking, quiz engine |
| Quiz engine | Answer validation, scoring, retry logic |
| Education completion table | `education_completions` table |
| Education scoring | Formula-based comprehension scoring |
| Frontend onboarding screens | Education slides within Mini App |
| Quiz UI | Multiple-choice question rendering |
| Content localization | English + 1 additional language (e.g., Russian) |

**Files to create/modify:**
- `services/api/src/modules/education/` (controller, service)
- `packages/prisma/schema.prisma` (EducationModule, EducationCompletion)
- `services/api/src/seed/education-modules.seed.ts`
- `apps/web/src/pages/Onboarding/` (education screens)

### Phase 4: Trust Layer (Week 7-8)

**Goal:** Consent tracking, audit logging, risk communication, achievement system.

| Deliverable | Details |
|-------------|---------|
| Consent service | CRUD for `user_consents`, version tracking, expiry |
| Consent UI | Final form with 6 checkboxes |
| Audit service | `audit_events` table, async logging via queue |
| Achievement system | Basic achievements (Education Graduate) |
| Risk disclosure | Warning boxes, plain language risk communication |
| Trust indicators | Progress bar, education score display |
| Telemetry | Basic onboarding funnel analytics events |

**Files to create/modify:**
- `services/api/src/modules/consent/` (controller, service)
- `services/api/src/modules/audit/` (service)
- `services/api/src/modules/achievement/` (service)
- `packages/prisma/schema.prisma` (UserConsent, AuditEvent, UserAchievement)
- `services/worker/src/jobs/audit-writer.job.ts`
- `apps/web/src/pages/Onboarding/consent.tsx`

### Phase 5: Production Hardening (Week 9-10)

**Goal:** Security hardening, fraud detection, performance optimization, monitoring.

| Deliverable | Details |
|-------------|---------|
| Fraud detection service | Multiple account detection, pattern analysis |
| Rate limiting production | Fine-tuned limits, Redis-backed throttler |
| Session fingerprinting | Device fingerprint binding |
| Concurrent session limit | Max 5 sessions per user |
| Recurring job: session cleanup | Remove expired sessions daily |
| Recurring job: audit partitioning | Monthly partition creation |
| Monitoring & alerting | P99 latency, error rates, fraud alerts via Prometheus/Grafana |
| Load testing | 1000 concurrent auth flows, k6 scripts |
| Security audit | Third-party penetration testing |
| GDPR compliance | Data export, deletion endpoints, consent records |

**Files to create/modify:**
- `services/api/src/modules/security/` (fraud detection)
- `services/api/src/common/guards/FingerprintGuard.ts`
- `services/worker/src/jobs/session-cleanup.job.ts`
- `services/worker/src/jobs/audit-partition.job.ts`
- `infrastructure/monitoring/` (Prometheus rules, Grafana dashboards)
- `tests/load/` (k6 scripts)

### Phase 6: Expansion (Future)

| Feature | Timeline | Dependencies |
|---------|----------|--------------|
| KYC integration | Phase 6+ | Third-party provider selection |
| Multiple languages (5+) | Phase 6+ | i18n infrastructure |
| Advanced achievements | Phase 6+ | Full achievement engine |
| Gamified onboarding | Phase 6+ | Analytics from Phase 4 |
| Onboarding A/B testing | Phase 6+ | Feature flag infrastructure |
| Video education content | Phase 6+ | CDN + video player support |
| Community-driven FAQ | Phase 6+ | Moderation system |

---

## Appendix A: Database Migration Strategy

```typescript
// Migration order for Prisma
// 1. Extend users table (state, kyc_status, security_level, last_login_at, login_count, education_score)
// 2. Create telegram_accounts table
// 3. Create sessions table
// 4. Create onboarding_progress table
// 5. Create education_modules table (seed data)
// 6. Create education_completions table
// 7. Create user_consents table
// 8. Create audit_events table
// 9. Create user_achievements table
// 10. Create indexes and constraints
// 11. Backfill: Set existing users to ELIGIBLE state
```

## Appendix B: Key Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Telegram ID as primary key | Simplifies auth; no need for UUID collision; Telegram ID is permanent |
| Separate telegram_accounts table | Clean separation; supports future Telegram Mini App changes |
| Opaque refresh tokens (not JWT) | Revocable; no expiry in payload; DB-backed control |
| State machine in DB state column | Simple, queryable; avoids event sourcing complexity at this stage |
| Redis for sessions cache | Fast reads for auth validation; TTL-based expiry |
| BullMQ for nudges | Reliable scheduling; retry handling; separate from HTTP path |
| Education as API + DB (not hardcoded) | Modules can be updated without deployment; A/B testable |
| 6 consent checkboxes (not 1 blanket) | Granular compliance; user sees exactly what they agree to |
| No localStorage for access token | XSS protection; token only in memory |
| Education score (0-100) | Trust metric for future features (higher withdrawal limits, etc.) |

## Appendix C: Error Code Reference

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_INIT_DATA` | 401 | Telegram data verification failed |
| `AUTH_DATE_EXPIRED` | 401 | initData `auth_date` > 24 hours old |
| `MISSING_HASH` | 400 | No `hash` field in initData |
| `MALFORMED_INIT_DATA` | 400 | Could not parse initData string |
| `TOKEN_EXPIRED` | 401 | JWT access token expired |
| `TOKEN_INVALID` | 401 | JWT signature invalid |
| `SESSION_REVOKED` | 401 | Refresh token revoked or reused |
| `SESSION_NOT_FOUND` | 404 | Session ID not in database |
| `STATE_BLOCKED` | 403 | Action not allowed in current user state |
| `CONSENT_REQUIRED` | 403 | Required consent not yet given |
| `EDUCATION_INCOMPLETE` | 403 | Required education module not completed |
| `ONBOARDING_NOT_COMPLETE` | 403 | Onboarding must finish before this action |
| `USER_SUSPENDED` | 403 | Account temporarily suspended |
| `USER_BANNED` | 403 | Account permanently banned |
| `USER_DELETED` | 403 | Account deleted |
| `RATE_LIMITED` | 429 | Too many requests |
| `DUPLICATE_CONSENT` | 409 | Consent already recorded for this version |
| `QUIZ_ALREADY_PASSED` | 409 | Quiz already passed, no retry needed |
| `INVALID_STEP_TRANSITION` | 400 | Step transition not allowed from current state |
