CREATE TYPE "FinancialAccountStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'SUSPENDED', 'CLOSED');
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'SYSTEM');
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "TransactionStatus" AS ENUM ('CREATED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE "TransactionType" AS ENUM ('INTERNAL_ADJUSTMENT', 'SYSTEM_ALLOCATION', 'REVERSAL');

ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'FINANCIAL_ACCOUNT_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'LEDGER_ENTRY_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'TRANSACTION_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'TRANSACTION_COMPLETED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'TRANSACTION_FAILED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'BALANCE_UPDATED';

CREATE TABLE "assets" (
  "asset_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "decimals" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("asset_code")
);

CREATE TABLE "financial_accounts" (
  "financial_account_id" TEXT NOT NULL,
  "telegram_user_id" BIGINT NOT NULL,
  "status" "FinancialAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "activated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("financial_account_id")
);

CREATE TABLE "ledger_accounts" (
  "ledger_account_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "LedgerAccountType" NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("ledger_account_id")
);

CREATE TABLE "transaction_groups" (
  "transaction_group_id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "finalized_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transaction_groups_pkey" PRIMARY KEY ("transaction_group_id")
);

CREATE TABLE "transactions" (
  "transaction_id" TEXT NOT NULL,
  "financial_account_id" TEXT NOT NULL,
  "transaction_group_id" TEXT,
  "transaction_type" "TransactionType" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'CREATED',
  "asset_code" TEXT NOT NULL,
  "amount" DECIMAL(36,18) NOT NULL,
  "reference" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "processing_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "reversed_at" TIMESTAMP(3),
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

CREATE TABLE "ledger_entries" (
  "ledger_entry_id" TEXT NOT NULL,
  "transaction_group_id" TEXT NOT NULL,
  "financial_account_id" TEXT NOT NULL,
  "ledger_account_id" TEXT NOT NULL,
  "asset_code" TEXT NOT NULL,
  "amount" DECIMAL(36,18) NOT NULL,
  "entry_type" "LedgerEntryType" NOT NULL,
  "reference" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("ledger_entry_id")
);

CREATE UNIQUE INDEX "financial_accounts_telegram_user_id_key" ON "financial_accounts"("telegram_user_id");
CREATE INDEX "financial_accounts_telegram_user_id_idx" ON "financial_accounts"("telegram_user_id");
CREATE INDEX "financial_accounts_status_idx" ON "financial_accounts"("status");
CREATE INDEX "assets_enabled_idx" ON "assets"("enabled");
CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");
CREATE INDEX "ledger_accounts_type_idx" ON "ledger_accounts"("type");
CREATE INDEX "ledger_accounts_enabled_idx" ON "ledger_accounts"("enabled");
CREATE UNIQUE INDEX "transaction_groups_reference_key" ON "transaction_groups"("reference");
CREATE INDEX "transaction_groups_created_at_idx" ON "transaction_groups"("created_at");
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");
CREATE INDEX "transactions_financial_account_id_idx" ON "transactions"("financial_account_id");
CREATE INDEX "transactions_transaction_group_id_idx" ON "transactions"("transaction_group_id");
CREATE INDEX "transactions_status_idx" ON "transactions"("status");
CREATE INDEX "transactions_asset_code_idx" ON "transactions"("asset_code");
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");
CREATE UNIQUE INDEX "ledger_entries_transaction_group_id_reference_entry_type_ledger_account_id_key"
  ON "ledger_entries"("transaction_group_id", "reference", "entry_type", "ledger_account_id");
CREATE INDEX "ledger_entries_transaction_group_id_idx" ON "ledger_entries"("transaction_group_id");
CREATE INDEX "ledger_entries_financial_account_id_idx" ON "ledger_entries"("financial_account_id");
CREATE INDEX "ledger_entries_ledger_account_id_idx" ON "ledger_entries"("ledger_account_id");
CREATE INDEX "ledger_entries_asset_code_idx" ON "ledger_entries"("asset_code");
CREATE INDEX "ledger_entries_created_at_idx" ON "ledger_entries"("created_at");

ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_telegram_user_id_fkey"
  FOREIGN KEY ("telegram_user_id") REFERENCES "users"("telegram_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_financial_account_id_fkey"
  FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts"("financial_account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transaction_group_id_fkey"
  FOREIGN KEY ("transaction_group_id") REFERENCES "transaction_groups"("transaction_group_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_code_fkey"
  FOREIGN KEY ("asset_code") REFERENCES "assets"("asset_code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_group_id_fkey"
  FOREIGN KEY ("transaction_group_id") REFERENCES "transaction_groups"("transaction_group_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_financial_account_id_fkey"
  FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts"("financial_account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_account_id_fkey"
  FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("ledger_account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_asset_code_fkey"
  FOREIGN KEY ("asset_code") REFERENCES "assets"("asset_code") ON DELETE RESTRICT ON UPDATE CASCADE;
