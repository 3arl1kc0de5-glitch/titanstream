import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CryptoBotClient } from './cryptobot.client';
import { FinancialOrchestratorService } from '../../financial-orchestration/financial-orchestrator.service';
import { ProviderEventService } from '../provider-event.service';
import { FinancialOperationType, PaymentInvoiceStatus, SettlementEventType, SettlementProviderId, SettlementStatus } from '@prisma/client';

@Injectable()
export class CryptoBotReconciliationService {
  private readonly logger = new Logger(CryptoBotReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoBotClient: CryptoBotClient,
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly events: ProviderEventService,
  ) {}

  /**
   * Run automated reconciliation across all pending CryptoBot payment invoices.
   */
  async runReconciliationSweep() {
    this.logger.log('[CryptoBotReconciliation] Starting sweep for pending invoices...');

    const pendingInvoices = await this.prisma.paymentInvoice.findMany({
      where: {
        status: { in: [PaymentInvoiceStatus.CREATED, PaymentInvoiceStatus.WAITING_FOR_PAYMENT] },
      },
      take: 50,
    });

    if (pendingInvoices.length === 0) {
      return { checkedCount: 0, updatedCount: 0 };
    }

    const invoiceIds = pendingInvoices.map((inv) => parseInt(inv.externalInvoiceId, 10)).filter((id) => !isNaN(id));
    if (invoiceIds.length === 0) {
      return { checkedCount: pendingInvoices.length, updatedCount: 0 };
    }

    let updatedCount = 0;

    try {
      const liveInvoices = await this.cryptoBotClient.getInvoices({ invoice_ids: invoiceIds });
      const liveMap = new Map(liveInvoices.map((inv) => [inv.invoice_id.toString(), inv]));

      for (const dbInvoice of pendingInvoices) {
        const liveInvoice = liveMap.get(dbInvoice.externalInvoiceId);
        if (!liveInvoice) continue;

        if (liveInvoice.status === 'paid' && dbInvoice.status !== PaymentInvoiceStatus.PAID) {
          this.logger.log(`[CryptoBotReconciliation] Invoice ${dbInvoice.externalInvoiceId} confirmed PAID on CryptoBot! Executing ledger deposit...`);
          await this.fulfillPaidInvoice(dbInvoice.id, dbInvoice.externalInvoiceId, liveInvoice);
          updatedCount++;
        } else if (liveInvoice.status === 'expired' && dbInvoice.status !== PaymentInvoiceStatus.EXPIRED) {
          this.logger.log(`[CryptoBotReconciliation] Invoice ${dbInvoice.externalInvoiceId} EXPIRED on CryptoBot.`);
          await this.prisma.paymentInvoice.update({
            where: { id: dbInvoice.id },
            data: { status: PaymentInvoiceStatus.EXPIRED },
          });
          updatedCount++;
        }
      }
    } catch (err: any) {
      this.logger.error(`[CryptoBotReconciliation] Sweep failed: ${err?.message}`);
    }

    return { checkedCount: pendingInvoices.length, updatedCount };
  }

  /**
   * Process a confirmed paid invoice, creating double-entry ledger allocations.
   */
  async fulfillPaidInvoice(invoiceDbId: string, externalInvoiceId: string, payload: any) {
    const dbInvoice = await this.prisma.paymentInvoice.findUnique({
      where: { id: invoiceDbId },
    });

    if (!dbInvoice || dbInvoice.status === PaymentInvoiceStatus.PAID) {
      return;
    }

    // Mark PaymentInvoice as PAID
    await this.prisma.paymentInvoice.update({
      where: { id: invoiceDbId },
      data: {
        status: PaymentInvoiceStatus.PAID,
        paidAt: new Date(),
        metadata: { cryptobotPayload: payload },
      },
    });

    // Request Financial Orchestrator double-entry ledger allocation
    const reference = `cryptobot_inv_${externalInvoiceId}`;
    await this.orchestrator.requestOperation({
      telegramUserId: dbInvoice.telegramUserId,
      operationType: FinancialOperationType.SYSTEM_ALLOCATION,
      assetCode: dbInvoice.asset,
      amount: dbInvoice.amount.toString(),
      idempotencyKey: reference,
      reference,
      metadata: {
        source: 'cryptobot_webhook_paid',
        externalInvoiceId,
        invoiceDbId,
        provider: SettlementProviderId.CRYPTOBOT,
      },
    });

    // Sync corresponding SettlementSession if exists
    const matchingSession = await this.prisma.settlementSession.findFirst({
      where: { referenceCode: { contains: externalInvoiceId } },
    });

    if (matchingSession) {
      await this.prisma.settlementSession.update({
        where: { id: matchingSession.id },
        data: {
          status: SettlementStatus.COMPLETED,
          completedAt: new Date(),
          orchestratorReference: reference,
          events: {
            create: {
              eventType: SettlementEventType.SettlementCompleted,
              actorType: 'SYSTEM',
              actorId: SettlementProviderId.CRYPTOBOT,
              payload: { externalInvoiceId, reference },
            },
          },
        },
      });

      await this.events.emit(SettlementProviderId.CRYPTOBOT, matchingSession.id, SettlementEventType.SettlementCompleted, {
        externalInvoiceId,
        reference,
      });
    }
  }
}
