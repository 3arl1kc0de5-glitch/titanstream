# Document G: Authentication Architecture

This document defines the cryptographic authentication protocol, session states, and JWT token management strategies.

---

## 1. Telegram InitData Verification Protocol

When the Telegram Mini App launches, it passes a query-string parameter representing the user session: `window.Telegram.WebApp.initData`. The server validates this payload before issuing credentials.

```
                  [ WebApp Client ]
                          |
                          |  POST /auth/telegram { initData }
                          v
               [ NestJS Auth Middleware ]
                          |
  1. Parse query: key=value keys (excluding 'hash')
  2. Sort keys alphabetically: k1=v1\nk2=v2\n...
  3. Generate key: HMAC-SHA256("WebAppData", BotToken)
  4. Calc signature: HMAC-SHA256(SecretKey, SortedParams)
  5. Check: signature == client_supplied_hash?
                          |
                +---------+---------+
                |                   |
           [ Valid ]            [ Invalid ]
                |                   |
     Generate JWT Session     Return HTTP 401
```

### 1.1 Verification Algorithm Code Hook (TypeScript)
```typescript
import { createHmac } from 'crypto';

export function verifyTelegramInitData(initDataString: string, botToken: string): boolean {
  const params = new URLSearchParams(initDataString);
  const hash = params.get('hash');
  if (!hash) return false;

  // Extract all parameters except 'hash', sort alphabetically
  const keys = Array.from(params.keys()).filter((key) => key !== 'hash');
  keys.sort();

  const dataCheckString = keys
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n');

  // HMAC-SHA256 calculation
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}
```

---

## 2. Replay Attack Prevention

* **Timestamp Check (`auth_date`):**
  * The verified `initData` payload contains an `auth_date` integer timestamp.
  * The NestJS server extracts `auth_date` and verifies it against the current server system time.
  * **Tolerance window:** If `auth_date` is older than `24 hours` (86,400 seconds), the authentication request is rejected (HTTP 401 Unauthorized) to prevent attackers from using captured old query packets.

---

## 3. JWT & Session Management

TitanStream uses a dual-token JWT setup to maintain secure, stateless user authorization.

* **Access Token:**
  * **Duration:** 15 minutes.
  * **Payload:** `{ sub: user_id, role: role }`.
  * **Delivery:** JSON HTTP response body, stored in-memory by the React client.
* **Refresh Token:**
  * **Duration:** 30 days.
  * **Delivery:** HTTP-Only, Secure, SameSite=Strict Cookie named `refresh_token`.
  * **Storage:** Persisted in the database. Regenerated on rotation. Revoked on logout.

---

## 4. Referral Binding Flow

If a new user accesses the bot via a referral link, the deep link parameter `start_param` (e.g. `ref_Z72G1X5A`) is passed in `initDataUnsafe`.

1. The client sends the string representation to `/api/v1/auth/telegram`.
2. The authentication service parses the user payload.
3. If the User ID does not exist in the database:
   * Registers a new User profile.
   * Extracts the referrer ID from the `start_param` (decoding `Z72G1X5A` back to a numerical Telegram ID).
   * Verifies the referrer user exists in the database.
   * Binds `User.referrer_id = Referrer.id` and executes a background job (BullMQ) to update the referrer's `invited_count` and increment their boost multiplier by `+0.02x`.
4. If the User ID already exists, the `start_param` is ignored to prevent self-referring or multi-referring exploits.
