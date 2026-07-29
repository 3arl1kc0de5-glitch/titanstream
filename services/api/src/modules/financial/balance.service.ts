import { Injectable } from '@nestjs/common';
import { LedgerEntryType, Prisma, TransactionStatus } from '@prisma/client';
import { AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getBalances(telegramUserId: bigint, financialAccountId: string) {
    const assets = await this.prisma.asset.findMany({ where: { enabled: true }, orderBy: { assetCode: 'asc' } });
    const balances = [];

    for (const asset of assets) {
      const entries = await this.prisma.ledgerEntry.findMany({
        where: {
          financialAccountId,
          assetCode: asset.assetCode,
          ledgerAccount: { code: 'USER_ASSET_LIABILITY' },
        },
        select: { amount: true, entryType: true },
      });

      const available = entries.reduce((total, entry) => {
        return entry.entryType === LedgerEntryType.CREDIT
          ? total.plus(entry.amount)
          : total.minus(entry.amount);
      }, new Prisma.Decimal(0));

      const pendingTransactions = await this.prisma.financialTransaction.findMany({
        where: {
          financialAccountId,
          assetCode: asset.assetCode,
          status: { in: [TransactionStatus.CREATED, TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
        },
        select: { amount: true },
      });
      const pending = pendingTransactions.reduce((total, tx) => total.plus(tx.amount), new Prisma.Decimal(0));

      balances.push({
        assetCode: asset.assetCode,
        name: asset.name,
        symbol: asset.symbol,
        decimals: asset.decimals,
        availableBalance: available.toFixed(asset.decimals),
        pendingBalance: pending.toFixed(asset.decimals),
        reservedBalance: new Prisma.Decimal(0).toFixed(asset.decimals),
      });
    }

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.BALANCE_UPDATED,
      description: 'Balance calculated from ledger entries',
      metadata: { financialAccountId, balances },
      source: 'balance_service',
    });

    return { financialAccountId, balances };
  }
}
