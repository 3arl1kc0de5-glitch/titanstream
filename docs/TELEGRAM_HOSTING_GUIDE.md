# TitanStream Telegram Bot Hosting & Deployment Guide

This guide details the complete production hosting and deployment configuration for the TitanStream Telegram Bot and Mini App.

---

## 1. BotFather Registration & Configuration

1. Open Telegram and search for `@BotFather`.
2. Execute `/newbot` to create your production bot.
   - **Name**: `TitanStream Cloud Bot`
   - **Username**: `titanstream_bot` (or your chosen production handle)
3. Copy the HTTP API token issued by BotFather:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   ```
4. Configure Bot Commands via BotFather `/setcommands`:
   ```text
   start - Launch TitanStream Cloud Mini App
   app - Open Cloud Mining Dashboard
   wallet - Check USDT/UGX/RWF Wallet Balance
   machines - View Active Cloud Compute Machines
   referral - Get Referral Link & Rewards
   help - Get Platform Support & FAQs
   ```
5. Set Mini App Menu Button via BotFather `/newapp` or `/setmenubutton`:
   - **Menu Button Title**: `Open TitanStream`
   - **Mini App Web URL**: `https://titanstream.app` (or your HTTPS domain)

---

## 2. Environment Variables Configuration

Configure the following environment variables in your server / container hosting (`.env`):

```env
# Telegram Bot Core
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_BOT_USERNAME="titanstream_bot"
TELEGRAM_MINI_APP_URL="https://titanstream.app"
TELEGRAM_WEBHOOK_URL="https://api.titanstream.app/api/bot/webhook"
TELEGRAM_WEBHOOK_SECRET="ts_sec_webhook_987654321_prod"

# Channel Gate & Community
TELEGRAM_CHANNEL_ID="@titanstream"
TELEGRAM_CHANNEL_USERNAME="titanstream"

# Allowed Web Origins (CORS)
ALLOWED_ORIGINS="https://titanstream.app,https://t.me"

# Platform Environment
NODE_ENV="production"
```

---

## 3. Webhook Registration

To set up production webhook routing with Telegram servers:

### Production Registration API Call
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.titanstream.app/api/bot/webhook",
    "secret_token": "ts_sec_webhook_987654321_prod",
    "allowed_updates": ["message", "callback_query", "my_chat_member"]
  }'
```

### Verification Command
To verify webhook status:
```bash
curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo" | jq .
```

---

## 4. Hosting Architectures

### Production Hosting (Railway / Docker / Cloud Run)
- HTTPS mandatory with TLS 1.2+ certificate.
- Process manager: Docker container running NestJS API service on port `3000`.
- Health check route: GET `/api/health`.

### Development Hosting (Localhost + Ngrok)
1. Start local API server:
   ```bash
   pnpm --filter api dev
   ```
2. Expose local port `3000` via ngrok:
   ```bash
   ngrok http 3000
   ```
3. Set Webhook URL to ngrok HTTPS URL:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<your-subdomain>.ngrok-free.app/api/bot/webhook"
   ```

---

## 5. Verification Checklist

| Item | Status | Verification Command / Step |
| :--- | :--- | :--- |
| **Bot Token Active** | ✅ Validated | `curl https://api.telegram.org/bot<TOKEN>/getMe` |
| **Webhook Endpoint** | ✅ Active | Response `{"ok": true, "result": {"url": "..."}}` |
| **Mini App Launch** | ✅ Configured | Launching `/start` opens embedded WebApp |
| **initData Signature** | ✅ Enforced | Backend validates HMAC-SHA256 hash against Bot Token |
| **Direct Web Access Gate** | ✅ Enforced | Unauthenticated web visits block dashboard & render `Continue with Telegram` |
| **Deep Link Routing** | ✅ Active | `/start ref_123` correctly parses referral parameter |
| **Notifications Push** | ✅ Active | Telegram Bot API delivers instant event alerts to chat |

---

## 6. Authentication Configuration

Production authentication is configured for the live bot, frontend, and backend. Use this section as the repeatable setup record when migrating servers or deploying a new environment.

| Setting | Production Value / Location | Notes |
| :--- | :--- | :--- |
| **Bot Username** | `titanstream_bot` | Must match `TELEGRAM_BOT_USERNAME` and the Telegram Login Widget `data-telegram-login` value. |
| **Authorized Domains** | `titanstream.app`, `titanstream.netlify.app`, production API domain | Configure the web app domain in BotFather for Telegram Login Widget authorization. Keep CORS aligned with these origins. |
| **Mini App URL** | `https://titanstream.app` | Configured in BotFather as the Mini App menu/app URL. |
| **Backend API URL** | Railway production API, `/api/v1` prefix | Frontend reads this from `VITE_API_BASE_URL`; production fallback points to the Railway API. |
| **Bot Token Location** | Backend environment variable `TELEGRAM_BOT_TOKEN` | Never commit or document the token value. Used for Mini App HMAC and Login Widget signature verification. |
| **JWT Secret Location** | Backend environment variable `JWT_SECRET` | Used for access tokens. Must be high entropy and environment-specific. |
| **Refresh Secret Location** | Backend environment variable `JWT_REFRESH_SECRET` | Used for refresh token rotation. Must differ from `JWT_SECRET`. |
| **Session Lifetime** | Access: `15m`; Refresh: `30d` | Access tokens are short-lived. Refresh tokens rotate through `/auth/refresh`. |
| **Frontend Token Store** | Zustand persisted session plus `localStorage.auth_token` | Page refresh restores the session; failed refresh clears it. |

### Web Login Callback Flow

```text
Browser opens https://titanstream.app
  -> Frontend detects no Telegram WebApp initData
  -> Official Telegram Login Widget renders
  -> Telegram returns signed user payload to onTelegramAuth(user)
  -> Frontend POSTs payload to /api/v1/auth/telegram-login
  -> Backend verifies signature with TELEGRAM_BOT_TOKEN
  -> Backend resolves users.telegram_user_id
  -> Backend issues Titan Stream JWT pair
  -> Frontend stores session and loads dashboard
```

### Mini App Signature Verification

```text
Telegram injects window.Telegram.WebApp.initData
  -> Frontend POSTs initData to /api/v1/auth/telegram
  -> Backend sorts all fields except hash
  -> Backend derives secret with HMAC-SHA256("WebAppData", TELEGRAM_BOT_TOKEN)
  -> Backend computes HMAC-SHA256(dataCheckString, secret)
  -> Backend rejects missing, expired, modified, or invalid payloads
```

### Refresh Token Policy

The frontend keeps the existing authenticated session across page refreshes. If a protected API request returns `401`, the client attempts one refresh request through `/api/v1/auth/refresh`. A successful refresh rotates both tokens and retries the original request. A failed refresh clears the session and returns the user to Mini App auto-auth or the web Login Widget, depending on runtime context.
