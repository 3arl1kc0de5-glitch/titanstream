import { Injectable } from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class FinancialAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTelegramUserId(telegramUserId: bigint, client: DbClient = this.prisma) {
    return client.financialAccount.findUnique({ where: { telegramUserId } });
  }

  createActive(telegramUserId: bigint, client: DbClient = this.prisma) {
    return client.financialAccount.create({
      data: {
        telegramUserId,
        status: FinancialAccountStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });
  }
}
