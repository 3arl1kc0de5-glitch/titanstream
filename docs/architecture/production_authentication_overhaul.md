# Titan Stream Production Authentication Overhaul

## Root Cause Analysis

### Mini App "Verifying..." Deadlock

The Mini App flow had competing authentication owners. `TelegramContext` submitted `initData` to the backend, while `TelegramLoginScreen` also attempted Mini App authentication. Error paths were inconsistent: some verifier failures returned `null`, the login screen did not always clear loading state, and the provider could create fake fallback tokens after backend failure. That combination could leave the app on "Verifying..." without a real JWT or a user-facing failure stage.

Fix: Telegram SDK initialization is now separate from authentication. The auth gate owns Mini App authentication, clears loading in `finally`, stores only real backend JWTs, and shows a retryable error for missing `initData`, network failure, invalid HMAC, or server rejection.

### Web Bot Redirect

Standalone web login included a button that opened `https://t.me/<bot>/app`. That made bot launch part of web authentication and bypassed the intended Telegram Login Widget flow.

Fix: standalone web mode renders the official Telegram Login Widget and submits its signed payload to `POST /auth/telegram-login`. The bot redirect is no longer part of web authentication.

## Unified Identity Architecture

Telegram ID is the canonical account key. Both providers normalize Telegram identity and call the same backend method:

```text
Telegram Mini App initData
  -> TelegramAuthService.parseInitData
  -> AuthService.authenticateTelegramIdentity
  -> users.telegram_user_id
  -> provision related records
  -> JWT pair

Telegram Login Widget payload
  -> TelegramAuthService.parseWebLoginPayload
  -> AuthService.authenticateTelegramIdentity
  -> users.telegram_user_id
  -> provision related records
  -> JWT pair
```

The schema currently supports atomic provisioning for User, onboarding progress, financial account, referral code, trust profile, level record, notification preferences, referral relationship, and audit records. Future fleet/titan/settings tables must reference the same `users.telegram_user_id` key and be added to the same provisioning transaction.

## Sequence Diagrams

Mini App:

```text
Telegram client -> Web frontend: inject window.Telegram.WebApp.initData
Web frontend -> Web frontend: initialize WebApp, trace initData presence
Web frontend -> API: POST /auth/telegram { initData }
API -> API: validate Telegram HMAC
API -> DB: find users.telegram_user_id
API -> DB: create or verify identity resources atomically
API -> API: issue access and refresh JWTs
API -> Web frontend: auth response
Web frontend -> localStorage/Zustand: persist session
Web frontend -> Dashboard: render app
```

Standalone Web:

```text
Browser -> Web frontend: open titanstream.app
Web frontend -> Telegram Widget: render official login widget
Telegram Widget -> Web frontend: signed login payload
Web frontend -> API: POST /auth/telegram-login
API -> API: validate Telegram Login signature
API -> DB: find users.telegram_user_id
API -> DB: create or verify identity resources atomically
API -> API: issue access and refresh JWTs
API -> Web frontend: auth response
Web frontend -> localStorage/Zustand: persist session
Web frontend -> Dashboard: render app
```

## Session Lifecycle

Access tokens expire after 15 minutes. Refresh tokens expire after 30 days. The frontend persists the current session and restores it after page refreshes. Protected API calls that receive `401` are retried once through `POST /auth/refresh`; successful refresh rotates both tokens in the local session. Failed refresh clears the session and returns the user to the relevant auth flow. Logout clears the local session and access token.

## Observability

Frontend and backend now log correlation-style auth traces:

```text
[AUTH_TRACE:<id>] mini_app.detected
[AUTH_TRACE:<id>] mini_app.request_sent POST /auth/telegram
[AUTH_TRACE:<id>] mini_app.signature_verified
[AUTH_TRACE:<id>] identity.user_lookup
[AUTH_TRACE:<id>] identity.resources_verified
[AUTH_TRACE:<id>] jwt.issued
[AUTH_TRACE:<id>] auth.completed
[AUTH_TRACE:<id>] web_widget rendered
```

Failures log the precise stage and expose a recoverable user message instead of leaving the UI on "Verifying...".

## Security Validation

The backend rejects missing bot tokens, malformed payloads, expired auth dates, tampered Mini App `initData`, and tampered Telegram Login Widget payloads. Frontend Telegram identity is never trusted directly; it is only submitted as signed Telegram data. User creation and related resource provisioning run in database transactions to prevent partially-created accounts.

## Validation Report

Automated checks performed:

```text
pnpm --filter web build
pnpm --filter @titanstream/api build
pnpm --filter @titanstream/api test -- auth
```

The targeted auth tests cover signed Mini App payloads, tampered Mini App payloads, signed Telegram Login Widget payloads, and tampered widget payloads. The e2e suite includes a same-Telegram-ID cross-provider assertion so web and Mini App auth converge on one user and one financial account.
