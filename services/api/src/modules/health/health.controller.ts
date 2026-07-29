import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'titanstream-api',
        checks: {
          database: 'ok',
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'down',
        },
      });
    }
  }

  @Get('liveness')
  @Public()
  getLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'titanstream-api',
    };
  }

  @Get('readiness')
  @Public()
  async getReadiness() {
    try {
      // Test DB connection
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'READY',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'UP',
        },
      };
    } catch (err: any) {
      throw new ServiceUnavailableException({
        status: 'NOT_READY',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'DOWN',
        },
        error: err?.message,
      });
    }
  }
}
