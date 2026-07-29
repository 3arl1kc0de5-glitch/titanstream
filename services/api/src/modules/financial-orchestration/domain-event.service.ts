import { Injectable } from '@nestjs/common';
import { DomainEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DomainEventService {
  constructor(private readonly prisma: PrismaService) {}

  emit(params: {
    eventType: DomainEventType;
    operationId?: string;
    telegramUserId?: bigint;
    financialAccountId?: string;
    transactionId?: string;
    payload?: Record<string, unknown>;
  }) {
    return this.prisma.financialDomainEvent.create({
      data: {
        eventType: params.eventType,
        operationId: params.operationId,
        telegramUserId: params.telegramUserId,
        financialAccountId: params.financialAccountId,
        transactionId: params.transactionId,
        payload: (params.payload || {}) as Prisma.InputJsonValue,
      },
    });
  }
}
