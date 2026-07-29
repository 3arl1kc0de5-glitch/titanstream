# Operator Settlement Engine

The settlement engine bridges customer payments to external value providers while preserving a single accounting path into the Financial Orchestrator.

## Provider Architecture

All external value enters through a `SettlementProvider`.

```ts
interface SettlementProvider {
  createSettlement()
  validateSettlement()
  monitorSettlement()
  approveSettlement()
  rejectSettlement()
  expireSettlement()
  cancelSettlement()
  emitSettlementEvent()
}
```

Implemented providers:

- `INTERNAL_OPERATIONS` wraps the Operator Settlement Engine for Mobile Money to operator CryptoBot fulfillment.
- `CRYPTOBOT` isolates direct CryptoBot settlement design behind an adapter.

Providers emit the same business events. The Financial Orchestrator only receives approved settlements through the provider-independent approval path.

## Capability Manifests

Every provider exposes a manifest through `GET /api/v1/settlement/providers`.

```json
{
  "provider": "CRYPTOBOT",
  "supports_buy": true,
  "supports_sell": false,
  "supports_refunds": false,
  "supports_webhooks": true,
  "supports_manual_review": false,
  "supports_partial_payments": false,
  "supported_assets": ["USDT"]
}
```

The frontend and routing engine should discover capabilities from the manifest instead of hardcoding provider assumptions.

## Universal APIs

- `GET /api/v1/settlement/providers`
- `POST /api/v1/settlement/session`
- `GET /api/v1/settlement/session/:settlementId`
- `POST /api/v1/settlement/session/:settlementId/cancel`
- `GET /api/v1/settlement/history`

Universal API responses are provider-independent and include `provider`, `reference`, `asset`, `requestedAmount`, `expectedAssetAmount`, `exchangeRate`, `status`, and expiry fields.

## State Machine

Common external states:

- `CREATED`
- `INITIALIZED`
- `WAITING_FOR_PAYMENT`
- `VERIFYING`
- `APPROVED`
- `POSTED`
- `COMPLETED`
- `FAILED`
- `REJECTED`
- `EXPIRED`
- `CANCELLED`
- `DISPUTED`

Operator-specific internal states such as `PAYMENT_RECEIVED` and `USDT_SENT` remain behind the operator provider boundary.

## Customer APIs

- `POST /api/v1/settlements` creates a buy settlement session and returns only the reference code, Mobile Money number, amount, asset, status, and expiry timer.
- `GET /api/v1/settlements/:settlementId` returns the redacted customer settlement status.

## Operator Management APIs

- `POST /api/v1/operators` creates a operator profile.
- `GET /api/v1/operators` lists operator profiles.
- `PATCH /api/v1/operators/:operatorId/availability/:availability` updates availability.
- `PATCH /api/v1/operators/:operatorId/suspend` suspends a operator.

## Operator Portal APIs

Operator portal requests include `x-operator-id`.

- `GET /api/v1/operator-portal/settlements`
- `POST /api/v1/operator-portal/settlements/:settlementId/accept`
- `POST /api/v1/operator-portal/settlements/:settlementId/reject`
- `POST /api/v1/operator-portal/settlements/:settlementId/payment-received`
- `POST /api/v1/operator-portal/settlements/:settlementId/usdt-sent`
- `POST /api/v1/operator-portal/settlements/:settlementId/notes`

When USDT is marked sent, the service validates operator ownership, active session state, expiry, amount consistency, and duplicate completion before calling the Financial Orchestrator with a stable idempotency key.

## Adding A Provider

1. Add the provider id to `SettlementProviderId`.
2. Implement `SettlementProvider`.
3. Define the capability manifest.
4. Register the adapter in `ProviderRegistryService`.
5. Store provider-specific details in `providerMetadata`; do not add provider-specific ledger behavior.
6. Emit common settlement events and call the Financial Orchestrator only after `SettlementApproved`.
