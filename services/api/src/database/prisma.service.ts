import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

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

  Logger.error(
    `[PrismaService] FATAL: DATABASE_URL environment variable is missing! ` +
    `Ensure DATABASE_URL is set in Railway Variables for this service.`,
    '',
    'PrismaService',
  );
  throw new Error('DATABASE_URL environment variable is missing. Set DATABASE_URL in Railway Variables.');
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
      this.logger.warn(`Failed to connect to database on startup: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}