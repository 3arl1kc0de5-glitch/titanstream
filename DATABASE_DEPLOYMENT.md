# DATABASE DEPLOYMENT GUIDE — TitanStream PostgreSQL & Prisma ORM

This document details the production deployment, migration workflow, schema synchronization, and rollback strategies for TitanStream's PostgreSQL database hosted on Railway.

---

## 1. Production Migration Workflow

Prisma migrations must run **before** the NestJS application starts listening for HTTP traffic.

### Automated Entrypoint Command
In Railway / Docker container startup:
```bash
npx prisma migrate deploy && node dist/main
```

### Flow Architecture
```
Container Startup
  ↓
Prisma Client Generation (npx prisma generate)
  ↓
Migration Check & Apply (npx prisma migrate deploy)
  ↓
NestJS Boot (node dist/main)
  ↓
Health Probe Verification (GET /health/readiness)
```

---

## 2. Connection Pooling & Security Rules

1. **Connection String Format**:
   ```env
   DATABASE_URL="postgresql://postgres:<PASSWORD>@railway.proxy.rlwy.net:<PORT>/railway?schema=public&sslmode=require"
   ```
2. **SSL Mode**: Mandatory `sslmode=require` for all production PostgreSQL connections.
3. **Transaction Safety**: All double-entry ledger transactions use `prisma.$transaction()` to enforce atomic credit/debit updates.

---

## 3. Manual Deployment Commands

```bash
# Apply pending production migrations
pnpm --filter api exec prisma migrate deploy

# Check migration status
pnpm --filter api exec prisma migrate status

# Generate updated Prisma client
pnpm --filter api exec prisma generate
```

---

## 4. Rollback & Emergency Considerations

1. **Schema Backwards Compatibility**: Always add columns with `@default()` or optional `?` types to ensure zero-downtime rolling upgrades.
2. **Database Backups**: Enable automatic daily snapshot backups in the Railway PostgreSQL plugin.
3. **Manual Rollback**: If a bad migration occurs, execute down migrations or restore from Railway automated snapshot.
