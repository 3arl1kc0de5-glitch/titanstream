import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GrowthEventType, Prisma } from '@prisma/client';

export interface GrowthEventPayload {
  telegramUserId: bigint;
  eventType: GrowthEventType;
  payload?: Record<string, unknown>;
  correlationId?: string;
}

@Injectable()
export class GrowthEventService {
  private readonly logger = new Logger(GrowthEventService.name);
  private readonly eventListeners: Map<GrowthEventType, Array<(event: any) => Promise<void>>> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register an async listener for specific growth domain event types.
   */
  on(eventType: GrowthEventType, listener: (event: any) => Promise<void>): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Publish and persist a Growth Domain Event, triggering async listeners.
   */
  async publish(event: GrowthEventPayload): Promise<any> {
    this.logger.log(`[GrowthEvent] Emitting ${event.eventType} for user ${event.telegramUserId}`);

    const record = await this.prisma.growthEvent.create({
      data: {
        telegramUserId: event.telegramUserId,
        eventType: event.eventType,
        payload: (event.payload as Prisma.InputJsonValue) || {},
        correlationId: event.correlationId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      },
    });

    // Execute listeners asynchronously without blocking the primary call
    const listeners = this.eventListeners.get(event.eventType) || [];
    for (const listener of listeners) {
      listener(record).catch((err) => {
        this.logger.error(`Error executing growth event listener for ${event.eventType}: ${err.message}`, err.stack);
      });
    }

    return record;
  }

  /**
   * Query event history for a given user.
   */
  async getUserEvents(telegramUserId: bigint, limit = 50) {
    return this.prisma.growthEvent.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
