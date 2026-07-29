import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserState } from '../../common/interfaces/user-state.enum';
import { AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { FinancialAccountRepository } from './financial-account.repository';

@Injectable()
export class FinancialAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: FinancialAccountRepository,
    private readonly auditService: AuditService,
  ) {}

  async getOrCreateForReadyUser(telegramUserId: bigint) {
    const existing = await this.repository.findByTelegramUserId(telegramUserId);
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.state !== UserState.READY && !user.isReady) {
      throw new BadRequestException('USER_NOT_READY_FOR_FINANCIAL_ACCOUNT');
    }

    const account = await this.repository.createActive(telegramUserId);
    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.FINANCIAL_ACCOUNT_CREATED,
      description: 'Financial account created for ready user',
      metadata: { financialAccountId: account.id, status: account.status },
      source: 'financial_account_service',
    });

    return account;
  }
}
