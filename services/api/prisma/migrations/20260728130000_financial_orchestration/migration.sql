CREATE TYPE "FinancialOperationType" AS ENUM ('INTERNAL_ADJUSTMENT', 'SYSTEM_ALLOCATION', 'REVERSAL');
CREATE TYPE "FinancialOperationStatus" AS ENUM ('REQUESTED', 'VALIDATED', 'AUTHORIZED', 'EXECUTING', 'POSTED', 'COMPLETED', 'FAILED_VALIDATION', 'FAILED_RISK', 'FAILED_EXECUTION', 'FAILED_EXTERNAL_PROVIDER', 'CANCELLED');
CREATE TYPE "IdempotencyStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');
CREATE TYPE "FinancialRuleType" AS ENUM ('USER_READY', 'ACCOUNT_ACTIVE', 'ASSET_ENABLED', 'MIN_AMOUNT', 'DAILY_LIMIT');
CREATE TYPE "DomainEventType" AS ENUM ('FINANCIAL_OPERATION_REQUESTED', 'FINANCIAL_OPERATION_AUTHORIZED', 'LEDGER_POSTING_STARTED', 'LEDGER_POSTING_COMPLETED', 'LEDGER_POSTING_FAILED', 'BALANCE_CHANGED');
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('CREATED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "financial_operations" (
  "operation_id" TEXT NOT NULL,
  "telegram_user_id" BIGINT NOT NULL,
  "financial_account_id" TEXT NOT NULL,
  "transaction_id" TEXT,
  "operation_type" "FinancialOperationType" NOT NULL,
  "status" "FinancialOperationStatus" NOT NULL DEFAULT 'REQUESTED',
  "asset_code" TEXT NOT NULL,
  "amount" DECIMAL(36,18) NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "request_payload" JSONB NOT NULL,
  "failure_code" TEXT,
  "failure_reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "financial_operations_pkey" PRIMARY KEY ("operation_id")
);

CREATE TABLE "financial_rules" (
  "financial_rule_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "rule_type" "FinancialRuleType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "asset_code" TEXT,
  "operation_type" "FinancialOperationType",
  "parameters" JSONB NOT NULL DEFAULT '{}',
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_rules_pkey" PRIMARY KEY ("financial_rule_id")
);

CREATE TABLE "financial_idempotency_records" (
  "idempotency_record_id" TEXT NOT NULL,
  "telegram_user_id" BIGINT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "status" "IdempotencyStatus" NOT NULL DEFAULT 'STARTED',
  "operation_id" TEXT,
  "response_payload" JSONB,
  "locked_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_idempotency_records_pkey" PRIMARY KEY ("idempotency_record_id")
);

CREATE TABLE "financial_workflow_steps" (
  "workflow_step_id" TEXT NOT NULL,
  "operation_id" TEXT NOT NULL,
  "previous_status" "FinancialOperationStatus",
  "new_status" "FinancialOperationStatus" NOT NULL,
  "trigger" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_workflow_steps_pkey" PRIMARY KEY ("workflow_step_id")
);

CREATE TABLE "financial_domain_events" (
  "domain_event_id" TEXT NOT NULL,
  "operation_id" TEXT,
  "telegram_user_id" BIGINT,
  "financial_account_id" TEXT,
  "transaction_id" TEXT,
  "event_type" "DomainEventType" NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_domain_events_pkey" PRIMARY KEY ("domain_event_id")
);

CREATE TABLE "reconciliation_runs" (
  "reconciliation_run_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'CREATED',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "summary" JSONB,
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("reconciliation_run_id")
);

CREATE TABLE "reconciliation_checkpoints" (
  "reconciliation_checkpoint_id" TEXT NOT NULL,
  "reconciliation_run_id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "external_ref" TEXT,
  "ledger_ref" TEXT,
  "status" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reconciliation_checkpoints_pkey" PRIMARY KEY ("reconciliation_checkpoint_id")
);

