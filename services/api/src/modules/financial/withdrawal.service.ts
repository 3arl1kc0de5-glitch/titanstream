import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FinancialOperationType, Prisma, SettlementProviderId, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { OperationalAuditService } from '../admin/services/operational-audit.service';
import { WithdrawalRiskService } from './withdrawal-risk.service';
import { EventBusService } from '../automation/event-bus.service';

export interface InitiateWithdrawalDto {
  telegramUserId: bigint;
  amount: number;
  asset?: string;
  network: string; // MOMO, TRC20, POLYGON, ARBITRUM
  destinationAddress: string;
  country?: string;
  mobileMoneyNetwork?: string;
}

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly riskService: WithdrawalRiskService,
    private readonly auditService: OperationalAuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async initiateWithdrawal(dto: InitiateWithdrawalDto, idempotencyKey?: string) {
    const asset = dto.asset || 'USDT';
    const amountStr = dto.amount.toString();
    const idKey = idempotencyKey || `wd_${dto.telegramUserId}_${Date.now()}`;

    // 1. Risk & Limit Checks
    const riskEval = await this.riskService.evaluateWithdrawal(dto.telegramUserId, dto.amount);

    // 2. Reserve User Balance in Double-Entry Ledger
    const orchestratorRef = `wd_reserve_${idKey}`;
    const financialOp = await this.orchestrator.requestOperation({
      telegramUserId: dto.telegramUserId,
      operationType: FinancialOperationType.WITHDRAWAL_RESERVE,
      assetCode: asset,
      amount: amountStr,
      idempotencyKey: idKey,
      reference: orchestratorRef,
      metadata: {
        network: dto.network,
        destinationAddress: dto.destinationAddress,
        requiresManualReview: riskEval.requiresManualReview,
      },
    });

    const refCode = `WD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const initialStatus = riskEval.requiresManualReview ? SettlementStatus.WAITING_PAYMENT : SettlementStatus.WAITING_FOR_PAYMENT;

    // 3. Create SettlementSession Payout Record
    const session = await this.prisma.settlementSession.create({
      data: {
        telegramUserId: dto.telegramUserId,
        referenceCode: refCode,
        provider: SettlementProviderId.CRYPTOBOT,
        asset,
        requestedAmount: new Prisma.Decimal(dto.amount),
        expectedCryptoAmount: new Prisma.Decimal(dto.amount),
        exchangeRate: new Prisma.Decimal(1.0),
        country: dto.country || 'GLOBAL',
        mobileMoneyNetwork: dto.mobileMoneyNetwork || dto.network,
        status: initialStatus,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        orchestratorReference: orchestratorRef,
        providerMetadata: {
          network: dto.network,
          destinationAddress: dto.destinationAddress,
          userTier: riskEval.userTier,
          requiresManualReview: riskEval.requiresManualReview,
          riskReason: riskEval.riskReason || null,
          financialOperationId: (financialOp as any)?.id,
        },
      },
    });

    // 4. Auto-dispatch if manual review not required
    if (!riskEval.requiresManualReview) {
      await this.dispatchPayout(session.id);
    }

    // Emit WithdrawalRequested event
    this.eventBus.publish({
      type: 'WithdrawalRequested',
      correlationId: `corr_wd_${session.id}`,
      actorId: dto.telegramUserId.toString(),
      payload: {
        withdrawalId: session.id,
        telegramUserId: dto.telegramUserId.toString(),
        amount: dto.amount,
        network: dto.network,
      },
    });

    return this.prisma.settlementSession.findUnique({
      where: { id: session.id },
    });
  }

  async approveWithdrawal(admin: { id: string; role: string }, withdrawalId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: withdrawalId } });
    if (!session) throw new NotFoundException('WITHDRAWAL_NOT_FOUND');
    if (session.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('WITHDRAWAL_ALREADY_COMPLETED');
    }

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'WITHDRAWAL_APPROVED',
      entity: 'SETTLEMENT',
      entityId: withdrawalId,
      metadata: { referenceCode: session.referenceCode, amount: session.requestedAmount.toString() },
    });

    return this.dispatchPayout(withdrawalId);
  }

  async rejectWithdrawal(admin: { id: string; role: string }, withdrawalId: string, reason?: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: withdrawalId } });
    if (!session) throw new NotFoundException('WITHDRAWAL_NOT_FOUND');
    if (session.status === SettlementStatus.COMPLETED || session.status === SettlementStatus.REJECTED) {
      throw new BadRequestException('CANNOT_REJECT_FINALIZED_WITHDRAWAL');
    }

    // Double-Entry Ledger Reversal — Restore User Balance
    const reversalRef = `wd_reversal_${withdrawalId}`;
    await this.orchestrator.requestOperation({
      telegramUserId: session.telegramUserId,
      operationType: FinancialOperationType.WITHDRAWAL_REVERSAL,
      assetCode: session.asset,
      amount: session.requestedAmount.toString(),
      idempotencyKey: reversalRef,
      reference: reversalRef,
      metadata: { originalSettlementId: withdrawalId, reason },
    });

    const updated = await this.prisma.settlementSession.update({
      where: { id: withdrawalId },
      data: {
        status: SettlementStatus.REJECTED,
        providerMetadata: {
          ...(typeof session.providerMetadata === 'object' ? session.providerMetadata : {}),
          rejectionReason: reason || 'REJECTED_BY_ADMIN',
          rejectedAt: new Date().toISOString(),
        },
      },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'WITHDRAWAL_REJECTED',
      entity: 'SETTLEMENT',
      entityId: withdrawalId,
      metadata: { referenceCode: session.referenceCode, reason },
    });

    return updated;
  }

  async dispatchPayout(withdrawalId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: withdrawalId } });
    if (!session) throw new NotFoundException('WITHDRAWAL_NOT_FOUND');

    await this.prisma.settlementSession.update({
      where: { id: withdrawalId },
      data: { status: SettlementStatus.VERIFYING },
    });

    try {
      // Simulate/Execute payout dispatch to external provider rail
      const externalTxId = `payout_tx_${Math.random().toString(36).substring(2, 10)}`;
      return await this.settleWithdrawal(withdrawalId, externalTxId);
    } catch (err: any) {
      return await this.handlePayoutFailure(withdrawalId, err?.message || 'PAYOUT_DISPATCH_FAILED');
    }
  }

  async settleWithdrawal(withdrawalId: string, externalReference: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: withdrawalId } });
    if (!session) throw new NotFoundException('WITHDRAWAL_NOT_FOUND');

    const settleRef = `wd_settle_${withdrawalId}`;
    await this.orchestrator.requestOperation({
      telegramUserId: session.telegramUserId,
      operationType: FinancialOperationType.WITHDRAWAL_SETTLE,
      assetCode: session.asset,
      amount: session.requestedAmount.toString(),
      idempotencyKey: settleRef,
      reference: settleRef,
      metadata: { originalSettlementId: withdrawalId, externalReference },
    });

    const completed = await this.prisma.settlementSession.update({
      where: { id: withdrawalId },
      data: {
        status: SettlementStatus.COMPLETED,
        completedAt: new Date(),
        usdtSentAt: new Date(),
        providerMetadata: {
          ...(typeof session.providerMetadata === 'object' ? session.providerMetadata : {}),
          externalReference,
          settledAt: new Date().toISOString(),
        },
      },
    });

    // Emit WithdrawalCompleted event
    this.eventBus.publish({
      type: 'WithdrawalCompleted',
      correlationId: `corr_wd_${withdrawalId}`,
      actorId: session.telegramUserId.toString(),
      payload: {
        withdrawalId,
        telegramUserId: session.telegramUserId.toString(),
        amount: session.requestedAmount.toString(),
        externalReference,
      },
    });

    return completed;
  }

  async handlePayoutFailure(withdrawalId: string, reason: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: withdrawalId } });
    if (!session) throw new NotFoundException('WITHDRAWAL_NOT_FOUND');

    const reversalRef = `wd_fail_reversal_${withdrawalId}`;
    await this.orchestrator.requestOperation({
      telegramUserId: session.telegramUserId,
      operationType: FinancialOperationType.WITHDRAWAL_REVERSAL,
      assetCode: session.asset,
      amount: session.requestedAmount.toString(),
      idempotencyKey: reversalRef,
      reference: reversalRef,
      metadata: { originalSettlementId: withdrawalId, failureReason: reason },
    });

    const failed = await this.prisma.settlementSession.update({
      where: { id: withdrawalId },
      data: {
        status: SettlementStatus.FAILED,
        providerMetadata: {
          ...(typeof session.providerMetadata === 'object' ? session.providerMetadata : {}),
          failureReason: reason,
          failedAt: new Date().toISOString(),
        },
      },
    });

    // Enforce "No Silent Failure" Rule: write failure to the Operations Queue (DLQ)
    await this.prisma.operationsQueueItem.create({
      data: {
        settlementId: withdrawalId,
        reason: 'WITHDRAWAL_PAYOUT_FAILED',
        status: 'OPEN',
        payload: {
          withdrawalId,
          reason,
          telegramUserId: session.telegramUserId.toString(),
          amount: session.requestedAmount.toString(),
        },
      },
    });

    return failed;
  }

  async getUserWithdrawalHistory(telegramUserId: bigint, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.settlementSession.findMany({
        where: { telegramUserId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.settlementSession.count({
        where: { telegramUserId },
      }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        telegramUserId: item.telegramUserId.toString(),
        requestedAmount: item.requestedAmount.toString(),
        expectedCryptoAmount: item.expectedCryptoAmount.toString(),
      })),
      pagination: { total, limit, offset },
    };
  }
}
