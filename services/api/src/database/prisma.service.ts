import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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