#!/bin/sh
set -e

echo "=== STARTUP DIAGNOSTICS ==="

# Validate required variables (fails fast if missing)
validate_env() {
  name=$1
  val=$(eval echo "\$$name")
  if [ -z "$val" ] || [ -z "$(echo "$val" | tr -d ' ')" ]; then
    echo "FATAL: Required environment variable $name is missing or empty!"
    exit 1
  fi
}

validate_env "DATABASE_URL"
validate_env "JWT_SECRET"
validate_env "JWT_REFRESH_SECRET"

echo "All required environment variables are present."

# Inspect database using Prisma Client
echo "Checking database schema status..."
HAS_USERS_TABLE=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst()
  .then(() => console.log('true'))
  .catch(err => {
    if (err.code === 'P2021') {
      console.log('false');
    } else {
      console.log('true'); // DB connects but table query failed (e.g. empty but structural connection OK)
    }
  })
  .finally(() => prisma.\$disconnect());
" 2>/dev/null || echo "false")

echo "Database contains core schema tables: $HAS_USERS_TABLE"

if [ "$HAS_USERS_TABLE" = "false" ]; then
  echo "Database is empty. Running one-time bootstrap schema (db push)..."
  npx prisma db push --accept-data-loss
  
  echo "Marking migrations as resolved/applied in migration history..."
  npx prisma migrate resolve --applied 0_init || true
  npx prisma migrate resolve --applied 20260728120000_financial_foundation || true
  npx prisma migrate resolve --applied 20260728130000_financial_orchestration || true
  npx prisma migrate resolve --applied 20260728150000_merchant_settlement_engine || true
  npx prisma migrate resolve --applied 20260801160000_add_interactive_promotional_output || true
  echo "Database bootstrap and migration resolution completed successfully."
else
  echo "Database already contains schema. Deploying normal migrations..."
  npx prisma migrate deploy
fi

# Run main application
exec node dist/src/main
