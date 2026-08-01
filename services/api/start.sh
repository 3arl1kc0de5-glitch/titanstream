#!/bin/sh
set -e

# Fallback DATABASE_URL resolution
export DATABASE_URL="${DATABASE_URL:-${DATABASE_PRIVATE_URL:-${POSTGRES_URL:-${RAILWAY_POSTGRESQL_URL}}}}"
if [ -z "$DATABASE_URL" ] && [ -n "$PGHOST" ]; then
  export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-railway}?schema=public"
fi

echo "Resolved DATABASE_URL for Prisma migrations."

# Run migrations
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "Attempting to run prisma migrate deploy (attempt $i)..."
  npx prisma migrate deploy && break || sleep 2
done

# Run main application
exec node dist/src/main
