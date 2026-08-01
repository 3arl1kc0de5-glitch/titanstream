import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { AssetRegistryService } from './asset-registry.service';
import { ChartOfAccountsService } from './chart-of-accounts.service';

type DbClient = Prisma.TransactionClient | PrismaService;

export interface LedgerLineInput {
  ledgerAccountCode: string;
  entryType: LedgerEntryType;
  amount: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetRegistryService,
    private readonly chart: ChartOfAccountsService,
    private readonly auditService: AuditService,
  ) {}

  async postBalancedGroup(params: {
    telegramUserId: bigint;
    financialAccountId: string;
    assetCode: string;
    reference: string;
    description?: string;
    metadata?: Record<string, unknown>;
    lines: LedgerLineInput[];
    client?: DbClient;
  }) {
    if (params.lines.length < 2) throw new BadRequestException('LEDGER_REQUIRES_DEBIT_AND_CREDIT');
    await this.assets.getEnabled(params.assetCode, params.client);

    const debits = this.sum(params.lines.filter((line) => line.entryType === LedgerEntryType.DEBIT).map((line) => line.amount));
    const credits = this.sum(params.lines.filter((line) => line.entryType === LedgerEntryType.CREDIT).map((line) => line.amount));
    if (!debits.equals(credits) || debits.lte(0)) throw new BadRequestException('UNBALANCED_LEDGER_ENTRIES');

    const persist = (tx: DbClient) => this.persistGroup(tx, params);

    // When called from inside an outer interactive transaction, post on the
    // supplied client so the group commits (or rolls back) with its caller.
    // Prisma forbids nested interactive transactions, so no inner $transaction.
    if (params.client) {
      return persist(params.client);
    }

    return this.prisma.$transaction((tx) => persist(tx));
  }

  private async persistGroup(tx: DbClient, params: {
    telegramUserId: bigint;
    financialAccountId: string;
    assetCode: string;
    reference: string;
    description?: string;
    metadata?: Record<string, unknown>;
    lines: LedgerLineInput[];
  }) {
    const group = await tx.transactionGroup.create({
      data: {
        reference: params.reference,
        description: params.description,
        metadata: (params.metadata || {}) as Prisma.InputJsonValue,
        finalizedAt: new Date(),
      },
    });

    const createdEntries = [];
    for (const line of params.lines) {
      const ledgerAccount = await this.chart.getRequired(line.ledgerAccountCode, tx);
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionGroupId: group.id,
          financialAccountId: params.financialAccountId,
          ledgerAccountId: ledgerAccount.id,
          assetCode: params.assetCode,
          amount: new Prisma.Decimal(line.amount),
          entryType: line.entryType,
          reference: line.reference,
          metadata: (line.metadata || {}) as Prisma.InputJsonValue,
        },
      });
      createdEntries.push(entry);

      await this.auditService.createWithClient(tx, {
        telegramUserId: params.telegramUserId,
        eventType: AuditEventType.LEDGER_ENTRY_CREATED,
        description: 'Ledger entry created',
        metadata: {
          financialAccountId: params.financialAccountId,
          transactionGroupId: group.id,
          ledgerEntryId: entry.id,
          ledgerAccountCode: line.ledgerAccountCode,
          entryType: line.entryType,
          assetCode: params.assetCode,
          amount: line.amount,
        },
        source: 'ledger_service',
      });
    }

    return { group, entries: createdEntries };
  }

  findForAccount(financialAccountId: string, limit: number, offset: number) {
    return this.prisma.ledgerEntry.findMany({
      where: { financialAccountId },
      include: { ledgerAccount: { select: { code: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  private sum(amounts: string[]) {
    return amounts.reduce((total, amount) => total.plus(new Prisma.Decimal(amount)), new Prisma.Decimal(0));
  }
}
