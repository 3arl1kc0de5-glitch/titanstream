import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { MachineService } from '../machine/machine.service';
import { FinancialOperationType } from '@prisma/client';
import { AuditEventType } from '../../common/interfaces/user-state.enum';

export type PaymentOrderType = 'DEPOSIT' | 'WITHDRAWAL' | 'MACHINE_PURCHASE' | 'REFUND' | 'ADJUSTMENT';
export type PaymentOrderStatus = 
  | 'CREATED' 
  | 'AWAITING_PAYMENT' 
  | 'AWAITING_VERIFICATION' 
  | 'APPROVED' 
  | 'POSTING_TO_LEDGER' 
  | 'COMPLETED' 
  | 'REJECTED' 
  | 'EXPIRED' 
  | 'CANCELLED';

export interface CreatePaymentOrderDto {
  type: PaymentOrderType;
  amount: number; // in USDT or fiat equivalent
  currency?: string; // USDT, UGX, KES
  paymentMethod?: 'MOBILE_MONEY' | 'CRYPTOBOT';
  network?: string; // MTN, AIRTEL
  country?: string; // UG, KE
  mobileNumber?: string;
  metadata?: Record<string, any>;
}

export interface PaymentDestinationConfig {
  id: string;
  network: string;
  country: string;
  currency: string;
  receivingNumber: string;
  receivingName: string;
  ussdTemplate: string;
  exchangeRateUsdt: number;
  minAmountUsdt: number;
  maxAmountUsdt: number;
  isActive: boolean;
}

@Injectable()
export class PaymentOrderService {
  // Configurable Command Center destinations for mobile money receiving
  private readonly defaultConfigs: PaymentDestinationConfig[] = [
    {
      id: 'cfg_mtn_ug',
      network: 'MTN',
      country: 'UG',
      currency: 'UGX',
      receivingNumber: '0771234567',
      receivingName: 'TitanStream Escrow UG',
      ussdTemplate: '*165*1*1*{phone}*{amount}#',
      exchangeRateUsdt: 3700,
      minAmountUsdt: 1.0,
      maxAmountUsdt: 5000.0,
      isActive: true,
    },
    {
      id: 'cfg_airtel_ug',
      network: 'AIRTEL',
      country: 'UG',
      currency: 'UGX',
      receivingNumber: '0751234567',
      receivingName: 'TitanStream Escrow UG',
      ussdTemplate: '*185*9*{phone}*{amount}#',
      exchangeRateUsdt: 3700,
      minAmountUsdt: 1.0,
      maxAmountUsdt: 5000.0,
      isActive: true,
    },
  ];

