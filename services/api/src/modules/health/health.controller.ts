import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

const REQUIRED_CONFIG = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'TELEGRAM_BOT_TOKEN'];
const REQUIRED_LEDGER_ACCOUNTS = ['PLATFORM_RESERVE', 'USER_ASSET_LIABILITY'];

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
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'UP';
    } catch (err: any) {
      checks.database = `DOWN: ${err?.message}`;
    }

    const missingConfig = REQUIRED_CONFIG.filter((name) => !process.env[name] || !process.env[name]!.trim());
    checks.config = missingConfig.length === 0 ? 'OK' : `MISSING: ${missingConfig.join(', ')}`;

    if (checks.database.startsWith('UP')) {
      try {
        const accounts = await this.prisma.ledgerAccount.findMany({
          where: { code: { in: REQUIRED_LEDGER_ACCOUNTS } },
          select: { code: true },
        });
        const found = new Set(accounts.map((a) => a.code));
        const missingAccounts = REQUIRED_LEDGER_ACCOUNTS.filter((code) => !found.has(code));
        checks.ledger = missingAccounts.length === 0 ? 'UP' : `MISSING_ACCOUNTS: ${missingAccounts.join(', ')}`;
      } catch (err: any) {
        checks.ledger = `ERROR: ${err?.message}`;
      }
    } else {
      checks.ledger = 'SKIPPED (database down)';
    }

    const ready = checks.database.startsWith('UP') && checks.config === 'OK' && checks.ledger === 'UP';
    const body = {
      status: ready ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      service: 'titanstream-api',
      checks,
    };

    if (ready) {
      return body;
    }
    throw new ServiceUnavailableException(body);
  }
}
