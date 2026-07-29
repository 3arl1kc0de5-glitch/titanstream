# Support Workflow Documentation

Internal support case management provides structured tracking for user and merchant inquiries.

## Support Case Lifecycle

1. **Category**:
   - `PAYMENT_ISSUE`: Payment confirmation delays or fiat deposit mismatch.
   - `SETTLEMENT_DELAY`: Operator fulfillment speed issues.
   - `MERCHANT_ISSUE`: Merchant account or channel availability.
   - `ACCOUNT_ISSUE`: User onboarding or readiness status questions.
   - `TECHNICAL_ISSUE`: API or provider webhook failures.

2. **Status Workflow**:
   - `OPEN` -> `ASSIGNED` -> `WAITING` -> `RESOLVED` -> `CLOSED`.

3. **User Investigation Tools**:
   - Operators search users by Telegram ID, Telegram Username, Settlement Reference, or Transaction Reference via `GET /admin/users`.
   - Complete history view includes Readiness score, active balance, linked settlements, risk flags, and support history.
