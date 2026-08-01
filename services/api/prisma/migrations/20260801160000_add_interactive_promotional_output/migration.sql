-- Track how much of the promotional cap was contributed by interactive taps,
-- so the engine can enforce a configurable ceiling on tap earnings during the
-- promotional phase. Runs defensively: the user_mining_states table is created
-- via `prisma db push` on some environments and has no CREATE migration, so the
-- column is added only when the table already exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_mining_states') THEN
    ALTER TABLE "user_mining_states" ADD COLUMN IF NOT EXISTS "interactive_promotional_output" DECIMAL(65,30) NOT NULL DEFAULT 0;
  END IF;
END $$;
