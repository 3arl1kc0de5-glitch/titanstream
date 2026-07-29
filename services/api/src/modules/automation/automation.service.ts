import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, PlatformEvent } from './event-bus.service';
import { PrismaService } from '../../database/prisma.service';
import { DomainEventType, OperationsQueueStatus } from '@prisma/client';

@Injectable()
export class AutomationService implements OnModuleInit {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Automation triggers & subscribers...');

    // 1. Subscribe to SettlementCompleted events
    this.eventBus.on('SettlementCompleted').subscribe({
      next: async (event: PlatformEvent) => {
        try {
          await this.handleSettlementCompleted(event);
        } catch (err: any) {
          await this.escalateFailure('SETTLEMENT_COMPLETED_AUTOMATION_FAILED', event, err);
        }
      },
    });

    // 2. Subscribe to WithdrawalRequested events
    this.eventBus.on('WithdrawalRequested').subscribe({
      next: async (event: PlatformEvent) => {
        try {
          await this.handleWithdrawalRequested(event);
        } catch (err: any) {
          await this.escalateFailure('WITHDRAWAL_REQUESTED_AUTOMATION_FAILED', event, err);
        }
      },
    });

    // 3. Subscribe to WithdrawalCompleted events
    this.eventBus.on('WithdrawalCompleted').subscribe({
      next: async (event: PlatformEvent) => {
        try {
          await this.handleWithdrawalCompleted(event);
        } catch (err: any) {
          await this.escalateFailure('WITHDRAWAL_COMPLETED_AUTOMATION_FAILED', event, err);
        }
      },
    });
  }

  /**
   * Handle when a settlement completes successfully.
   * Auto-credits referrals and tracks campaigns.
   */
  private async handleSettlementCompleted(event: PlatformEvent) {
    const { settlementId, telegramUserId, amount, asset } = event.payload;
    this.logger.log(`[Automation] Processing SettlementCompleted trigger for settlement ${settlementId}`);

    // Standard timeline integration: record domain event in audit trail
    await this.prisma.financialDomainEvent.create({
      data: {
        eventType: DomainEventType.BALANCE_CHANGED,
        telegramUserId: BigInt(telegramUserId),
        payload: JSON.parse(JSON.stringify({
          action: 'SETTLEMENT_COMPLETED',
          settlementId,
          amount,
          asset,
          correlationId: event.correlationId,
        })),
      },
    });

    // Check referral relations for the depositor
    const userRelation = await this.prisma.referralRelationship.findFirst({
      where: { refereeId: BigInt(telegramUserId) },
      include: { referrer: true },
    }).catch(() => null);

    if (userRelation) {
      this.logger.log(`[Automation] Referral match found! Referrer: ${userRelation.referrerId}, Referee: ${telegramUserId}`);
      // Award 5 Crystals to referrer
      await this.prisma.user.update({
        where: { telegramUserId: userRelation.referrerId },
        data: { educationScore: { increment: 5 } }, // using educationScore as reputation metric
      }).catch(() => null);
    }
  }

  /**
   * Handle when a withdrawal is requested.
   */
  private async handleWithdrawalRequested(event: PlatformEvent) {
    const { withdrawalId, telegramUserId, amount } = event.payload;
    this.logger.log(`[Automation] Processing WithdrawalRequested trigger for withdrawal ${withdrawalId}`);

    // Create tracking timeline record
    await this.prisma.financialDomainEvent.create({
      data: {
        eventType: DomainEventType.LEDGER_POSTING_STARTED,
        telegramUserId: BigInt(telegramUserId),
        payload: JSON.parse(JSON.stringify({
          action: 'WITHDRAWAL_REQUESTED',
          withdrawalId,
          amount,
          correlationId: event.correlationId,
        })),
      },
    });
  }

  /**
   * Handle when a withdrawal completes.
   */
  private async handleWithdrawalCompleted(event: PlatformEvent) {
    const { withdrawalId, telegramUserId, amount } = event.payload;
    this.logger.log(`[Automation] Processing WithdrawalCompleted trigger for withdrawal ${withdrawalId}`);

    // Finalize timeline record
    await this.prisma.financialDomainEvent.create({
      data: {
        eventType: DomainEventType.LEDGER_POSTING_COMPLETED,
        telegramUserId: BigInt(telegramUserId),
        payload: JSON.parse(JSON.stringify({
          action: 'WITHDRAWAL_COMPLETED',
          withdrawalId,
          amount,
          correlationId: event.correlationId,
        })),
      },
    });
  }

  /**
   * Enforce No Silent Failure: write errors during event automation to operations DLQ queue.
   */
  private async escalateFailure(reason: string, event: PlatformEvent, error: Error) {
    this.logger.error(`[Automation] Trigger execution failed for event ${event.type}: ${error.message}`);
    await this.prisma.operationsQueueItem.create({
      data: {
        reason,
        status: OperationsQueueStatus.OPEN,
        payload: {
          eventId: event.id,
          eventType: event.type,
          correlationId: event.correlationId,
          error: error.message,
          stack: error.stack,
          originalEvent: JSON.parse(JSON.stringify(event)),
        },
      },
    });
  }
}
