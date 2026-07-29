# TitanStream API — Backend Foundation

## Architecture Overview

```
Telegram Client (Mini App)
       │
       │ initData (HMAC-SHA256 signed)
       ▼
┌─────────────────────────────┐
│    TitanStream API          │
│    NestJS + Prisma + JWT    │
│                             │
│  ┌───────────────────────┐  │
│  │  Auth Module          │  │
│  │  - Telegram verify    │  │
│  │  - JWT issuance       │  │
│  │  - Session refresh    │  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │  Onboarding Module    │  │
│  │  - State machine      │  │
│  │  - Progress tracking  │  │
│  │  - Resume support     │  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │  Education Module     │  │
│  │  - Module delivery    │  │
│  │  - Quiz engine        │  │
│  │  - Comprehension      │  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │  Consent Module       │  │
│  │  - Consent recording  │  │
│  │  - Version tracking   │  │
│  │  - Status checks      │  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │  Readiness Engine     │  │
│  │  - Scoring (0-100)    │  │
│  │  - Decision logic     │  │
│  │  - History tracking   │  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │  Audit Module         │  │
│  │  - Event logging      │  │
│  │  - Event types        │  │
│  │  - Query API          │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  PostgreSQL                 │
│  (via Prisma ORM)           │
│                             │
│  Tables:                    │
│  - users                    │
│  - onboarding_progress      │
│  - education_modules        │
│  - education_completions    │
│  - user_consents            │
│  - audit_events             │
│  - readiness_scores         │
│  - readiness_history        │
│  - user_state_transitions   │
└─────────────────────────────┘
```

## Core Identity Principle

**Telegram User ID** is the primary and unique identifier (`telegram_user_id`) for every user across all tables. No separate internal user identity is created.

## API Endpoints

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/telegram` | Public | Authenticate via Telegram initData |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| GET | `/api/v1/auth/profile` | JWT | Get user + onboarding + readiness |

### Onboarding
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/onboarding/state` | JWT | Get onboarding state |
| POST | `/api/v1/onboarding/start` | JWT | Start onboarding flow |
| POST | `/api/v1/onboarding/step` | JWT | Complete a step |
| POST | `/api/v1/onboarding/resume` | JWT | Resume stalled onboarding |
| GET | `/api/v1/onboarding/progress` | JWT | Detailed progress |

### Education
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/education/modules` | JWT | List modules with progress |
| POST | `/api/v1/education/modules/:id/start` | JWT | Start a module |
| POST | `/api/v1/education/modules/:id/progress` | JWT | Update slide progress |
| POST | `/api/v1/education/modules/:id/answer` | JWT | Submit quiz answer |
| POST | `/api/v1/education/modules/:id/complete` | JWT | Complete a module |
| GET | `/api/v1/education/modules/:id/content` | JWT | Get module content |

### Consent
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/consent/required` | JWT | List required consents |
| GET | `/api/v1/consent/status` | JWT | Get consent status |
| POST | `/api/v1/consent/:type` | JWT | Record a consent |
| POST | `/api/v1/consent/:type/revoke` | JWT | Revoke a consent |

### Readiness
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/readiness` | JWT | Get readiness score |
| POST | `/api/v1/readiness/calculate` | JWT | Force recalculation |
| GET | `/api/v1/readiness/history` | JWT | Get score history |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/me` | JWT | Get user profile |
| PATCH | `/api/v1/users/me` | JWT | Update user profile |

## Readiness Score Formula

```
Readiness Score = Education (30%) + Trust (25%) + Engagement (20%) + Risk (25%)
```

### Education Score (30%)
- 40% Module completion ratio
- 35% Quiz score average
- 25% Time spent indicator

### Trust Score (25%)
- 60% Consent completion ratio
- 25% Education completion trust
- 15% Login count indicator

### Engagement Score (20%)
- 40% Recent activity
- 40% Education progress
- 20% Login frequency

### Risk Score (25%)
- Base 100, deductions for:
  - No login activity (-20)
  - Suspended/frozen state (-30 to -50)
  - Deleted account (0)

## User State Machine

```
NEW → AUTHENTICATED → ONBOARDING_STARTED → ONBOARDING_WELCOME
  → ONBOARDING_EDUCATION → EDUCATION_COMPLETE → CONSENT_PENDING
  → READY_FOR_PLATFORM → ELIGIBLE_USER → ACTIVE_USER

Stalled/Dormant:
  Any ONB_* (24h inactive) → ONBOARDING_STALLED → resume → previous
  ACTIVE (30d inactive) → DORMANT_USER → login → ACTIVE

Exceptional:
  Any state → CONSENT_EXPIRED → re-consent → previous
  Any state → FROZEN → support → resume / SUSPENDED
  Any state → SUSPENDED → appeal → ACTIVE or BANNED
  Any state → DELETED (GDPR)
```

## Event System

Every important action generates an audit event with:
- `telegramUserId` — user identifier
- `eventType` — event classification
- `timestamp` — when it happened
- `metadata` — contextual data
- `ipAddress`, `userAgent`, `sessionId` — request context

### Event Types
- `USER_AUTHENTICATED`, `USER_CREATED`, `USER_UPDATED`
- `ONBOARDING_STARTED`, `ONBOARDING_STEP_COMPLETED`, `ONBOARDING_COMPLETED`
- `EDUCATION_MODULE_STARTED`, `EDUCATION_MODULE_COMPLETED`, `EDUCATION_QUIZ_ANSWERED`
- `CONSENT_RECORDED`, `CONSENT_ALL_COMPLETED`
- `READINESS_SCORED`, `USER_READY`, `USER_NOT_READY`
- `USER_STATE_CHANGED`, `ACCOUNT_SUSPENDED`, `SECURITY_EVENT`

## Database Schema

All tables use `telegram_user_id` as the foreign key referencing `users.telegram_user_id`.

Key tables:
- **users** — Core user record, Telegram identity, state, scores
- **onboarding_progress** — Per-user onboarding step tracking
- **education_modules** — Module catalog (seeded)
- **education_completions** — Per-user per-module progress and quiz results
- **user_consents** — Immutable consent records with versioning
- **audit_events** — Full audit trail of all important actions
- **readiness_scores** — Current readiness score (upserted)
- **readiness_history** — Score history over time
- **user_state_transitions** — State machine transition log

## Setup Instructions

### Prerequisites
- Node.js 22+
- pnpm
- PostgreSQL 16+

### Installation
```bash
cd services/api
pnpm install
```

### Database
```bash
# Set DATABASE_URL in .env
pnpm prisma:migrate --name init
pnpm prisma:seed
```

### Running
```bash
pnpm dev          # Development with watch
pnpm start:prod   # Production
```

### Testing
```bash
pnpm test         # Unit tests
pnpm test:e2e     # E2E tests
```

### API Documentation
```bash
# Start the server, then visit:
http://localhost:3000/docs
```