CREATE UNIQUE INDEX "financial_operations_reference_key" ON "financial_operations"("reference");
CREATE UNIQUE INDEX "financial_operations_telegram_user_id_idempotency_key_key" ON "financial_operations"("telegram_user_id", "idempotency_key");
CREATE INDEX "financial_operations_telegram_user_id_idx" ON "financial_operations"("telegram_user_id");
CREATE INDEX "financial_operations_financial_account_id_idx" ON "financial_operations"("financial_account_id");
CREATE INDEX "financial_operations_transaction_id_idx" ON "financial_operations"("transaction_id");
CREATE INDEX "financial_operations_status_idx" ON "financial_operations"("status");
CREATE INDEX "financial_operations_asset_code_idx" ON "financial_operations"("asset_code");
CREATE INDEX "financial_operations_created_at_idx" ON "financial_operations"("created_at");
CREATE UNIQUE INDEX "financial_rules_code_key" ON "financial_rules"("code");
CREATE INDEX "financial_rules_enabled_idx" ON "financial_rules"("enabled");
CREATE INDEX "financial_rules_rule_type_idx" ON "financial_rules"("rule_type");
CREATE INDEX "financial_rules_asset_code_idx" ON "financial_rules"("asset_code");
CREATE UNIQUE INDEX "financial_idempotency_records_telegram_user_id_idempotency_key_key" ON "financial_idempotency_records"("telegram_user_id", "idempotency_key");
CREATE INDEX "financial_idempotency_records_operation_id_idx" ON "financial_idempotency_records"("operation_id");
CREATE INDEX "financial_idempotency_records_status_idx" ON "financial_idempotency_records"("status");
CREATE INDEX "financial_workflow_steps_operation_id_idx" ON "financial_workflow_steps"("operation_id");
CREATE INDEX "financial_workflow_steps_new_status_idx" ON "financial_workflow_steps"("new_status");
CREATE INDEX "financial_workflow_steps_created_at_idx" ON "financial_workflow_steps"("created_at");
CREATE INDEX "financial_domain_events_operation_id_idx" ON "financial_domain_events"("operation_id");
CREATE INDEX "financial_domain_events_telegram_user_id_idx" ON "financial_domain_events"("telegram_user_id");
CREATE INDEX "financial_domain_events_financial_account_id_idx" ON "financial_domain_events"("financial_account_id");
CREATE INDEX "financial_domain_events_transaction_id_idx" ON "financial_domain_events"("transaction_id");
CREATE INDEX "financial_domain_events_event_type_idx" ON "financial_domain_events"("event_type");
CREATE INDEX "financial_domain_events_created_at_idx" ON "financial_domain_events"("created_at");
CREATE INDEX "reconciliation_runs_source_idx" ON "reconciliation_runs"("source");
CREATE INDEX "reconciliation_runs_status_idx" ON "reconciliation_runs"("status");
CREATE INDEX "reconciliation_runs_created_at_idx" ON "reconciliation_runs"("created_at");
CREATE INDEX "reconciliation_checkpoints_reconciliation_run_id_idx" ON "reconciliation_checkpoints"("reconciliation_run_id");
CREATE INDEX "reconciliation_checkpoints_subject_idx" ON "reconciliation_checkpoints"("subject");
CREATE INDEX "reconciliation_checkpoints_status_idx" ON "reconciliation_checkpoints"("status");

ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_telegram_user_id_fkey"
  FOREIGN KEY ("telegram_user_id") REFERENCES "users"("telegram_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_financial_account_id_fkey"
  FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts"("financial_account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_workflow_steps" ADD CONSTRAINT "financial_workflow_steps_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "financial_operations"("operation_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_domain_events" ADD CONSTRAINT "financial_domain_events_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "financial_operations"("operation_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_checkpoints" ADD CONSTRAINT "reconciliation_checkpoints_reconciliation_run_id_fkey"
  FOREIGN KEY ("reconciliation_run_id") REFERENCES "reconciliation_runs"("reconciliation_run_id") ON DELETE RESTRICT ON UPDATE CASCADE;
