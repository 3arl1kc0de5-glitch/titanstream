import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

const getDatabaseUrl = () => {
  const envUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRESQL_URL ||
    process.env.RAILWAY_POSTGRESQL_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  // Construct from Railway Postgres individual environment variables if available
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
  const user = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
  const pass = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
  const dbName = process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway';

  if (host) {
    const auth = pass ? `${user}:${pass}` : user;
    return `postgresql://${auth}@${host}:${port}/${dbName}?schema=public`;
  }

  return 'postgresql://postgres:postgres@localhost:5432/titanstream?schema=public';
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: getDatabaseUrl(),
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Successfully connected to database.');
    } catch (err: any) {
      console.warn('Failed to connect to database on startup. Server will attempt connection on demand.', err.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}