#!/bin/sh
set -e

echo "=== STARTUP DIAGNOSTICS ==="

check_var() {
  name=$1
  val=$(eval echo "\$$name")
  if [ -z "$val" ]; then
    echo "  $name: UNSET or EMPTY"
  else
    # Check prefixes safely
    is_pg="false"
    case "$val" in
      postgres://*|postgresql://*) is_pg="true" ;;
    esac
    echo "  $name: EXISTS (length: ${#val}, is_postgres: $is_pg)"
  fi
}

check_var "DATABASE_URL"
check_var "DATABASE_PRIVATE_URL"
check_var "POSTGRES_URL"
check_var "POSTGRESQL_URL"
check_var "RAILWAY_POSTGRESQL_URL"
check_var "PGHOST"
check_var "PGUSER"
check_var "PGPORT"
check_var "PGDATABASE"

echo "==========================="

# Fallback DATABASE_URL resolution
resolved_url="${DATABASE_URL}"
if [ -z "$resolved_url" ]; then
  resolved_url="${DATABASE_PRIVATE_URL}"
fi
if [ -z "$resolved_url" ]; then
  resolved_url="${POSTGRES_URL}"
fi
if [ -z "$resolved_url" ]; then
  resolved_url="${RAILWAY_POSTGRESQL_URL}"
fi
if [ -z "$resolved_url" ] && [ -n "$PGHOST" ]; then
  resolved_url="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-railway}?schema=public"
fi

export DATABASE_URL="$resolved_url"

if [ -z "$DATABASE_URL" ]; then
  echo "[start.sh] WARNING: DATABASE_URL is empty after resolving fallbacks!"
else
  # Double check prefix safely
  is_pg="false"
  case "$DATABASE_URL" in
    postgres://*|postgresql://*) is_pg="true" ;;
  esac
  echo "[start.sh] DATABASE_URL resolved successfully (length: ${#DATABASE_URL}, is_postgres: $is_pg)."
fi

# Run migrations
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "Attempting to run prisma migrate deploy (attempt $i)..."
  npx prisma migrate deploy && break || sleep 2
done

# Run main application
exec node dist/src/main
