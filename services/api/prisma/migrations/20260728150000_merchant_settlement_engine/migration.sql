CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "MerchantAvailability" AS ENUM ('ONLINE', 'OFFLINE', 'PAUSED');
CREATE TYPE "SettlementStatus" AS ENUM ('CREATED', 'INITIALIZED', 'MERCHANT_ASSIGNED', 'WAITING_FOR_PAYMENT', 'VERIFYING', 'APPROVED', 'POSTED', 'PAYMENT_RECEIVED', 'USDT_SENT', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'DISPUTED');
CREATE TYPE "SettlementEventType" AS ENUM ('SettlementCreated', 'SettlementInitialized', 'SettlementPaymentDetected', 'SettlementVerificationStarted', 'MerchantAssigned', 'MerchantAccepted', 'PaymentReceived', 'USDTSent', 'SettlementApproved', 'SettlementCompleted', 'SettlementRejected', 'SettlementExpired', 'SettlementDisputed', 'SettlementCancelled');
CREATE TYPE "OperationsQueueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE "SettlementProviderId" AS ENUM ('MERCHANT', 'CRYPTOBOT');
CREATE TYPE "SettlementProviderStatus" AS ENUM ('ENABLED', 'DISABLED');
CREATE TYPE "SettlementProviderHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN');

CREATE TABLE "merchants" (
  "merchant_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "whatsapp_number" TEXT NOT NULL,
  "telegram_username" TEXT,
  "country" TEXT NOT NULL,
  "supported_currencies" JSONB NOT NULL DEFAULT '[]',
  "supported_mobile_money_networks" JSONB NOT NULL DEFAULT '[]',
  "mobile_money_number" TEXT NOT NULL,
  "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
  "availability" "MerchantAvailability" NOT NULL DEFAULT 'OFFLINE',
  "capacity" INTEGER NOT NULL DEFAULT 5,
  "current_load" INTEGER NOT NULL DEFAULT 0,
  "trust_score" INTEGER NOT NULL DEFAULT 50,
  "average_completion_time_seconds" INTEGER NOT NULL DEFAULT 900,
  "daily_limit" DECIMAL(36,18) NOT NULL,
  "auth_token_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchants_pkey" PRIMARY KEY ("merchant_id")
);

CREATE TABLE "merchant_sessions" (
  "merchant_session_id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_sessions_pkey" PRIMARY KEY ("merchant_session_id")
);

CREATE TABLE "merchant_capacity" (
  "merchant_capacity_id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "business_date" TIMESTAMP(3) NOT NULL,
  "accepted_count" INTEGER NOT NULL DEFAULT 0,
  "completed_count" INTEGER NOT NULL DEFAULT 0,
  "rejected_count" INTEGER NOT NULL DEFAULT 0,
  "settled_amount" DECIMAL(36,18) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_capacity_pkey" PRIMARY KEY ("merchant_capacity_id")
);

CREATE TABLE "settlement_sessions" (
  "settlement_id" TEXT NOT NULL,
  "telegram_user_id" BIGINT NOT NULL,
  "merchant_id" TEXT,
  "provider" "SettlementProviderId" NOT NULL DEFAULT 'MERCHANT',
  "asset" TEXT NOT NULL,
  "requested_amount" DECIMAL(36,18) NOT NULL,
  "expected_crypto_amount" DECIMAL(36,18) NOT NULL,
  "exchange_rate" DECIMAL(36,18) NOT NULL,
  "country" TEXT NOT NULL,
  "mobile_money_network" TEXT NOT NULL,
  "reference_code" TEXT NOT NULL,
  "status" "SettlementStatus" NOT NULL DEFAULT 'CREATED',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "payment_received_at" TIMESTAMP(3),
  "usdt_sent_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "orchestrator_reference" TEXT,
  "provider_metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "settlement_sessions_pkey" PRIMARY KEY ("settlement_id")
);

CREATE TABLE "settlement_events" (
  "settlement_event_id" TEXT NOT NULL,
  "settlement_id" TEXT NOT NULL,
  "event_type" "SettlementEventType" NOT NULL,
  "actor_type" TEXT NOT NULL,
  "actor_id" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "settlement_events_pkey" PRIMARY KEY ("settlement_event_id")
);

CREATE TABLE "merchant_metrics" (
  "merchant_metric_id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL,
  "window_end" TIMESTAMP(3) NOT NULL,
  "assigned_count" INTEGER NOT NULL DEFAULT 0,
  "accepted_count" INTEGER NOT NULL DEFAULT 0,
  "completed_count" INTEGER NOT NULL DEFAULT 0,
  "rejected_count" INTEGER NOT NULL DEFAULT 0,
  "average_completion_time_seconds" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_metrics_pkey" PRIMARY KEY ("merchant_metric_id")
);

CREATE TABLE "settlement_notes" (
  "settlement_note_id" TEXT NOT NULL,
  "settlement_id" TEXT NOT NULL,
  "merchant_id" TEXT,
  "note" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "settlement_notes_pkey" PRIMARY KEY ("settlement_note_id")
);

CREATE TABLE "operations_queue" (
  "operations_queue_item_id" TEXT NOT NULL,
  "settlement_id" TEXT,
  "reason" TEXT NOT NULL,
  "status" "OperationsQueueStatus" NOT NULL DEFAULT 'OPEN',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "operations_queue_pkey" PRIMARY KEY ("operations_queue_item_id")
);

