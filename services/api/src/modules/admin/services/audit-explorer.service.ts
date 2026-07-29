import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface AuditExplorerEntry {
  id: string;
  who: string; // operator or system
  what: string; // event type
  when: string; // timestamp
  where: string; // endpoint or service
  why: string; // reason
  correlationId: string;
  affectedObjects: Array<{ type: string; id: string }>;
  previousValue?: any;
  newValue?: any;
}

@Injectable()
export class AuditExplorerService {
  constructor(private readonly prisma: PrismaService) {}

  async searchAuditLogs(query?: string, eventType?: string): Promise<AuditExplorerEntry[]> {
    const rawEvents = await this.prisma.auditEvent.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    return rawEvents.map((evt) => {
      const meta = typeof evt.metadata === 'object' && evt.metadata ? evt.metadata : {};
      return {
        id: evt.id,
        who: evt.telegramUserId ? `User ${evt.telegramUserId}` : 'System/Admin',
        what: evt.eventType,
        when: evt.createdAt.toISOString(),
        where: String((meta as any).source || 'API Gateway'),
        why: evt.description || 'System operation',
        correlationId: String((meta as any).correlationId || evt.id),
        affectedObjects: [
          { type: 'USER', id: evt.telegramUserId?.toString() || 'system' },
        ],
        previousValue: (meta as any).previousValue,
        newValue: (meta as any).newValue || meta,
      };
    });
  }
}
