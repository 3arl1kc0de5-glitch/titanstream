import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { isProduction } from '../common/config/env.util';

const getDatabaseUrl = (): string => {
  const envUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRESQL_URL ||
    process.env.RAILWAY_POSTGRESQL_URL;

  if (envUrl && envUrl.trim().length > 0) {
    const url = envUrl.trim();
    const sanitized = url.replace(/:([^:@]+)@/, ':****@');
    Logger.log(`[PrismaService] Initialized with datasource URL: ${sanitized}`, 'PrismaService');
    return url;
  }

  // Construct from Railway Postgres individual environment variables if available
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const pass = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const dbName = process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway';

  if (host && user) {
    const auth = pass ? `${user}:${pass}` : user;
    const constructed = `postgresql://${auth}@${host}:${port}/${dbName}?schema=public`;
    Logger.log(`[PrismaService] Initialized from PGHOST variables: postgresql://${user}:****@${host}:${port}/${dbName}`, 'PrismaService');
    return constructed;
  }

  if (isProduction()) {
    throw new Error(
      '[Config] FATAL: No PostgreSQL connection configuration found ' +
        '(DATABASE_URL / DATABASE_PRIVATE_URL / POSTGRES_URL / PGHOST). ' +
        'Refusing to start against the localhost fallback in production.',
    );
  }

  Logger.warn(
    `[PrismaService] WARNING: DATABASE_URL environment variable is missing on startup. ` +
    `Prisma initialized with local fallback string (development only).`,
    'PrismaService',
  );

  return 'postgresql://postgres:postgres@127.0.0.1:5432/titanstream?schema=public';
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

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
      this.logger.log('Successfully connected to production PostgreSQL database.');
    } catch (err: any) {
      if (isProduction()) {
        this.logger.error(`[PrismaService] FATAL: Database connection failed: ${err.message}`);
        throw err;
      }
      this.logger.warn(`Database connection pending. NestJS server running with fallback auth resilience: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}