CREATE TABLE "settlement_providers" (
  "provider_id" "SettlementProviderId" NOT NULL,
  "display_name" TEXT NOT NULL,
  "status" "SettlementProviderStatus" NOT NULL DEFAULT 'ENABLED',
  "supported_assets" JSONB NOT NULL DEFAULT '[]',
  "supported_countries" JSONB NOT NULL DEFAULT '[]',
  "capability_manifest" JSONB NOT NULL DEFAULT '{}',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "settlement_providers_pkey" PRIMARY KEY ("provider_id")
);

CREATE TABLE "settlement_provider_config" (
  "settlement_provider_config_id" TEXT NOT NULL,
  "provider_id" "SettlementProviderId" NOT NULL,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "settlement_provider_config_pkey" PRIMARY KEY ("settlement_provider_config_id")
);

CREATE TABLE "settlement_provider_health" (
  "settlement_provider_health_id" TEXT NOT NULL,
  "provider_id" "SettlementProviderId" NOT NULL,
  "health_status" "SettlementProviderHealthStatus" NOT NULL DEFAULT 'HEALTHY',
  "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "details" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "settlement_provider_health_pkey" PRIMARY KEY ("settlement_provider_health_id")
);

CREATE TABLE "provider_events" (
  "provider_event_id" TEXT NOT NULL,
  "provider_id" "SettlementProviderId" NOT NULL,
  "settlement_id" TEXT,
  "event_type" "SettlementEventType" NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_events_pkey" PRIMARY KEY ("provider_event_id")
);

CREATE UNIQUE INDEX "merchant_capacity_merchant_id_business_date_key" ON "merchant_capacity"("merchant_id", "business_date");
CREATE UNIQUE INDEX "settlement_sessions_reference_code_key" ON "settlement_sessions"("reference_code");
CREATE INDEX "merchants_status_availability_idx" ON "merchants"("status", "availability");
CREATE INDEX "merchants_country_idx" ON "merchants"("country");
CREATE INDEX "merchant_sessions_merchant_id_idx" ON "merchant_sessions"("merchant_id");
CREATE INDEX "merchant_sessions_token_hash_idx" ON "merchant_sessions"("token_hash");
CREATE INDEX "merchant_capacity_business_date_idx" ON "merchant_capacity"("business_date");
CREATE INDEX "settlement_sessions_telegram_user_id_idx" ON "settlement_sessions"("telegram_user_id");
CREATE INDEX "settlement_sessions_merchant_id_idx" ON "settlement_sessions"("merchant_id");
CREATE INDEX "settlement_sessions_provider_idx" ON "settlement_sessions"("provider");
CREATE INDEX "settlement_sessions_status_idx" ON "settlement_sessions"("status");
CREATE INDEX "settlement_sessions_expires_at_idx" ON "settlement_sessions"("expires_at");
CREATE INDEX "settlement_events_settlement_id_idx" ON "settlement_events"("settlement_id");
CREATE INDEX "settlement_events_event_type_idx" ON "settlement_events"("event_type");
CREATE INDEX "settlement_events_created_at_idx" ON "settlement_events"("created_at");
CREATE INDEX "merchant_metrics_merchant_id_idx" ON "merchant_metrics"("merchant_id");
CREATE INDEX "merchant_metrics_window_start_window_end_idx" ON "merchant_metrics"("window_start", "window_end");
CREATE INDEX "settlement_notes_settlement_id_idx" ON "settlement_notes"("settlement_id");
CREATE INDEX "settlement_notes_merchant_id_idx" ON "settlement_notes"("merchant_id");
CREATE INDEX "operations_queue_settlement_id_idx" ON "operations_queue"("settlement_id");
CREATE INDEX "operations_queue_status_idx" ON "operations_queue"("status");
CREATE INDEX "operations_queue_created_at_idx" ON "operations_queue"("created_at");
CREATE INDEX "settlement_providers_status_priority_idx" ON "settlement_providers"("status", "priority");
CREATE UNIQUE INDEX "settlement_provider_config_provider_id_key" ON "settlement_provider_config"("provider_id");
CREATE UNIQUE INDEX "settlement_provider_health_provider_id_key" ON "settlement_provider_health"("provider_id");
CREATE INDEX "settlement_provider_health_health_status_idx" ON "settlement_provider_health"("health_status");
CREATE INDEX "provider_events_provider_id_idx" ON "provider_events"("provider_id");
CREATE INDEX "provider_events_settlement_id_idx" ON "provider_events"("settlement_id");
CREATE INDEX "provider_events_event_type_idx" ON "provider_events"("event_type");

ALTER TABLE "merchant_sessions" ADD CONSTRAINT "merchant_sessions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("merchant_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_capacity" ADD CONSTRAINT "merchant_capacity_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("merchant_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlement_sessions" ADD CONSTRAINT "settlement_sessions_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "users"("telegram_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlement_sessions" ADD CONSTRAINT "settlement_sessions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlement_events" ADD CONSTRAINT "settlement_events_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlement_sessions"("settlement_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_metrics" ADD CONSTRAINT "merchant_metrics_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("merchant_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlement_notes" ADD CONSTRAINT "settlement_notes_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlement_sessions"("settlement_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlement_notes" ADD CONSTRAINT "settlement_notes_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "settlement_provider_config" ADD CONSTRAINT "settlement_provider_config_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "settlement_providers"("provider_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlement_provider_health" ADD CONSTRAINT "settlement_provider_health_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "settlement_providers"("provider_id") ON DELETE CASCADE ON UPDATE CASCADE;