  // In-memory PaymentOrder store (persists orders across operational flows)
  private readonly orders = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
    private readonly orchestrator: FinancialOrchestratorService,
    @Inject(forwardRef(() => MachineService))
    private readonly machineService?: MachineService,
  ) {}

  getDestinationConfigs(): PaymentDestinationConfig[] {
    return this.defaultConfigs.filter((c) => c.isActive);
  }

  updateDestinationConfig(id: string, dto: Partial<PaymentDestinationConfig>) {
    const idx = this.defaultConfigs.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.defaultConfigs[idx] = { ...this.defaultConfigs[idx], ...dto };
      return this.defaultConfigs[idx];
    }
    const newCfg: PaymentDestinationConfig = {
      id,
      network: dto.network || 'MTN',
      country: dto.country || 'UG',
      currency: dto.currency || 'UGX',
      receivingNumber: dto.receivingNumber || '0770000000',
      receivingName: dto.receivingName || 'TitanStream Escrow',
      ussdTemplate: dto.ussdTemplate || '*165*1*1*{phone}*{amount}#',
      exchangeRateUsdt: dto.exchangeRateUsdt || 3700,
      minAmountUsdt: dto.minAmountUsdt || 1.0,
      maxAmountUsdt: dto.maxAmountUsdt || 5000.0,
      isActive: dto.isActive ?? true,
    };
    this.defaultConfigs.push(newCfg);
    return newCfg;
  }

  async createOrder(telegramUserId: bigint, dto: CreatePaymentOrderDto) {
    const orderId = `po_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const reference = `ORD-${Date.now().toString().slice(-6)}`;
    const currency = dto.currency || 'USDT';
    const network = dto.network || 'MTN';
    const country = dto.country || 'UG';

    const config = this.defaultConfigs.find((c) => c.network === network && c.country === country) || this.defaultConfigs[0];
    
    // Calculate local amount if currency is fiat or USDT
    let localAmount = dto.amount;
    let usdtAmount = dto.amount;

    if (currency === 'USDT') {
      localAmount = Math.round(dto.amount * config.exchangeRateUsdt);
    } else {
      usdtAmount = Number((dto.amount / config.exchangeRateUsdt).toFixed(2));
    }

    // Format USSD Code from template
    const ussdCode = config.ussdTemplate
      .replace('{phone}', config.receivingNumber)
      .replace('{amount}', Math.round(localAmount).toString());

    // Encode for tel: protocol (encode # as %23)
    const telUri = `tel:${ussdCode.replace('#', '%23')}`;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins expiry

    const order = {
      id: orderId,
      reference,
      telegramUserId: telegramUserId.toString(),
      type: dto.type,
      amount: usdtAmount,
      localAmount,
      currency,
      asset: 'USDT',
      paymentMethod: dto.paymentMethod || 'MOBILE_MONEY',
      network,
      country,
      status: 'AWAITING_PAYMENT' as PaymentOrderStatus,
      receivingNumber: config.receivingNumber,
      receivingName: config.receivingName,
      ussdCode,
      telUri,
      mobileNumber: dto.mobileNumber,
      metadata: dto.metadata || {},
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, order);

    await this.audit.create({
      telegramUserId,
      eventType: AuditEventType.TRANSACTION_CREATED,
      description: `Created ${dto.type} payment order ${reference}`,
      metadata: { orderId, reference, amount: usdtAmount, type: dto.type },
    });

    return order;
  }

  getOrder(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new NotFoundException('PAYMENT_ORDER_NOT_FOUND');
    return order;
  }

  getUserOrders(telegramUserId: string) {
    return Array.from(this.orders.values()).filter((o) => o.telegramUserId === telegramUserId);
  }

  getAllOrders() {
    return Array.from(this.orders.values());
  }

  async submitForVerification(orderId: string) {
    const order = this.getOrder(orderId);
    if (order.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException(`Cannot submit order in status ${order.status}`);
    }

    order.status = 'AWAITING_VERIFICATION';
    order.updatedAt = new Date().toISOString();
    this.orders.set(orderId, order);

    return order;
  }

  async approveOrder(orderId: string, adminUserId?: string) {
    const order = this.getOrder(orderId);
    if (order.status !== 'AWAITING_VERIFICATION' && order.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException(`Cannot approve order in status ${order.status}`);
    }

    order.status = 'POSTING_TO_LEDGER';
    order.updatedAt = new Date().toISOString();

    const telegramUserId = BigInt(order.telegramUserId);
    const orchestratorRef = `po_ledger_${order.reference}`;

    // Map operation type
    let opType: FinancialOperationType = FinancialOperationType.SYSTEM_ALLOCATION;
    if (order.type === 'WITHDRAWAL') opType = FinancialOperationType.WITHDRAWAL_SETTLE;
    else if (order.type === 'MACHINE_PURCHASE') opType = FinancialOperationType.SYSTEM_ALLOCATION;

    // Post to double-entry ledger via FinancialOrchestratorService
    await this.orchestrator.requestOperation({
      telegramUserId,
      operationType: opType,
      assetCode: 'USDT',
      amount: order.amount.toString(),
      idempotencyKey: orchestratorRef,
      reference: orchestratorRef,
      metadata: { orderId: order.id, reference: order.reference, type: order.type, approvedBy: adminUserId || 'system_admin' },
    });

    if (order.type === 'MACHINE_PURCHASE' && order.metadata?.targetTierCode) {
      const targetTierCode = order.metadata.targetTierCode as string;
      if (this.machineService) {
        await this.machineService.fulfillMachineOwnershipAfterPayment(telegramUserId, targetTierCode, order.amount);
      }
    }

    order.status = 'COMPLETED';
    order.completedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    this.orders.set(orderId, order);

    // Send User Notification
    await this.notification.createNotification({
      userId: telegramUserId,
      templateCode: 'PAYMENT_ORDER_APPROVED',
      message: `Your ${order.type.toLowerCase()} of $${order.amount.toFixed(2)} USDT (Ref: ${order.reference}) has been verified and processed to your wallet.`,
    });

    await this.audit.create({
      telegramUserId,
      eventType: AuditEventType.TRANSACTION_COMPLETED,
      description: `Payment order ${order.reference} approved and posted to ledger`,
      metadata: { orderId: order.id, reference: order.reference, adminUserId },
    });

    return order;
  }

  async rejectOrder(orderId: string, reason: string, adminUserId?: string) {
    const order = this.getOrder(orderId);
    order.status = 'REJECTED';
    order.rejectionReason = reason;
    order.updatedAt = new Date().toISOString();
    this.orders.set(orderId, order);

    const telegramUserId = BigInt(order.telegramUserId);
    await this.notification.createNotification({
      userId: telegramUserId,
      templateCode: 'PAYMENT_ORDER_REJECTED',
      message: `Your ${order.type.toLowerCase()} order ${order.reference} was rejected: ${reason}`,
    });

    return order;
  }
}
