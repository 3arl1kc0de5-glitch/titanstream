import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserState } from '../../common/interfaces/user-state.enum';
import { AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { FinancialAccountRepository } from './financial-account.repository';
import { Prisma } from '@prisma/client';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class FinancialAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: FinancialAccountRepository,
    private readonly auditService: AuditService,
  ) {}

  async getOrCreateForReadyUser(telegramUserId: bigint, client: DbClient = this.prisma) {
    const existing = await this.repository.findByTelegramUserId(telegramUserId, client);
    if (existing) return existing;

    const user = await client.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    const ALLOWED_STATES = ['READY', 'READY_FOR_PLATFORM', 'ELIGIBLE_USER', 'ACTIVE_USER', 'AUTHENTICATED', 'NEW'];
    if (!ALLOWED_STATES.includes(user.state) && !user.isReady) {
      throw new BadRequestException('USER_NOT_READY_FOR_FINANCIAL_ACCOUNT');
    }

    const account = await this.repository.createActive(telegramUserId, client);
    await this.auditService.createWithClient(client, {
      telegramUserId,
      eventType: AuditEventType.FINANCIAL_ACCOUNT_CREATED,
      description: 'Financial account created for ready user',
      metadata: { financialAccountId: account.id, status: account.status },
      source: 'financial_account_service',
    });

    return account;
  }
}
