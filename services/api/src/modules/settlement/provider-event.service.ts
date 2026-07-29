import { Injectable } from '@nestjs/common';
import { Prisma, SettlementEventType, SettlementProviderId } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProviderEventService {
  constructor(private readonly prisma: PrismaService) {}

  emit(providerId: SettlementProviderId, settlementId: string | null, eventType: SettlementEventType, payload: Record<string, unknown> = {}) {
    return this.prisma.providerEvent.create({
      data: {
        providerId,
        settlementId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}
