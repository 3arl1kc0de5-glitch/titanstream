import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MerchantStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OperationalAuditService } from './operational-audit.service';

export interface CreateMerchantDto {
  displayName: string;
  country: string;
  phone: string;
  telegramIdentifier?: string;
  whatsappContact: string;
  supportedNetworks: string[];
  supportedAssets: string[];
  dailyLimit?: string;
}

@Injectable()
export class MerchantPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OperationalAuditService,
  ) {}

  async listMerchants(params: { status?: MerchantStatus; country?: string; limit?: number; offset?: number }) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.country) where.country = params.country;

    const [items, total] = await Promise.all([
      this.prisma.merchantProfile.findMany({
        where,
        include: { metrics: { orderBy: { updatedAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.merchantProfile.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        dailyLimit: item.dailyLimit.toString(),
      })),
      pagination: { total, limit, offset },
    };
  }

  async getMerchant(merchantId: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { id: merchantId },
      include: { metrics: true },
    });
    if (!merchant) throw new NotFoundException('MERCHANT_NOT_FOUND');

    return {
      ...merchant,
      dailyLimit: merchant.dailyLimit.toString(),
    };
  }

  async createMerchant(admin: { id: string; role: string }, dto: CreateMerchantDto) {
    const merchant = await this.prisma.merchantProfile.create({
      data: {
        displayName: dto.displayName,
        country: dto.country,
        phone: dto.phone,
        telegramIdentifier: dto.telegramIdentifier,
        whatsappContact: dto.whatsappContact,
        supportedNetworks: dto.supportedNetworks,
        supportedAssets: dto.supportedAssets,
        dailyLimit: dto.dailyLimit ? new Prisma.Decimal(dto.dailyLimit) : new Prisma.Decimal(5000),
        status: MerchantStatus.PENDING,
      },
    });

    // Also sync to Operator model for routing compatibility
    await this.prisma.operator.create({
      data: {
        id: merchant.id,
        displayName: merchant.displayName,
        whatsappNumber: merchant.whatsappContact,
        telegramUsername: merchant.telegramIdentifier || null,
        country: merchant.country,
        supportedCurrencies: merchant.supportedAssets as any,
        supportedMobileMoneyNetworks: merchant.supportedNetworks as any,
        mobileMoneyNumber: merchant.phone,
        dailyLimit: merchant.dailyLimit,
        status: 'PENDING' as any,
        availability: 'OFFLINE' as any,
      },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'MERCHANT_CREATED',
      entity: 'MERCHANT',
      entityId: merchant.id,
      metadata: { displayName: dto.displayName, country: dto.country },
    });

    return {
      ...merchant,
      dailyLimit: merchant.dailyLimit.toString(),
    };
  }

  async updateMerchantStatus(admin: { id: string; role: string }, merchantId: string, newStatus: MerchantStatus, reason?: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('MERCHANT_NOT_FOUND');

    const updated = await this.prisma.merchantProfile.update({
      where: { id: merchantId },
      data: { status: newStatus },
    });

    // Sync operator status
    let operatorStatus = 'INACTIVE';
    if (newStatus === MerchantStatus.ACTIVE) operatorStatus = 'ACTIVE';
    if (newStatus === MerchantStatus.SUSPENDED || newStatus === MerchantStatus.DISABLED) operatorStatus = 'SUSPENDED';

    await this.prisma.operator.updateMany({
      where: { id: merchantId },
      data: { status: operatorStatus as any },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: `MERCHANT_STATUS_${newStatus}`,
      entity: 'MERCHANT',
      entityId: merchantId,
      metadata: { previousStatus: merchant.status, newStatus, reason },
    });

    return {
      status: 'UPDATED',
      merchantId,
      previousStatus: merchant.status,
      currentStatus: updated.status,
    };
  }

  async updateMerchantLimits(admin: { id: string; role: string }, merchantId: string, dailyLimitUsd: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('MERCHANT_NOT_FOUND');

    const updated = await this.prisma.merchantProfile.update({
      where: { id: merchantId },
      data: { dailyLimit: new Prisma.Decimal(dailyLimitUsd) },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'MERCHANT_LIMITS_UPDATED',
      entity: 'MERCHANT',
      entityId: merchantId,
      metadata: { previousLimit: merchant.dailyLimit.toString(), newLimit: dailyLimitUsd },
    });

    return {
      status: 'UPDATED',
      merchantId,
      dailyLimit: updated.dailyLimit.toString(),
    };
  }

  async calculateMerchantPerformance(merchantId: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('MERCHANT_NOT_FOUND');

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sessions = await this.prisma.settlementSession.findMany({
      where: { operatorId: merchantId, createdAt: { gte: since30d } },
    });

    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
    const failed = sessions.filter((s) => s.status === 'FAILED' || s.status === 'EXPIRED').length;
    const rejected = sessions.filter((s) => s.status === 'REJECTED').length;
    const disputed = sessions.filter((s) => s.status === 'DISPUTED').length;
    const total = sessions.length;

    const completionRate = total > 0 ? (completed / total) * 100 : 100;
    const disputeRate = total > 0 ? (disputed / total) * 100 : 0;

    // Trust Score Calculation
    let trustScore = 100.0;
    trustScore -= disputed * 5.0;
    trustScore -= rejected * 2.0;
    trustScore -= failed * 1.0;
    trustScore = Math.max(0, Math.min(100, trustScore));

    const updatedMerchant = await this.prisma.merchantProfile.update({
      where: { id: merchantId },
      data: {
        trustScore,
        completionRate,
      },
    });

    return {
      merchant_id: merchantId,
      displayName: merchant.displayName,
      metrics: {
        completed_settlements: completed,
        failed_settlements: failed,
        rejected_settlements: rejected,
        disputed_settlements: disputed,
        dispute_rate: `${disputeRate.toFixed(1)}%`,
        completion_rate: `${completionRate.toFixed(1)}%`,
        trust_score: `${trustScore.toFixed(1)}%`,
        average_completion_time: `${merchant.averageCompletionTimeSeconds}s`,
      },
    };
  }
}
