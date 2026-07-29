import { Injectable } from '@nestjs/common';
import { FinancialAccountStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FinancialAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTelegramUserId(telegramUserId: bigint) {
    return this.prisma.financialAccount.findUnique({ where: { telegramUserId } });
  }

  createActive(telegramUserId: bigint) {
    return this.prisma.financialAccount.create({
      data: {
        telegramUserId,
        status: FinancialAccountStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });
  }
}
