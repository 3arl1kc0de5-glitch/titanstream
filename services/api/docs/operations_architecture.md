# Operations Control Plane Architecture

The TitanStream Operations Control Plane is the human-operator interface for managing live operations, merchant pools, settlement exceptions, user investigations, and risk incidents.

## Core Architectural Invariants

1. **Read-Only Financial Truth**:
   - Double-entry ledger entries, balance accounts, and finalized settlement records are **strictly immutable**.
   - No operator action or API endpoint allows direct editing of user ledger balances or ledger transactions.

2. **Orchestrator Enforcement**:
   - All value-moving or balance-changing actions pass through the `FinancialOrchestratorService` or `SettlementEngine`.
   - Admin actions (e.g. `USER_FREEZE`, `SETTLEMENT_PAUSE`, `REASSIGN_MERCHANT`) alter workflow states, not ledger balances.

3. **Mandatory Audit Logging**:
   - Every privileged endpoint invocation produces an immutable record in `OperationalAuditLog` capturing `actorId`, `actorRole`, `action`, `entity`, `entityId`, and detailed execution payload metadata.

4. **Layered RBAC**:
   - Access to control plane endpoints is governed by `AdminAuthGuard` and `RbacGuard` verifying explicit role-based permissions (`@Permissions(...)`).
