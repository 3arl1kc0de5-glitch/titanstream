# Operations Control Plane API Reference

All administrative endpoints require authentication (`AdminAuthGuard`) and explicit permission verification (`RbacGuard`).

## Dashboard APIs

- `GET /admin/dashboard`
  - Required Permission: `settlement.view`
  - Response: System overview metrics (active users, merchants, volume, settlement counts) and operational queues.

## Settlement Management APIs

- `GET /admin/settlements`
  - Required Permission: `settlement.view`
  - Query Params: `status`, `provider`, `fromDate`, `toDate`, `merchantId`, `telegramUserId`, `limit`, `offset`
- `GET /admin/settlements/:id`
  - Required Permission: `settlement.view`
- `POST /admin/settlements/:id/review`
  - Required Permission: `settlement.review`
  - Body: `{ "note": string, "actionStatus"?: string }`
- `POST /admin/settlements/:id/escalate`
  - Required Permission: `settlement.review`
  - Body: `{ "reason": string }`
- `POST /admin/settlements/:id/reassign`
  - Required Permission: `settlement.override`
  - Body: `{ "merchantId": string }`
- `POST /admin/settlements/:id/pause`
  - Required Permission: `settlement.override`
  - Body: `{ "reason": string }`

## Merchant Administration APIs

- `GET /admin/merchants`
  - Required Permission: `merchant.view`
- `POST /admin/merchants`
  - Required Permission: `merchant.create`
- `GET /admin/merchants/:id`
  - Required Permission: `merchant.view`
- `PATCH /admin/merchants/:id/status`
  - Required Permission: `merchant.suspend`
  - Body: `{ "status": "ACTIVE" | "PAUSED" | "SUSPENDED" | "DISABLED", "reason"?: string }`
- `PATCH /admin/merchants/:id/limits`
  - Required Permission: `merchant.create`
  - Body: `{ "dailyLimitUsd": string }`
- `GET /admin/merchants/:id/performance`
  - Required Permission: `merchant.view`

## User Investigation APIs

- `GET /admin/users`
  - Required Permission: `user.view`
  - Query Params: `telegramUserId`, `telegramUsername`, `settlementReference`, `transactionReference`
- `GET /admin/users/:id`
  - Required Permission: `user.view`
- `POST /admin/users/:id/freeze`
  - Required Permission: `user.freeze`
  - Body: `{ "reason": string }`
- `POST /admin/users/:id/unfreeze`
  - Required Permission: `user.freeze`
  - Body: `{ "reason": string }`

## Risk Operations APIs

- `GET /admin/risk-events`
  - Required Permission: `risk.manage`
- `POST /admin/risk-events`
  - Required Permission: `risk.manage`
- `PATCH /admin/risk-events/:id`
  - Required Permission: `risk.manage`

## Support System APIs

- `GET /admin/cases`
  - Required Permission: `support.manage`
- `POST /admin/cases`
  - Required Permission: `support.manage`
- `PATCH /admin/cases/:id`
  - Required Permission: `support.manage`
