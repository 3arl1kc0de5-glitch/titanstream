import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

const getDatabaseUrl = () => {
  const url =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRESQL_URL;
  if (url && url.trim().length > 0) {
    return url.trim();
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