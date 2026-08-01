import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialAccountStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { AssetRegistryService } from './asset-registry.service';

type DbClient = Prisma.TransactionClient | PrismaService;

const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  CREATED: [TransactionStatus.PENDING, TransactionStatus.PROCESSING, TransactionStatus.FAILED],
  PENDING: [TransactionStatus.PROCESSING, TransactionStatus.FAILED],
  PROCESSING: [TransactionStatus.COMPLETED, TransactionStatus.FAILED],
  COMPLETED: [TransactionStatus.REVERSED],
  FAILED: [],
  REVERSED: [],
};

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetRegistryService,
    private readonly auditService: AuditService,
  ) {}

  async createFrameworkTransaction(params: {
    telegramUserId: bigint;
    financialAccountId: string;
    transactionType: TransactionType;
    assetCode: string;
    amount: string;
    reference: string;
    metadata?: Record<string, unknown>;
  }, client: DbClient = this.prisma) {
    await this.assets.getEnabled(params.assetCode, client);
    const account = await client.financialAccount.findUnique({ where: { id: params.financialAccountId } });
    if (!account || account.status !== FinancialAccountStatus.ACTIVE) throw new BadRequestException('INVALID_FINANCIAL_ACCOUNT_STATE');

    const amount = new Prisma.Decimal(params.amount);
    if (amount.lte(0)) throw new BadRequestException('INVALID_TRANSACTION_AMOUNT');

    const transaction = await client.financialTransaction.create({
      data: {
        financialAccountId: params.financialAccountId,
        transactionType: params.transactionType,
        status: TransactionStatus.CREATED,
        assetCode: params.assetCode,
        amount,
        reference: params.reference,
        metadata: (params.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    await this.auditService.createWithClient(client, {
      telegramUserId: params.telegramUserId,
      eventType: AuditEventType.TRANSACTION_CREATED,
      description: 'Financial framework transaction created',
      metadata: { financialAccountId: params.financialAccountId, transactionId: transaction.id, reference: params.reference },
      source: 'transaction_service',
    });

    return transaction;
  }

  async transition(transactionId: string, nextStatus: TransactionStatus, telegramUserId: bigint, client: DbClient = this.prisma) {
    const transaction = await client.financialTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new BadRequestException('TRANSACTION_NOT_FOUND');
    if (!ALLOWED_TRANSITIONS[transaction.status].includes(nextStatus)) {
      throw new BadRequestException(`INVALID_TRANSACTION_TRANSITION:${transaction.status}->${nextStatus}`);
    }

    const updated = await client.financialTransaction.update({
      where: { id: transactionId },
      data: {
        status: nextStatus,
        processingAt: nextStatus === TransactionStatus.PROCESSING ? new Date() : transaction.processingAt,
        completedAt: nextStatus === TransactionStatus.COMPLETED ? new Date() : transaction.completedAt,
        failedAt: nextStatus === TransactionStatus.FAILED ? new Date() : transaction.failedAt,
        reversedAt: nextStatus === TransactionStatus.REVERSED ? new Date() : transaction.reversedAt,
      },
    });

    if (nextStatus === TransactionStatus.COMPLETED || nextStatus === TransactionStatus.FAILED) {
      await this.auditService.createWithClient(client, {
        telegramUserId,
        eventType: nextStatus === TransactionStatus.COMPLETED ? AuditEventType.TRANSACTION_COMPLETED : AuditEventType.TRANSACTION_FAILED,
        description: `Transaction ${nextStatus.toLowerCase()}`,
        metadata: { financialAccountId: transaction.financialAccountId, transactionId },
        source: 'transaction_service',
      });
    }

    return updated;
  }

  findForAccount(financialAccountId: string, limit: number, offset: number) {
    return this.prisma.financialTransaction.findMany({
      where: { financialAccountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
