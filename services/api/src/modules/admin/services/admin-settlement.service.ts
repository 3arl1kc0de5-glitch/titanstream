import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SettlementProviderId, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OperationalAuditService } from './operational-audit.service';

export interface FilterSettlementsParams {
  status?: SettlementStatus;
  provider?: SettlementProviderId;
  fromDate?: string;
  toDate?: string;
  merchantId?: string;
  telegramUserId?: string;
  minAmount?: string;
  maxAmount?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AdminSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OperationalAuditService,
  ) {}

  async listSettlements(params: FilterSettlementsParams) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.provider) where.provider = params.provider;
    if (params.merchantId) where.operatorId = params.merchantId;
    if (params.telegramUserId) where.telegramUserId = BigInt(params.telegramUserId);
    if (params.fromDate || params.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.settlementSession.findMany({
        where,
        include: {
          user: { select: { telegramUsername: true, firstName: true, lastName: true } },
          operator: { select: { displayName: true, whatsappNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.settlementSession.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        telegramUserId: item.telegramUserId.toString(),
        requestedAmount: item.requestedAmount.toString(),
        expectedCryptoAmount: item.expectedCryptoAmount.toString(),
        exchangeRate: item.exchangeRate.toString(),
      })),
      pagination: { total, limit, offset },
    };
  }

  async getSettlementDetail(settlementId: string) {
    const session = await this.prisma.settlementSession.findUnique({
      where: { id: settlementId },
      include: {
        user: { select: { telegramUserId: true, telegramUsername: true, firstName: true, lastName: true, isReady: true, state: true } },
        operator: { select: { id: true, displayName: true, country: true, mobileMoneyNumber: true, status: true, trustScore: true } },
        events: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) throw new NotFoundException('SETTLEMENT_SESSION_NOT_FOUND');

    const auditHistory = await this.prisma.operationalAuditLog.findMany({
      where: { entity: 'SETTLEMENT', entityId: settlementId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...session,
      telegramUserId: session.telegramUserId.toString(),
      requestedAmount: session.requestedAmount.toString(),
      expectedCryptoAmount: session.expectedCryptoAmount.toString(),
      exchangeRate: session.exchangeRate.toString(),
      user: {
        ...session.user,
        telegramUserId: session.user.telegramUserId.toString(),
      },
      auditHistory,
    };
  }

  async reviewSettlement(admin: { id: string; role: string }, settlementId: string, note: string, actionStatus?: SettlementStatus) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new NotFoundException('SETTLEMENT_SESSION_NOT_FOUND');

    if (note) {
      await this.prisma.settlementNote.create({
        data: {
          settlementId,
          operatorId: admin.id,
          note: `[ADMIN_REVIEW:${admin.role}] ${note}`,
        },
      });
    }

    let updatedSession = session;
    if (actionStatus && actionStatus !== session.status) {
      updatedSession = await this.prisma.settlementSession.update({
        where: { id: settlementId },
        data: { status: actionStatus },
      });
    }

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'SETTLEMENT_REVIEWED',
      entity: 'SETTLEMENT',
      entityId: settlementId,
      metadata: { note, previousStatus: session.status, newStatus: updatedSession.status },
    });

    return {
      status: 'SUCCESS',
      settlementId,
      previousStatus: session.status,
      currentStatus: updatedSession.status,
    };
  }

  async escalateSettlement(admin: { id: string; role: string }, settlementId: string, reason: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new NotFoundException('SETTLEMENT_SESSION_NOT_FOUND');

    const riskEvent = await this.prisma.riskEvent.create({
      data: {
        entityType: 'SETTLEMENT',
        entityId: settlementId,
        ruleTriggered: `ADMIN_ESCALATION: ${reason}`,
        severity: 'HIGH',
        status: 'OPEN',
        assignedOperatorId: admin.id,
        notes: reason,
      },
    });

    await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: { status: SettlementStatus.RISK_FLAGGED },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'SETTLEMENT_ESCALATED',
      entity: 'SETTLEMENT',
      entityId: settlementId,
      metadata: { reason, riskEventId: riskEvent.id },
    });

    return {
      status: 'ESCALATED',
      settlementId,
      riskEventId: riskEvent.id,
    };
  }

  async reassignMerchant(admin: { id: string; role: string }, settlementId: string, newMerchantId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new NotFoundException('SETTLEMENT_SESSION_NOT_FOUND');

    const merchant = await this.prisma.operator.findUnique({ where: { id: newMerchantId } });
    if (!merchant) throw new BadRequestException('TARGET_MERCHANT_NOT_FOUND');

    const updated = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: { operatorId: newMerchantId, status: SettlementStatus.MERCHANT_ASSIGNED },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'MERCHANT_REASSIGNED',
      entity: 'SETTLEMENT',
      entityId: settlementId,
      metadata: { previousOperatorId: session.operatorId, newOperatorId: newMerchantId },
    });

    return {
      status: 'REASSIGNED',
      settlementId,
      operatorId: updated.operatorId,
    };
  }

  async pauseSettlement(admin: { id: string; role: string }, settlementId: string, reason: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new NotFoundException('SETTLEMENT_SESSION_NOT_FOUND');

    const updated = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: { status: SettlementStatus.RISK_HOLD },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'SETTLEMENT_PAUSED',
      entity: 'SETTLEMENT',
      entityId: settlementId,
      metadata: { reason, previousStatus: session.status },
    });

    return {
      status: 'PAUSED',
      settlementId,
      currentStatus: updated.status,
    };
  }
}
