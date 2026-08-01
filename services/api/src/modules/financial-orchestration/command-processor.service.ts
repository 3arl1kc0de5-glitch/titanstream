import { Injectable } from '@nestjs/common';
import { DomainEventType, FinancialOperationStatus, FinancialOperationType, LedgerEntryType, Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FinancialAccountService } from '../financial/financial-account.service';
import { TransactionService } from '../financial/transaction.service';
import { LedgerService } from '../financial/ledger.service';
import { DomainEventService } from './domain-event.service';
import { FinancialRulesService } from './financial-rules.service';
import { FinancialWorkflowService } from './financial-workflow.service';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CommandProcessorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: FinancialAccountService,
    private readonly rules: FinancialRulesService,
    private readonly workflow: FinancialWorkflowService,
    private readonly transactions: TransactionService,
    private readonly ledger: LedgerService,
    private readonly events: DomainEventService,
  ) {}

  async execute(command: {
    telegramUserId: bigint;
    operationType: FinancialOperationType;
    assetCode: string;
    amount: string;
    idempotencyKey: string;
    reference: string;
    metadata?: Record<string, unknown>;
  }, client: DbClient = this.prisma) {
    const account = await this.accounts.getOrCreateForReadyUser(command.telegramUserId, client);
    const operation = await client.financialOperation.create({
      data: {
        telegramUserId: command.telegramUserId,
        financialAccountId: account.id,
        operationType: command.operationType,
        status: FinancialOperationStatus.REQUESTED,
        assetCode: command.assetCode,
        amount: new Prisma.Decimal(command.amount),
        idempotencyKey: command.idempotencyKey,
        reference: command.reference,
        requestPayload: {
          ...command,
          telegramUserId: command.telegramUserId.toString(),
        } as Prisma.InputJsonValue,
        metadata: (command.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    await this.events.emit({
      eventType: DomainEventType.FINANCIAL_OPERATION_REQUESTED,
      operationId: operation.id,
      telegramUserId: command.telegramUserId,
      financialAccountId: account.id,
      payload: { reference: command.reference, assetCode: command.assetCode, amount: command.amount },
    }, client);

    try {
      await this.rules.validate({
        telegramUserId: command.telegramUserId,
        financialAccountId: account.id,
        assetCode: command.assetCode,
        amount: command.amount,
        operationType: command.operationType,
      }, client);
      await this.workflow.transition(operation.id, FinancialOperationStatus.VALIDATED, 'rules_engine', {}, client);
      await this.workflow.transition(operation.id, FinancialOperationStatus.AUTHORIZED, 'command_processor', {}, client);
      await this.events.emit({
        eventType: DomainEventType.FINANCIAL_OPERATION_AUTHORIZED,
        operationId: operation.id,
        telegramUserId: command.telegramUserId,
        financialAccountId: account.id,
        payload: { reference: command.reference },
      }, client);

      const transaction = await this.transactions.createFrameworkTransaction({
        telegramUserId: command.telegramUserId,
        financialAccountId: account.id,
        transactionType: this.mapTransactionType(command.operationType),
        assetCode: command.assetCode,
        amount: command.amount,
        reference: command.reference,
        metadata: { operationId: operation.id, ...command.metadata },
      }, client);

      await client.financialOperation.update({
        where: { id: operation.id },
        data: { transactionId: transaction.id },
      });
      await this.workflow.transition(operation.id, FinancialOperationStatus.EXECUTING, 'transaction_created', { transactionId: transaction.id }, client);

      // Post balanced double-entry ledger entries matching the transaction type
      const lines = [];
      if (command.operationType === FinancialOperationType.SYSTEM_ALLOCATION) {
        lines.push({
          ledgerAccountCode: 'PLATFORM_RESERVE',
          entryType: LedgerEntryType.DEBIT,
          amount: command.amount,
          reference: `${command.reference}-dr`,
        });
        lines.push({
          ledgerAccountCode: 'USER_ASSET_LIABILITY',
          entryType: LedgerEntryType.CREDIT,
          amount: command.amount,
          reference: `${command.reference}-cr`,
        });
      } else if (command.operationType === FinancialOperationType.WITHDRAWAL_RESERVE) {
        lines.push({
          ledgerAccountCode: 'USER_ASSET_LIABILITY',
          entryType: LedgerEntryType.DEBIT,
          amount: command.amount,
          reference: `${command.reference}-dr`,
        });
        lines.push({
          ledgerAccountCode: 'SUSPENSE',
          entryType: LedgerEntryType.CREDIT,
          amount: command.amount,
          reference: `${command.reference}-cr`,
        });
      } else if (command.operationType === FinancialOperationType.WITHDRAWAL_SETTLE) {
        lines.push({
          ledgerAccountCode: 'SUSPENSE',
          entryType: LedgerEntryType.DEBIT,
          amount: command.amount,
          reference: `${command.reference}-dr`,
        });
        lines.push({
          ledgerAccountCode: 'PLATFORM_RESERVE',
          entryType: LedgerEntryType.CREDIT,
          amount: command.amount,
          reference: `${command.reference}-cr`,
        });
      } else if (command.operationType === FinancialOperationType.WITHDRAWAL_REVERSAL) {
        lines.push({
          ledgerAccountCode: 'SUSPENSE',
          entryType: LedgerEntryType.DEBIT,
          amount: command.amount,
          reference: `${command.reference}-dr`,
        });
        lines.push({
          ledgerAccountCode: 'USER_ASSET_LIABILITY',
          entryType: LedgerEntryType.CREDIT,
          amount: command.amount,
          reference: `${command.reference}-cr`,
        });
      } else {
        lines.push({
          ledgerAccountCode: 'ADJUSTMENTS',
          entryType: LedgerEntryType.DEBIT,
          amount: command.amount,
          reference: `${command.reference}-dr`,
        });
        lines.push({
          ledgerAccountCode: 'USER_ASSET_LIABILITY',
          entryType: LedgerEntryType.CREDIT,
          amount: command.amount,
          reference: `${command.reference}-cr`,
        });
      }

      await this.ledger.postBalancedGroup({
        telegramUserId: command.telegramUserId,
        financialAccountId: account.id,
        assetCode: command.assetCode,
        reference: command.reference,
        description: `${command.operationType} operations posting`,
        lines,
        client,
      });

      // Transition the transaction to COMPLETED state (through PROCESSING first to satisfy state flow rules)
      await this.transactions.transition(transaction.id, TransactionStatus.PROCESSING, command.telegramUserId, client);
      await this.transactions.transition(transaction.id, TransactionStatus.COMPLETED, command.telegramUserId, client);

      // Transition the operation to POSTED and then to COMPLETED
      await this.workflow.transition(operation.id, FinancialOperationStatus.POSTED, 'ledger_posted', {}, client);
      await this.workflow.transition(operation.id, FinancialOperationStatus.COMPLETED, 'completed', {}, client);

      await this.events.emit({
        eventType: DomainEventType.LEDGER_POSTING_COMPLETED,
        operationId: operation.id,
        telegramUserId: command.telegramUserId,
        financialAccountId: account.id,
        payload: { reference: command.reference },
      }, client);

      return client.financialOperation.findUnique({
        where: { id: operation.id },
        include: { transaction: true, workflowSteps: true, domainEvents: true },
      });
    } catch (error: any) {
      await client.financialOperation.update({
        where: { id: operation.id },
        data: {
          failureCode: error?.response?.message || error?.message || 'FINANCIAL_OPERATION_FAILED',
          failureReason: error?.message || 'Financial operation failed',
        },
      });
      await this.workflow.transition(operation.id, FinancialOperationStatus.FAILED_VALIDATION, 'command_processor_failure', {
        error: error?.message || 'Financial operation failed',
      }, client).catch((transitionError: any) => {
        console.error('[CommandProcessor] Failed to record FAILED_VALIDATION transition:', transitionError?.message);
      });
      throw error;
    }
  }

  private mapTransactionType(operationType: FinancialOperationType): TransactionType {
    if (operationType === FinancialOperationType.REVERSAL) return TransactionType.REVERSAL;
    if (operationType === FinancialOperationType.SYSTEM_ALLOCATION) return TransactionType.SYSTEM_ALLOCATION;
    if (operationType === FinancialOperationType.WITHDRAWAL_RESERVE) return TransactionType.WITHDRAWAL_RESERVE;
    if (operationType === FinancialOperationType.WITHDRAWAL_SETTLE) return TransactionType.WITHDRAWAL_SETTLE;
    if (operationType === FinancialOperationType.WITHDRAWAL_REVERSAL) return TransactionType.WITHDRAWAL_REVERSAL;
    return TransactionType.INTERNAL_ADJUSTMENT;
  }
}
