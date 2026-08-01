-- Calibration: track how much of the promotional cap was contributed by
-- interactive taps, so the engine can enforce a configurable ceiling on tap
-- earnings during the promotional phase.
--
-- Versioned Prisma migration. It is applied exactly once per environment by
-- `prisma migrate deploy` (Docker entrypoint) and recorded in the migration
-- ledger — the application itself performs no runtime schema modification.
-- IF NOT EXISTS keeps the migration idempotent for environments whose
-- user_mining_states table was originally created via `prisma db push`.
ALTER TABLE "user_mining_states" ADD COLUMN IF NOT EXISTS "interactive_promotional_output" DECIMAL(65,30) NOT NULL DEFAULT 0;
