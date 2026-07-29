import { Injectable, NotFoundException } from '@nestjs/common';
import { RiskEventStatus, RiskSeverity } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OperationalAuditService } from './operational-audit.service';

export interface CreateRiskEventDto {
  entityType: string;
  entityId: string;
  ruleTriggered: string;
  severity?: RiskSeverity;
  notes?: string;
}

@Injectable()
export class RiskOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OperationalAuditService,
  ) {}

  async listRiskEvents(params: { status?: RiskEventStatus; severity?: RiskSeverity; limit?: number; offset?: number }) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.severity) where.severity = params.severity;

    const [items, total] = await Promise.all([
      this.prisma.riskEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.riskEvent.count({ where }),
    ]);

    return {
      items,
      pagination: { total, limit, offset },
    };
  }

  async createRiskEvent(admin: { id: string; role: string }, dto: CreateRiskEventDto) {
    const event = await this.prisma.riskEvent.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        ruleTriggered: dto.ruleTriggered,
        severity: dto.severity || RiskSeverity.MEDIUM,
        status: RiskEventStatus.OPEN,
        assignedOperatorId: admin.id,
        notes: dto.notes,
      },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'RISK_EVENT_CREATED',
      entity: 'RISK_EVENT',
      entityId: event.id,
      metadata: { entityType: dto.entityType, entityId: dto.entityId, ruleTriggered: dto.ruleTriggered },
    });

    return event;
  }

  async updateRiskEvent(
    admin: { id: string; role: string },
    riskId: string,
    params: { status?: RiskEventStatus; assignedOperatorId?: string; notes?: string },
  ) {
    const event = await this.prisma.riskEvent.findUnique({ where: { id: riskId } });
    if (!event) throw new NotFoundException('RISK_EVENT_NOT_FOUND');

    const updateData: any = {};
    if (params.status) {
      updateData.status = params.status;
      if (params.status === RiskEventStatus.RESOLVED || params.status === RiskEventStatus.DISMISSED) {
        updateData.resolvedAt = new Date();
      }
    }
    if (params.assignedOperatorId) updateData.assignedOperatorId = params.assignedOperatorId;
    if (params.notes) updateData.notes = params.notes;

    const updated = await this.prisma.riskEvent.update({
      where: { id: riskId },
      data: updateData,
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: `RISK_EVENT_${params.status || 'UPDATED'}`,
      entity: 'RISK_EVENT',
      entityId: riskId,
      metadata: { previousStatus: event.status, newStatus: updated.status, notes: params.notes },
    });

    return updated;
  }
}
