import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditEventType } from '../../common/interfaces/user-state.enum';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    telegramUserId?: bigint;
    eventType: AuditEventType;
    description?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    correlationId?: string;
    severity?: string;
    source?: string;
  }) {
    return this.prisma.auditEvent.create({
      data: {
        telegramUserId: params.telegramUserId || null,
        eventType: params.eventType,
        description: params.description || '',
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        sessionId: params.sessionId,
        correlationId: params.correlationId,
        severity: params.severity || 'INFO',
        source: params.source || 'api',
      },
    });
  }

  async createWithClient(tx: Prisma.TransactionClient, params: {
    telegramUserId?: bigint;
    eventType: AuditEventType;
    description?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    correlationId?: string;
    severity?: string;
    source?: string;
  }) {
    return tx.auditEvent.create({
      data: {
        telegramUserId: params.telegramUserId || null,
        eventType: params.eventType,
        description: params.description || '',
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        sessionId: params.sessionId,
        correlationId: params.correlationId,
        severity: params.severity || 'INFO',
        source: params.source || 'api',
      },
    });
  }

  async findByUser(telegramUserId: bigint, limit = 50, offset = 0) {
    return this.prisma.auditEvent.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async findByEventType(eventType: AuditEventType, limit = 50) {
    return this.prisma.auditEvent.findMany({
      where: { eventType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByDateRange(from: Date, to: Date, limit = 100) {
    return this.prisma.auditEvent.findMany({
      where: {
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countByEventType(eventType: AuditEventType): Promise<number> {
    return this.prisma.auditEvent.count({
      where: { eventType },
    });
  }

  async getRecentEvents(limit = 100): Promise<any[]> {
    return this.prisma.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { telegramUsername: true, firstName: true } } },
    });
  }
}