import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportCategory, SupportPriority, SupportStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OperationalAuditService } from './operational-audit.service';

export interface CreateSupportCaseDto {
  userId?: string;
  settlementId?: string;
  category: SupportCategory;
  priority?: SupportPriority;
  notes?: string;
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OperationalAuditService,
  ) {}

  async listCases(params: { status?: SupportStatus; category?: SupportCategory; priority?: SupportPriority; limit?: number; offset?: number }) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;
    if (params.priority) where.priority = params.priority;

    const [items, total] = await Promise.all([
      this.prisma.supportCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.supportCase.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        userId: item.userId?.toString(),
      })),
      pagination: { total, limit, offset },
    };
  }

  async createCase(admin: { id: string; role: string }, dto: CreateSupportCaseDto) {
    const supportCase = await this.prisma.supportCase.create({
      data: {
        userId: dto.userId ? BigInt(dto.userId) : null,
        settlementId: dto.settlementId || null,
        category: dto.category,
        priority: dto.priority || SupportPriority.MEDIUM,
        status: SupportStatus.OPEN,
        assignedOperatorId: admin.id,
        notes: dto.notes,
      },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'SUPPORT_CASE_CREATED',
      entity: 'SUPPORT_CASE',
      entityId: supportCase.id,
      metadata: { category: dto.category, priority: supportCase.priority },
    });

    return {
      ...supportCase,
      userId: supportCase.userId?.toString(),
    };
  }

  async updateCase(
    admin: { id: string; role: string },
    caseId: string,
    params: { status?: SupportStatus; priority?: SupportPriority; assignedOperatorId?: string; notes?: string },
  ) {
    const existing = await this.prisma.supportCase.findUnique({ where: { id: caseId } });
    if (!existing) throw new NotFoundException('SUPPORT_CASE_NOT_FOUND');

    const updated = await this.prisma.supportCase.update({
      where: { id: caseId },
      data: {
        ...(params.status && { status: params.status }),
        ...(params.priority && { priority: params.priority }),
        ...(params.assignedOperatorId && { assignedOperatorId: params.assignedOperatorId }),
        ...(params.notes && { notes: params.notes }),
      },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: `SUPPORT_CASE_${params.status || 'UPDATED'}`,
      entity: 'SUPPORT_CASE',
      entityId: caseId,
      metadata: { previousStatus: existing.status, newStatus: updated.status },
    });

    return {
      ...updated,
      userId: updated.userId?.toString(),
    };
  }
}
