# TitanStream Financial Foundation

This layer is the internal accounting foundation for future wallet, deposit, withdrawal, reward, and adjustment flows. It does not integrate with wallet providers, blockchains, exchanges, yield, mining, referrals, or payment gateways.

## Architecture

- `FinancialAccount`: one account per `telegram_user_id`, created only for users that are `READY` or already marked `is_ready`.
- `Asset`: database-configured asset registry. Default seed/config includes `USDT`, `USD`, and `UGX`.
- `LedgerAccount`: chart of accounts. Default accounts are `PLATFORM_RESERVE`, `USER_ASSET_LIABILITY`, `FEES`, `ADJUSTMENTS`, `SUSPENSE`, and `SYSTEM`.
- `TransactionGroup`: immutable journal group used to bind debit and credit entries.
- `LedgerEntry`: immutable accounting entry. Balances are derived from these rows, never manually updated.
- `FinancialTransaction`: internal framework transaction with lifecycle states. This is a framework only, not deposits or withdrawals.

## Ledger Rules

- Every posted group must include at least one debit and one credit.
- Total debits must equal total credits.
- Amounts use `Decimal(36,18)` in PostgreSQL/Prisma.
- Every entry references a valid financial account, ledger account, transaction group, and asset.
- Delete behavior is restricted so financial history is not silently destroyed.
- User balances are derived from `USER_ASSET_LIABILITY` ledger entries: credits increase user balance, debits decrease it.

## Transaction States

Allowed transitions:

- `CREATED` -> `PENDING`, `PROCESSING`, `FAILED`
- `PENDING` -> `PROCESSING`, `FAILED`
- `PROCESSING` -> `COMPLETED`, `FAILED`
- `COMPLETED` -> `REVERSED`
- `FAILED` and `REVERSED` are terminal

## API

- `GET /financial/account`
- `GET /financial/accounts/me`
- `GET /financial/balance`
- `GET /financial/transactions?limit=50&offset=0`
- `GET /financial/ledger?limit=50&offset=0`

All routes use the existing JWT auth guard and derive authorization from `telegram_user_id`.

## Audit Events

The financial layer emits existing audit records for:

- `FINANCIAL_ACCOUNT_CREATED`
- `LEDGER_ENTRY_CREATED`
- `TRANSACTION_CREATED`
- `TRANSACTION_COMPLETED`
- `TRANSACTION_FAILED`
- `BALANCE_UPDATED`
