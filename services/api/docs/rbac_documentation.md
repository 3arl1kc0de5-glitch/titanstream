# Role-Based Access Control (RBAC) Specification

TitanStream implements fine-grained RBAC for all operational APIs.

## Admin Roles

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Complete access across all permissions and system settings |
| `OPERATIONS_ADMIN` | Settlement operations, merchant overrides, internal support, and review |
| `FINANCE_ADMIN` | Financial reconciliation, volume audits, and read-only accounting views |
| `RISK_OPERATOR` | Risk event management, user freezing, and suspicious pattern investigations |
| `MERCHANT_MANAGER` | Merchant onboarding, limits adjustment, and performance reviews |
| `SUPPORT_AGENT` | Read-only user investigation and internal support case resolution |

## Permissions Matrix

| Permission | Description | SUPER_ADMIN | OPERATIONS_ADMIN | FINANCE_ADMIN | RISK_OPERATOR | MERCHANT_MANAGER | SUPPORT_AGENT |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `settlement.view` | View settlement queues & details | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `settlement.review` | Review & note settlements | ✓ | ✓ | | | | |
| `settlement.override` | Reassign merchant / pause settlement | ✓ | ✓ | | | | |
| `merchant.create` | Onboard new merchants | ✓ | ✓ | | | ✓ | |
| `merchant.view` | Inspect merchant profiles | ✓ | ✓ | ✓ | | ✓ | |
| `merchant.suspend` | Suspend or reactivate merchants | ✓ | ✓ | | | ✓ | |
| `user.view` | Investigate user profiles & activity | ✓ | ✓ | | ✓ | | ✓ |
| `user.freeze` | Freeze/unfreeze user accounts | ✓ | | | ✓ | | |
| `risk.manage` | Triage & resolve risk events | ✓ | | | ✓ | | |
| `financial.view` | Access financial audit logs | ✓ | | ✓ | | | |
| `support.manage` | Manage support cases | ✓ | ✓ | | | | ✓ |
