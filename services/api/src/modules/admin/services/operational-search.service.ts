import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentOrderService } from '../../payment-order/payment-order.service';
import { IncidentEngineService } from './incident-engine.service';

export interface SearchResultItem {
  category: 'PAYMENT_ORDER' | 'USER' | 'INCIDENT' | 'OPERATIONS_QUEUE' | 'RISK_EVENT' | 'AUDIT_LOG';
  id: string;
  title: string;
  subtitle: string;
  status: string;
  timestamp: string;
  link: string;
}

@Injectable()
export class OperationalSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentOrderService: PaymentOrderService,
    private readonly incidentEngine: IncidentEngineService,
  ) {}

  async search(query: string): Promise<SearchResultItem[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim().toLowerCase();
    const results: SearchResultItem[] = [];

    // 1. Search Payment Orders
    const allOrders = this.paymentOrderService.getAllOrders();
    allOrders.forEach((o) => {
      if (
        o.id.toLowerCase().includes(q) ||
        o.reference.toLowerCase().includes(q) ||
        o.telegramUserId.includes(q) ||
        (o.receivingNumber && o.receivingNumber.includes(q))
      ) {
        results.push({
          category: 'PAYMENT_ORDER',
          id: o.id,
          title: `Payment Order ${o.reference} ($${o.amount} USDT)`,
          subtitle: `Type: ${o.type} | User: ${o.telegramUserId} | Method: ${o.paymentMethod}`,
          status: o.status,
          timestamp: o.createdAt,
          link: `/admin/orders`,
        });
      }
    });

    // 2. Search Incidents
    const incidents = this.incidentEngine.getAllIncidents();
    incidents.forEach((inc) => {
      if (
        inc.id.toLowerCase().includes(q) ||
        inc.reference.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.affectedComponent.toLowerCase().includes(q)
      ) {
        results.push({
          category: 'INCIDENT',
          id: inc.id,
          title: `Incident ${inc.reference}: ${inc.title}`,
          subtitle: `Severity: ${inc.severity} | Owner: ${inc.ownerName || 'Unassigned'}`,
          status: inc.status,
          timestamp: inc.createdAt,
          link: `/admin/operations`,
        });
      }
    });

    // 3. Search Users in Database
    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { telegramUsername: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
      });

      users.forEach((u) => {
        results.push({
          category: 'USER',
          id: u.telegramUserId.toString(),
          title: `User: ${u.firstName} ${u.lastName || ''} (@${u.telegramUsername || 'no_handle'})`,
          subtitle: `State: ${u.state} | ID: ${u.telegramUserId}`,
          status: String(u.state),
          timestamp: u.createdAt.toISOString(),
          link: `/admin/users`,
        });
      });
    } catch (err) {
      // Ignore fallback
    }

    return results;
  }
}
