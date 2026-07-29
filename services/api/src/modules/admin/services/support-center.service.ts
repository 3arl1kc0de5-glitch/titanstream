import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  telegramUserId: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedOperatorName?: string;
  linkedOrderId?: string;
  linkedMachineId?: string;
  linkedWithdrawalId?: string;
  internalNotes: Array<{ author: string; note: string; timestamp: string }>;
  createdAt: string;
}

@Injectable()
export class SupportCenterService {
  private readonly tickets = new Map<string, SupportTicketItem>();

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultTickets();
  }

  private seedDefaultTickets() {
    const t1: SupportTicketItem = {
      id: 'sup_101',
      ticketNumber: 'TKT-2026-8801',
      telegramUserId: '1098231',
      title: 'USSD Dial Push Inquiry',
      description: 'User requested assistance verifying Mobile Money deposit for order ORD-100293.',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedOperatorName: 'Treasury Duty Engineer',
      linkedOrderId: 'po_100293',
      internalNotes: [
        { author: 'Duty Operator', note: 'Checked USSD template dial code. User confirmed pin entry.', timestamp: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
    };

    this.tickets.set(t1.id, t1);
  }

  getTickets(): SupportTicketItem[] {
    return Array.from(this.tickets.values());
  }

  getTicket(id: string): SupportTicketItem {
    const tkt = this.tickets.get(id);
    if (!tkt) throw new NotFoundException('SUPPORT_TICKET_NOT_FOUND');
    return tkt;
  }

  createTicket(dto: {
    telegramUserId: string;
    title: string;
    description: string;
    priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    linkedOrderId?: string;
    linkedMachineId?: string;
  }): SupportTicketItem {
    const id = `sup_${Date.now()}`;
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: SupportTicketItem = {
      id,
      ticketNumber,
      telegramUserId: dto.telegramUserId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || 'MEDIUM',
      status: 'OPEN',
      linkedOrderId: dto.linkedOrderId,
      linkedMachineId: dto.linkedMachineId,
      internalNotes: [],
      createdAt: new Date().toISOString(),
    };

    this.tickets.set(id, newTicket);
    return newTicket;
  }

  addNote(id: string, note: string, author: string): SupportTicketItem {
    const tkt = this.getTicket(id);
    tkt.internalNotes.push({
      author,
      note,
      timestamp: new Date().toISOString(),
    });
    this.tickets.set(id, tkt);
    return tkt;
  }

  updateTicketStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'): SupportTicketItem {
    const tkt = this.getTicket(id);
    tkt.status = status;
    this.tickets.set(id, tkt);
    return tkt;
  }
}
