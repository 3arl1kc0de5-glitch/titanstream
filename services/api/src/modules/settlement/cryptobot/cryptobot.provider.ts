import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FinancialOperationType, PaymentInvoiceStatus, Prisma, SettlementEventType, SettlementProviderId, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { FinancialOrchestratorService } from '../../financial-orchestration/financial-orchestrator.service';
import { CreateSettlementSessionDto } from '../dto/create-settlement-session.dto';
import { ProviderEventService } from '../provider-event.service';
import { SettlementCapabilityManifest, SettlementProvider } from '../settlement-provider.interface';
import { CryptoBotClient } from './cryptobot.client';

@Injectable()
export class CryptoBotProvider implements SettlementProvider {
  private readonly logger = new Logger(CryptoBotProvider.name);

  readonly providerId = SettlementProviderId.CRYPTOBOT;
  readonly manifest: SettlementCapabilityManifest = {
    provider: SettlementProviderId.CRYPTOBOT,
    supports_buy: true,
    supports_sell: false,
    supports_refunds: false,
    supports_webhooks: true,
    supports_manual_review: false,
    supports_partial_payments: false,
    supported_assets: ['USDT'],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ProviderEventService,
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly cryptoBotClient: CryptoBotClient,
  ) {}

  getCapabilities(): SettlementCapabilityManifest {
    return this.manifest;
  }

  async initializeSettlement(settlementId: string) {
    const session = await this.load(settlementId);
    await this.emitSettlementEvent(settlementId, SettlementEventType.SettlementInitialized, { provider: this.providerId });
    return this.toProviderIndependentView(session);
  }

  async getSettlementStatus(settlementId: string) {
    const session = await this.load(settlementId);
    return this.toProviderIndependentView(session);
  }

  async verifySettlement(settlementId: string) {
    const session = await this.validateSettlement(settlementId);
    await this.emitSettlementEvent(settlementId, SettlementEventType.SettlementVerificationStarted, { provider: this.providerId });
    return this.toProviderIndependentView(session);
  }

  /**
   * Create a live CryptoBot payment invoice and save a local SettlementSession & PaymentInvoice.
   */
  async createSettlement(telegramUserId: bigint, dto: CreateSettlementSessionDto) {
    // 1. Call CryptoBot API to issue live invoice
    const liveInvoice = await this.cryptoBotClient.createInvoice({
      asset: dto.asset,
      amount: dto.requestedAmount,
      description: `TitanStream ${dto.asset} Funding`,
      payload: `user_${telegramUserId}`,
      expires_in: 900,
    });

    const externalInvoiceId = liveInvoice.invoice_id.toString();
    const referenceCode = `CB-${externalInvoiceId}`;

    // 2. Persist PaymentInvoice
    const paymentInvoice = await this.prisma.paymentInvoice.create({
      data: {
        telegramUserId,
        provider: SettlementProviderId.CRYPTOBOT,
        externalInvoiceId,
        asset: dto.asset,
        amount: new Prisma.Decimal(dto.requestedAmount),
        currency: dto.asset,
        payUrl: liveInvoice.pay_url,
        status: PaymentInvoiceStatus.WAITING_FOR_PAYMENT,
        metadata: {
          botInvoiceUrl: liveInvoice.bot_invoice_url,
          miniAppInvoiceUrl: liveInvoice.mini_app_invoice_url,
        },
      },
    });

    // 3. Persist SettlementSession
    const session = await this.prisma.settlementSession.create({
      data: {
        telegramUserId,
        provider: SettlementProviderId.CRYPTOBOT,
        asset: dto.asset,
        requestedAmount: new Prisma.Decimal(dto.requestedAmount),
        expectedCryptoAmount: new Prisma.Decimal(dto.expectedCryptoAmount),
        exchangeRate: new Prisma.Decimal(dto.exchangeRate),
        country: dto.country || 'GLOBAL',
        mobileMoneyNetwork: dto.mobileMoneyNetwork || 'CRYPTOBOT',
        referenceCode,
        status: SettlementStatus.WAITING_FOR_PAYMENT,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        providerMetadata: {
          externalInvoiceId,
          paymentInvoiceId: paymentInvoice.id,
          payUrl: liveInvoice.pay_url,
          miniAppInvoiceUrl: liveInvoice.mini_app_invoice_url,
        },
        events: {
          create: [
            { eventType: SettlementEventType.SettlementCreated, actorType: 'CUSTOMER', actorId: telegramUserId.toString(), payload: {} },
            { eventType: SettlementEventType.SettlementInitialized, actorType: 'PROVIDER', actorId: SettlementProviderId.CRYPTOBOT, payload: { externalInvoiceId } },
          ],
        },
      },
    });

    await this.emitSettlementEvent(session.id, SettlementEventType.SettlementInitialized, { referenceCode, payUrl: liveInvoice.pay_url });

    return {
      ...this.toProviderIndependentView(session),
      payUrl: liveInvoice.pay_url,
      externalInvoiceId,
    };
  }

