# Risk Management & Incident Handling

## Risk Event Lifecycle

Risk events are created automatically by `SettlementRiskService` rules (velocity breaches, tier capacity limits) or manually via operator escalation.

- **Severity Levels**:
  - `LOW`: Soft warning or velocity threshold approach.
  - `MEDIUM`: Tier limit exceeded or unexpected transaction timing.
  - `HIGH`: Rapid submission block or proof-of-payment discrepancy.
  - `CRITICAL`: Multiple failed attempts or flagged user account.

- **Statuses**:
  - `OPEN`: Newly triggered event awaiting triage.
  - `UNDER_REVIEW`: Assigned to a Risk Operator.
  - `RESOLVED`: Addressed and verified safe.
  - `DISMISSED`: Determined to be a false positive.

- **Account Restrictions**:
  - A `RISK_OPERATOR` can freeze a user account (`POST /admin/users/:id/freeze`), transitioning the user state to `SUSPENDED` and blocking session creation.
