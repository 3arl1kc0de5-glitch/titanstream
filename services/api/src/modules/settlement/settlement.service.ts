import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { FinancialOperationType, Prisma, SettlementEventType, SettlementProviderId, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { CreateSettlementSessionDto } from './dto/create-settlement-session.dto';
import { OperatorRepository } from './operator.repository';
import { RoutingService } from './routing.service';
import { EventBusService } from '../automation/event-bus.service';

const ACTIVE_STATUSES = [
  SettlementStatus.CREATED,
  SettlementStatus.INITIALIZED,
  SettlementStatus.OPERATOR_ASSIGNED,
  SettlementStatus.WAITING_FOR_PAYMENT,
  SettlementStatus.VERIFYING,
  SettlementStatus.APPROVED,
  SettlementStatus.POSTED,
  SettlementStatus.PAYMENT_RECEIVED,
  SettlementStatus.USDT_SENT,
];

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: RoutingService,
    private readonly operators: OperatorRepository,
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly eventBus: EventBusService,
  ) {}

  async createCustomerSession(telegramUserId: bigint, dto: CreateSettlementSessionDto) {
    await this.assertNoActiveSettlement(telegramUserId, dto.asset);
    const operator = await this.routing.selectOperator({
      country: dto.country,
      network: dto.mobileMoneyNetwork,
      asset: dto.asset,
      requestedAmount: dto.requestedAmount,
    });
    const referenceCode = this.referenceCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const session = await this.prisma.settlementSession.create({
      data: {
        telegramUserId,
        operatorId: operator.id,
        provider: SettlementProviderId.INTERNAL_OPERATIONS,
        asset: dto.asset,
        requestedAmount: new Prisma.Decimal(dto.requestedAmount),
        expectedCryptoAmount: new Prisma.Decimal(dto.expectedCryptoAmount),
        exchangeRate: new Prisma.Decimal(dto.exchangeRate),
        country: dto.country,
        mobileMoneyNetwork: dto.mobileMoneyNetwork,
        referenceCode,
        status: SettlementStatus.WAITING_FOR_PAYMENT,
        expiresAt,
        providerMetadata: { provider: SettlementProviderId.INTERNAL_OPERATIONS },
        events: {
          create: [
            { eventType: SettlementEventType.SettlementCreated, actorType: 'CUSTOMER', actorId: telegramUserId.toString(), payload: {} },
            { eventType: SettlementEventType.OperatorAssigned, actorType: 'SYSTEM', actorId: operator.id, payload: { operatorId: operator.id } },
          ],
        },
      },
      include: { operator: true },
    });
    await this.operators.incrementLoad(operator.id);
    
    // Emit SettlementCreated event
    this.eventBus.publish({
      type: 'SettlementCreated',
      correlationId: `corr_settle_${session.id}`,
      actorId: telegramUserId.toString(),
      payload: {
        settlementId: session.id,
        telegramUserId: telegramUserId.toString(),
        amount: dto.requestedAmount,
        asset: dto.asset,
      },
    });

    return this.toCustomerView(session);
  }

  getCustomerSession(telegramUserId: bigint, settlementId: string) {
    return this.prisma.settlementSession
      .findFirst({ where: { id: settlementId, telegramUserId }, include: { operator: true } })
      .then((session) => {
        if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
        return this.toCustomerView(session);
      });
  }

  listOperatorSettlements(operatorId: string) {
    return this.prisma.settlementSession.findMany({
      where: { operatorId },
      orderBy: { createdAt: 'desc' },
      include: { events: true, notes: true },
    });
  }

  getProviderSession(settlementId: string) {
    return this.prisma.settlementSession.findUnique({ where: { id: settlementId }, include: { events: true, notes: true, operator: true } });
  }

  accept(operatorId: string, settlementId: string) {
    return this.transitionOperatorSettlement({
      operatorId,
      settlementId,
      allowed: [SettlementStatus.WAITING_FOR_PAYMENT],
      next: SettlementStatus.WAITING_FOR_PAYMENT,
      eventType: SettlementEventType.OperatorAccepted,
    });
  }

  async reject(operatorId: string, settlementId: string, reason?: string) {
    const session = await this.transitionOperatorSettlement({
      operatorId,
      settlementId,
      allowed: [SettlementStatus.WAITING_FOR_PAYMENT, SettlementStatus.OPERATOR_ASSIGNED],
      next: SettlementStatus.REJECTED,
      eventType: SettlementEventType.SettlementRejected,
      payload: { reason },
    });
    await this.queueException(settlementId, 'INTERNAL_OPERATIONS_REJECTION', { reason });
    await this.operators.decrementLoad(operatorId).catch(() => undefined);
    return session;
  }

  async rejectAssignedSettlement(settlementId: string, reason?: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session?.operatorId) throw new BadRequestException('INTERNAL_OPERATIONS_NOT_ASSIGNED');
    return this.reject(session.operatorId, settlementId, reason);
  }

  confirmPaymentReceived(operatorId: string, settlementId: string, amount: string) {
    return this.transitionOperatorSettlement({
      operatorId,
      settlementId,
      allowed: [SettlementStatus.WAITING_FOR_PAYMENT],
      next: SettlementStatus.PAYMENT_RECEIVED,
      eventType: SettlementEventType.PaymentReceived,
      amount,
      timestampField: 'paymentReceivedAt',
    });
  }

  async confirmUsdtSent(operatorId: string, settlementId: string, amount: string) {
    const session = await this.loadOperatorSession(operatorId, settlementId);
    this.assertActive(session);
    if (session.status !== SettlementStatus.PAYMENT_RECEIVED) throw new BadRequestException('PAYMENT_NOT_CONFIRMED');
    this.assertAmount(session.expectedCryptoAmount, amount);

    await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.USDT_SENT,
        usdtSentAt: new Date(),
        events: { create: { eventType: SettlementEventType.USDTSent, actorType: 'INTERNAL_OPERATIONS', actorId: operatorId, payload: { amount } } },
      },
    });

    const reference = `settlement_${settlementId}`;
    await this.orchestrator.requestOperation({
      telegramUserId: session.telegramUserId,
      operationType: FinancialOperationType.SYSTEM_ALLOCATION,
      assetCode: session.asset,
      amount: session.expectedCryptoAmount.toString(),
      idempotencyKey: reference,
      reference,
      metadata: {
        source: 'operator_settlement',
        settlementId,
        operatorId,
        referenceCode: session.referenceCode,
        mobileMoneyAmount: session.requestedAmount.toString(),
      },
    });

    const completed = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.COMPLETED,
        completedAt: new Date(),
        orchestratorReference: reference,
        events: {
          create: [
            { eventType: SettlementEventType.SettlementApproved, actorType: 'SYSTEM', actorId: operatorId, payload: { reference } },
            { eventType: SettlementEventType.SettlementCompleted, actorType: 'SYSTEM', actorId: operatorId, payload: { reference } },
          ],
        },
      },
      include: { events: true },
    });
    
    // Emit SettlementCompleted event
    this.eventBus.publish({
      type: 'SettlementCompleted',
      correlationId: `corr_settle_${settlementId}`,
      actorId: operatorId,
      payload: {
        settlementId,
        telegramUserId: session.telegramUserId.toString(),
        amount: session.expectedCryptoAmount.toString(),
        asset: session.asset,
        reference,
      },
    });

    await this.operators.decrementLoad(operatorId).catch(() => undefined);
    return completed;
  }

  async processSettlementApproved(settlementId: string, context: Record<string, unknown> = {}) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
    if (session.status === SettlementStatus.COMPLETED) {
      return session;
    }

    const reference = `settlement_${settlementId}`;
    await this.orchestrator.requestOperation({
      telegramUserId: session.telegramUserId,
      operationType: FinancialOperationType.SYSTEM_ALLOCATION,
      assetCode: session.asset,
      amount: session.expectedCryptoAmount.toString(),
      idempotencyKey: reference,
      reference,
      metadata: {
        source: 'settlement_approved',
        settlementId,
        provider: session.provider,
        referenceCode: session.referenceCode,
        ...context,
      },
    });

    const completed = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.COMPLETED,
        completedAt: new Date(),
        orchestratorReference: reference,
        events: {
          create: [
            { eventType: SettlementEventType.SettlementApproved, actorType: 'SYSTEM', actorId: session.provider, payload: context as Prisma.InputJsonValue },
            { eventType: SettlementEventType.SettlementCompleted, actorType: 'SYSTEM', actorId: session.provider, payload: { reference } },
          ],
        },
      },
      include: { events: true },
    });

    // Emit SettlementCompleted event
    this.eventBus.publish({
      type: 'SettlementCompleted',
      correlationId: `corr_settle_${settlementId}`,
      actorId: session.provider,
      payload: {
        settlementId,
        telegramUserId: session.telegramUserId.toString(),
        amount: session.expectedCryptoAmount.toString(),
        asset: session.asset,
        reference,
      },
    });

    if (session.operatorId) {
      await this.operators.decrementLoad(session.operatorId).catch(() => undefined);
    }
    return completed;
  }

  addOperatorNote(operatorId: string, settlementId: string, note: string) {
    return this.prisma.settlementNote.create({ data: { operatorId, settlementId, note } });
  }

  async expireOverdue(now = new Date()) {
    const sessions = await this.prisma.settlementSession.findMany({
      where: { status: { in: ACTIVE_STATUSES }, expiresAt: { lt: now } },
    });
    for (const session of sessions) {
      await this.prisma.settlementSession.update({
        where: { id: session.id },
        data: {
          status: SettlementStatus.EXPIRED,
          events: { create: { eventType: SettlementEventType.SettlementExpired, actorType: 'SYSTEM', payload: {} } },
        },
      });
      await this.queueException(session.id, 'SETTLEMENT_EXPIRED', { expiresAt: session.expiresAt });
      if (session.operatorId) await this.operators.decrementLoad(session.operatorId).catch(() => undefined);
    }
    return { expired: sessions.length };
  }

  async expireOne(settlementId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
    if (session.status === SettlementStatus.COMPLETED) throw new BadRequestException('SETTLEMENT_ALREADY_COMPLETED');
    const updated = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.EXPIRED,
        events: { create: { eventType: SettlementEventType.SettlementExpired, actorType: 'SYSTEM', payload: {} } },
      },
    });
    await this.queueException(settlementId, 'SETTLEMENT_EXPIRED', { expiresAt: session.expiresAt });
    if (session.operatorId) await this.operators.decrementLoad(session.operatorId).catch(() => undefined);
    return updated;
  }

  async cancel(settlementId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
    if (session.status === SettlementStatus.COMPLETED) throw new BadRequestException('SETTLEMENT_ALREADY_COMPLETED');
    const updated = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.CANCELLED,
        events: { create: { eventType: SettlementEventType.SettlementCancelled, actorType: 'CUSTOMER', payload: {} } },
      },
    });
    if (session.operatorId) await this.operators.decrementLoad(session.operatorId).catch(() => undefined);
    return updated;
  }

  private async transitionOperatorSettlement(params: {
    operatorId: string;
    settlementId: string;
    allowed: SettlementStatus[];
    next: SettlementStatus;
    eventType: SettlementEventType;
    amount?: string;
    payload?: Record<string, unknown>;
    timestampField?: 'paymentReceivedAt';
  }) {
    const session = await this.loadOperatorSession(params.operatorId, params.settlementId);
    this.assertActive(session);
    if (!params.allowed.includes(session.status)) throw new BadRequestException(`INVALID_SETTLEMENT_TRANSITION:${session.status}->${params.next}`);
    if (params.amount) this.assertAmount(session.requestedAmount, params.amount);
    return this.prisma.settlementSession.update({
      where: { id: params.settlementId },
      data: {
        status: params.next,
        ...(params.timestampField ? { [params.timestampField]: new Date() } : {}),
        events: {
          create: {
            eventType: params.eventType,
            actorType: 'INTERNAL_OPERATIONS',
            actorId: params.operatorId,
            payload: (params.payload || {}) as Prisma.InputJsonValue,
          },
        },
      },
      include: { events: true, notes: true },
    });
  }

  private async loadOperatorSession(operatorId: string, settlementId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
    if (session.operatorId !== operatorId) throw new ForbiddenException('INTERNAL_OPERATIONS_NOT_ASSIGNED');
    return session;
  }

  private assertActive(session: any) {
    if (session.expiresAt <= new Date()) throw new BadRequestException('SETTLEMENT_EXPIRED');
    if (!ACTIVE_STATUSES.includes(session.status)) throw new BadRequestException('SETTLEMENT_NOT_ACTIVE');
  }

  private assertAmount(expected: Prisma.Decimal, actual: string) {
    if (!expected.equals(new Prisma.Decimal(actual))) throw new BadRequestException('INVALID_AMOUNT');
  }

  private queueException(settlementId: string, reason: string, payload: Record<string, unknown>) {
    return this.prisma.operationsQueueItem.create({ data: { settlementId, reason, payload: payload as Prisma.InputJsonValue } });
  }

  private async assertNoActiveSettlement(telegramUserId: bigint, asset: string) {
    const existing = await this.prisma.settlementSession.findFirst({
      where: { telegramUserId, asset, status: { in: ACTIVE_STATUSES } },
    });
    if (existing) throw new BadRequestException('ACTIVE_SETTLEMENT_EXISTS');
  }

  private toCustomerView(session: any) {
    return {
      settlementId: session.id,
      referenceCode: session.referenceCode,
      mobileMoneyNumber: session.operator?.mobileMoneyNumber,
      amount: session.requestedAmount.toString(),
      expectedCryptoAmount: session.expectedCryptoAmount.toString(),
      asset: session.asset,
      status: session.status,
      expiresAt: session.expiresAt,
      secondsRemaining: Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
    };
  }

  private referenceCode() {
    return `TS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
}
