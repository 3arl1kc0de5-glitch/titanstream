# TetherStream Telegram Bot Hosting & Deployment Guide

This guide details the complete production hosting and deployment configuration for the TetherStream Telegram Bot and Mini App.

---

## 1. BotFather Registration & Configuration

1. Open Telegram and search for `@BotFather`.
2. Execute `/newbot` to create your production bot.
   - **Name**: `TetherStream Cloud Bot`
   - **Username**: `TetherStreamBot` (or your chosen production handle)
3. Copy the HTTP API token issued by BotFather:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   ```
4. Configure Bot Commands via BotFather `/setcommands`:
   ```text
   start - Launch TetherStream Cloud Mini App
   app - Open Cloud Mining Dashboard
   wallet - Check USDT/UGX/RWF Wallet Balance
   machines - View Active Cloud Compute Machines
   referral - Get Referral Link & Rewards
   help - Get Platform Support & FAQs
   ```
5. Set Mini App Menu Button via BotFather `/newapp` or `/setmenubutton`:
   - **Menu Button Title**: `Open TetherStream`
   - **Mini App Web URL**: `https://tetherstream.app` (or your HTTPS domain)

---

## 2. Environment Variables Configuration

Configure the following environment variables in your server / container hosting (`.env`):

```env
# Telegram Bot Core
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_BOT_USERNAME="TetherStreamBot"
TELEGRAM_MINI_APP_URL="https://tetherstream.app"
TELEGRAM_WEBHOOK_URL="https://api.tetherstream.app/api/bot/webhook"
TELEGRAM_WEBHOOK_SECRET="ts_sec_webhook_987654321_prod"

# Channel Gate & Community
TELEGRAM_CHANNEL_ID="@tetherstream"
TELEGRAM_CHANNEL_USERNAME="tetherstream"

# Allowed Web Origins (CORS)
ALLOWED_ORIGINS="https://tetherstream.app,https://t.me"

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
    "url": "https://api.tetherstream.app/api/bot/webhook",
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