  async validateSettlement(settlementId: string) {
    const session = await this.load(settlementId);
    if (session.provider !== SettlementProviderId.CRYPTOBOT) throw new BadRequestException('WRONG_SETTLEMENT_PROVIDER');
    if (session.expiresAt <= new Date()) throw new BadRequestException('SETTLEMENT_EXPIRED');
    return session;
  }

  monitorSettlement(settlementId: string) {
    return this.load(settlementId);
  }

  async approveSettlement(settlementId: string, context: Record<string, unknown> = {}) {
    const session = await this.validateSettlement(settlementId);
    if (session.status === SettlementStatus.COMPLETED) return this.toProviderIndependentView(session);
    if (session.status !== SettlementStatus.WAITING_FOR_PAYMENT && session.status !== SettlementStatus.VERIFYING) {
      throw new BadRequestException(`INVALID_SETTLEMENT_TRANSITION:${session.status}->APPROVED`);
    }

    await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.APPROVED,
        events: { create: { eventType: SettlementEventType.SettlementApproved, actorType: 'PROVIDER', actorId: this.providerId, payload: context as Prisma.InputJsonValue } },
      },
    });
    await this.emitSettlementEvent(settlementId, SettlementEventType.SettlementApproved, context);

    const reference = `settlement_${settlementId}`;
    await this.orchestrator.requestOperation({
      telegramUserId: session.telegramUserId,
      operationType: FinancialOperationType.SYSTEM_ALLOCATION,
      assetCode: session.asset,
      amount: session.expectedCryptoAmount.toString(),
      idempotencyKey: reference,
      reference,
      metadata: { source: 'cryptobot_settlement', settlementId, provider: this.providerId, ...context },
    });

    const completed = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.COMPLETED,
        completedAt: new Date(),
        orchestratorReference: reference,
        events: { create: { eventType: SettlementEventType.SettlementCompleted, actorType: 'SYSTEM', actorId: this.providerId, payload: { reference } } },
      },
    });
    await this.emitSettlementEvent(settlementId, SettlementEventType.SettlementCompleted, { reference });
    return this.toProviderIndependentView(completed);
  }

  rejectSettlement(settlementId: string, reason?: string) {
    return this.close(settlementId, SettlementStatus.REJECTED, SettlementEventType.SettlementRejected, { reason });
  }

  expireSettlement(settlementId: string) {
    return this.close(settlementId, SettlementStatus.EXPIRED, SettlementEventType.SettlementExpired);
  }

  cancelSettlement(settlementId: string) {
    return this.close(settlementId, SettlementStatus.CANCELLED, SettlementEventType.SettlementCancelled);
  }

  emitSettlementEvent(settlementId: string, eventType: SettlementEventType, payload: Record<string, unknown> = {}) {
    return this.events.emit(this.providerId, settlementId, eventType, payload);
  }

  private async close(settlementId: string, status: SettlementStatus, eventType: SettlementEventType, payload: Record<string, unknown> = {}) {
    const session = await this.load(settlementId);
    if (session.status === SettlementStatus.COMPLETED) throw new BadRequestException('SETTLEMENT_ALREADY_COMPLETED');
    const updated = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: { status, events: { create: { eventType, actorType: 'PROVIDER', actorId: this.providerId, payload: payload as Prisma.InputJsonValue } } },
    });
    await this.emitSettlementEvent(settlementId, eventType, payload);
    return this.toProviderIndependentView(updated);
  }

  private async load(settlementId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
    return session;
  }

  private toProviderIndependentView(session: any) {
    return {
      settlementId: session.id,
      provider: session.provider,
      reference: session.referenceCode,
      asset: session.asset,
      requestedAmount: session.requestedAmount.toString(),
      expectedAssetAmount: session.expectedCryptoAmount.toString(),
      exchangeRate: session.exchangeRate.toString(),
      status: session.status,
      expiresAt: session.expiresAt,
    };
  }
}
