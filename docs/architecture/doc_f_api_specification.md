# Document F: API Specification

This document details the public and private HTTP endpoints of the TitanStream API service, including parameters, payloads, and response structures.

---

## 1. Versioning Strategy

All API endpoints are versioned prefix-wise in the URL paths (e.g. `/api/v1/`). Major updates will increment the prefix identifier (e.g. `/api/v2/`).

---

## 2. Endpoint Catalog

### 2.1 Authentication & Profile Sync
#### `POST /api/v1/auth/telegram`
* **Purpose:** Auths and syncs users launching from Telegram.
* **Authentication:** None (Public).
* **Request Body:**
```json
{
  "initData": "query_id=xxxx&user=xxxx&hash=xxxx"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "18273645",
      "username": "johndoe",
      "firstName": "John",
      "role": "USER",
      "languageCode": "en"
    }
  }
}
```
* **Validation Rules:** `initData` is a required non-empty string.
* **Rate Limit:** Maximum 15 requests per minute.

---

### 2.2 Mining Controls
#### `POST /api/v1/mining/toggle`
* **Purpose:** Toggle active mining between USDT and TON.
* **Authentication:** Bearer JWT required.
* **Request Body:**
```json
{
  "currency": "TON"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "activeCurrency": "TON",
    "lastSyncAt": "2026-07-28T05:45:00.000Z"
  }
}
```
* **Validation Rules:** `currency` must be one of `USDT`, `TON`.

#### `POST /api/v1/mining/tap`
* **Purpose:** Register cooling clicks to boost/reset cooler speed multiplier.
* **Authentication:** Bearer JWT required.
* **Request Body:**
```json
{
  "tapCount": 15,
  "clientTimestamp": "2026-07-28T05:46:00.000Z"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentMultiplier": 2.45,
    "currentSpeedGhs": 6.37
  }
}
```
* **Validation Rules:** `tapCount` must be an integer between 1 and 50.
* **Rate Limit:** Maximum 300 requests per minute.

---

### 2.3 Quest Management
#### `GET /api/v1/quests`
* **Purpose:** Lists available quests filtered by category.
* **Authentication:** Bearer JWT required.
* **Query Params:** `category` (optional string)
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "q-uuid-1",
      "type": "OURS",
      "title": "Invite 3 friends",
      "rewardType": "BOOST",
      "rewardValue": 1,
      "progress": 0,
      "target": 3,
      "status": "IN_PROGRESS"
    }
  ]
}
```

#### `POST /api/v1/quests/:id/claim`
* **Purpose:** Claims the reward for a completed task.
* **Authentication:** Bearer JWT required.
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "claimedQuestId": "q-uuid-1",
    "rewardValue": 1,
    "rewardType": "BOOST",
    "updatedBalance": 0.2267
  }
}
```

---

### 2.4 Wallet & Withdrawals
#### `POST /api/v1/withdraw`
* **Purpose:** Submit a crypto withdrawal request.
* **Authentication:** Bearer JWT required.
* **Request Body:**
```json
{
  "amount": 12.5,
  "network": "BEP20",
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "requestId": "w-req-uuid-1",
    "amount": 12.5,
    "network": "BEP20",
    "status": "PENDING",
    "createdAt": "2026-07-28T05:46:12.000Z"
  }
}
```
* **Validation Rules:**
  * `amount` must be a positive decimal >= 10.0.
  * `network` must be `TON` or `BEP20`.
  * `walletAddress` must pass blockchain-specific format regex validations.
* **Errors:**
  * 400 Bad Request: Invalid input or balance below threshold.
  * 403 Forbidden: Missing/invalid JWT token.

---

### 2.5 Referral Info
#### `GET /api/v1/referrals`
* **Purpose:** Fetches user's referral stats.
* **Authentication:** Bearer JWT required.
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "invitedCount": 3,
    "multiplierBoost": 1.06,
    "totalEarnedUsdt": 0.000123,
    "totalEarnedTon": 0.000000
  }
}
```
