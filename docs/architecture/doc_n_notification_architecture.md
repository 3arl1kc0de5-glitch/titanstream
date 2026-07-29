# Document N: Notification Architecture

This document defines the push, broadcast, template management, and unread tracking infrastructure for notifications.

---

## 1. Notification Dispatch Pipeline

Notifications are routed dynamically through multiple channels (In-App overlays or outbound Telegram Bot API pushes) depending on the message type and user's active session state.

```
[ Trigger Event (Withdrawal, Ref Join, Admin Alert) ]
                       |
                       v
         [ Notification Service Dispatch ]
                       |
                       v
            [ Load Localized Template ]
                       |
                       +-----------------------+
                       |                       |
                       v                       v
               [ In-App Channel ]      [ Telegram Bot Push ]
                       |                       |
                       v                       v
             [ Write DB Alert Record ]   [ Push to BullMQ Telegram Queue ]
                       |                       |
                       v                       v
            [ Client Websocket / Pull ]   [ Outgoing Telegram SendMessage ]
```

---

## 2. Notification Channels

### 2.1 In-App Notifications
* **Storage:** Written to the database (`notifications` table) with fields: `id`, `user_id`, `title`, `body`, `is_read`, `created_at`.
* **Delivery:** Delivered via HTTP long-polling or WebSocket connections. Rendered as a toast alert overlay inside the React UI.

### 2.2 Telegram Bot Pushes
* **Storage:** Queued directly in BullMQ's `notification-queue` to prevent rate-limiting bottlenecks on the main API process.
* **Delivery:** Workers parse queue items and invoke the Telegram Bot API `sendMessage` method.
* **Rate Limits Handling:** Telegram enforces a limit of 30 messages/second for outgoing broadcasts. The queue worker handles backpressure by scheduling jobs sequentially with a `35ms` delay.

---

## 3. Localization & Templates

To prevent hard-coded strings, notifications use a localized template structure.

* **Database Template Schema (`notification_templates`):**
  * `id` (VarChar, Key)
  * `category` (VarChar)
  * `translations` (JSON: key-value translations mapped by language code: `en`, `ru`, `es`).
* **Example Payload:**
```json
{
  "template_id": "withdrawal_success",
  "translations": {
    "en": "Your withdrawal of {amount} USDT is confirmed!",
    "ru": "Ваш вывод {amount} USDT подтвержден!"
  }
}
```
* **Resolution:** The notification engine checks the user's `languageCode` profile field, loads the matching template string, replaces placeholders (e.g. `{amount}`) with variables, and delivers the personalized message.
