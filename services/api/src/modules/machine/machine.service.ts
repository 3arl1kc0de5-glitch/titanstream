import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { BalanceService } from '../financial/balance.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { PaymentOrderService } from '../payment-order/payment-order.service';
import { FinancialOperationType } from '@prisma/client';
import { AuditEventType } from '../../common/interfaces/user-state.enum';
import type { NotificationPayload } from '../notification/notification.service';

export interface MachineTier {
  tierCode: string;
  name: string;
  priceUsdt: number;
  capacityGhs: number;
  powerRatingW: number;
  description: string;
  technicalSummary: string;
  simpleExplanation: string;
  dailyYieldEstimateUsdt: number;
  computeRating: string;
  performanceTier: string;
  capacityScore: number;
  recommendedFor: string;
  isPopular?: boolean;
  
  earningsCap?: number;
  durationHours?: number;
  passiveYieldRate?: number;
}

export interface UserMachineAsset {
  id: string;
  telegramUserId: string;
  tierCode: string;
  name: string;
  purchasePrice: number;
  currency: string;
  status: 'CREATED' | 'PENDING_PAYMENT' | 'ACTIVE' | 'PAUSED' | 'MAINTENANCE' | 'RETIRED';
  capacityGhs: number;
  lifetimeEarnings: number;
  purchasedAt: string;
  activatedAt: string;
}

@Injectable()
export class MachineService {
  private readonly catalog: MachineTier[] = [
    {
      tierCode: 'TS_TRIAL',
      name: 'Free Trial Core',
      priceUsdt: 0.0,
      capacityGhs: 1.0,
      powerRatingW: 10,
      description: 'Temporary trial core with limited capability.',
      technicalSummary: 'Limited duration testing core.',
      simpleExplanation: 'Free entry-level node to test the streaming environment.',
      dailyYieldEstimateUsdt: 2.0,
      computeRating: 'Trial Queue Class 0',
      performanceTier: 'Trial Tier',
      capacityScore: 10,
      recommendedFor: 'Try out the stream platform.',
      earningsCap: 5.0,
      durationHours: 48,
      passiveYieldRate: 0.00000289,
    },
    {
      tierCode: 'TS_C10',
      name: 'Ripple X14',
      priceUsdt: 10.99,
      capacityGhs: 5.0,
      powerRatingW: 50,
      description: 'Entry-level compute node suitable for foundational cloud processing.',
      technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
      simpleExplanation: 'Entry-level processing node designed for consistent daily earnings.',
      dailyYieldEstimateUsdt: 0.27,
      computeRating: 'Starter Queue Class 1',
      performanceTier: 'Starter Tier',
      capacityScore: 35,
      recommendedFor: 'Perfect for getting started.',
      passiveYieldRate: 0.0001,
    },
    {
      tierCode: 'TS_A50',
      name: 'Surge R28',
      priceUsdt: 50.0,
      capacityGhs: 25.0,
      powerRatingW: 250,
      description: 'Advanced processing node built for active cloud workload scaling.',
      technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
      simpleExplanation: 'Expanded compute capacity delivering a noticeable daily earnings boost.',
      dailyYieldEstimateUsdt: 1.40,
      computeRating: 'Accelerated Queue Class 2',
      performanceTier: 'Growth Tier',
      capacityScore: 60,
      recommendedFor: 'Designed for growing daily earnings.',
      passiveYieldRate: 0.0001,
    },
    {
      tierCode: 'TS_P250',
      name: 'Torrent V63',
      priceUsdt: 250.0,
      capacityGhs: 130.0,
      powerRatingW: 1200,
      description: 'High-performance multi-core cluster engineered for high daily data throughput.',
      technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
      simpleExplanation: 'High-performance computing cluster built for active cloud accumulators.',
      dailyYieldEstimateUsdt: 7.50,
      computeRating: 'Enterprise Queue Class 3',
      performanceTier: 'High-Performance',
      capacityScore: 82,
      recommendedFor: 'Built for users scaling cloud capacity.',
      isPopular: true,
      passiveYieldRate: 0.0001,
    },
    {
      tierCode: 'TS_X1000',
      name: 'Cascade M91',
      priceUsdt: 1000.0,
      capacityGhs: 550.0,
      powerRatingW: 4500,
      description: 'Professional enterprise supercomputing array delivering massive daily throughput.',
      technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
      simpleExplanation: 'Professional hardware array for demanding AI & parallel cloud data workflows.',
      dailyYieldEstimateUsdt: 32.00,
      computeRating: 'Priority Allocation Class 4',
      performanceTier: 'Professional Tier',
      capacityScore: 94,
      recommendedFor: 'Built for users seeking high-volume cloud allocation.',
      passiveYieldRate: 0.0001,
    },
    {
      tierCode: 'TS_Q2500',
      name: 'StreamTitan 2028',
      priceUsdt: 2500.0,
      capacityGhs: 1500.0,
      powerRatingW: 12000,
      description: 'Flagship enterprise quantum supercomputer cluster for maximum capacity allocation.',
      technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
      simpleExplanation: 'Ultimate enterprise computing tier producing industry-leading daily yields.',
      dailyYieldEstimateUsdt: 85.00,
      computeRating: 'Quantum Supercluster Class 5',
      performanceTier: 'Flagship Enterprise',
      capacityScore: 99,
      recommendedFor: 'Enterprise performance for maximum compute allocation.',
      passiveYieldRate: 0.0001,
    },
  ];

  // In-memory user machines store
  private readonly userMachines = new Map<string, UserMachineAsset[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
    private readonly balanceService: BalanceService,
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly paymentOrderService: PaymentOrderService,
  ) {}

  getCatalog(): MachineTier[] {
    return this.catalog;
  }

  getUserMachines(telegramUserId: string): UserMachineAsset[] {
    let list = this.userMachines.get(telegramUserId);
    if (!list) {
      const now = new Date();
      const trialMachine: UserMachineAsset = {
        id: 'mach_free_trial',
        telegramUserId,
        tierCode: 'TS_TRIAL',
        name: 'Free Trial Core',
        purchasePrice: 0.0,
        currency: 'USDT',
        status: 'ACTIVE',
        capacityGhs: 1.0,
        lifetimeEarnings: 0.0,
        purchasedAt: now.toISOString(),
        activatedAt: now.toISOString(),
      };
      list = [trialMachine];
      this.userMachines.set(telegramUserId, list);
    } else {
      list = list.map((m) => {
        if (m.tierCode === 'TS_TRIAL' && m.status === 'ACTIVE') {
          const elapsed = Date.now() - new Date(m.activatedAt).getTime();
          if (elapsed >= 48 * 60 * 60 * 1000) {
            return { ...m, status: 'RETIRED' };
          }
        }
        return m;
      });
      this.userMachines.set(telegramUserId, list);
    }
    return list;
  }

  async purchaseMachine(telegramUserId: bigint, tierCode: string) {
    const tier = this.catalog.find((t) => t.tierCode === tierCode);
    if (!tier) throw new NotFoundException(`Machine tier ${tierCode} not found`);

    const userIdStr = telegramUserId.toString();

    // Check user available balance
    const account = await this.prisma.financialAccount.findUnique({
      where: { telegramUserId },
    });
    if (!account) throw new NotFoundException('Financial account not found');
    const { balances } = await this.balanceService.getBalances(telegramUserId, account.id);
    const usdtBalance = balances.find((b) => b.assetCode === 'USDT');
    const availableUsdt = parseFloat(usdtBalance?.availableBalance || '0');

    if (availableUsdt < tier.priceUsdt) {
      // Create a deposit payment order for missing amount so user can pay & auto-resume
      const missingUsdt = tier.priceUsdt - availableUsdt;
      const order = await this.paymentOrderService.createOrder(telegramUserId, {
        type: 'MACHINE_PURCHASE',
        amount: tier.priceUsdt,
        currency: 'USDT',
        paymentMethod: 'MOBILE_MONEY',
        metadata: { targetTierCode: tierCode, missingAmount: missingUsdt },
      });

      return {
        success: false,
        requiresFunding: true,
        missingAmountUsdt: missingUsdt,
        paymentOrder: order,
        message: `Insufficient balance. Deposit order ${order.reference} initiated.`,
      };
    }

    // Balance is sufficient: execute financial deduction via orchestrator
    const reference = `mach_buy_${tierCode}_${Date.now()}`;
    await this.orchestrator.requestOperation({
      telegramUserId,
      operationType: FinancialOperationType.WITHDRAWAL_RESERVE,
      assetCode: 'USDT',
      amount: tier.priceUsdt.toString(),
      idempotencyKey: reference,
      reference,
      metadata: { source: 'machine_purchase', tierCode, price: tier.priceUsdt },
    });

    const newMachine: UserMachineAsset = {
      id: `mach_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      telegramUserId: userIdStr,
      tierCode: tier.tierCode,
      name: tier.name,
      purchasePrice: tier.priceUsdt,
      currency: 'USDT',
      status: 'ACTIVE',
      capacityGhs: tier.capacityGhs,
      lifetimeEarnings: 0.0,
      purchasedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
    };

    const existing = this.userMachines.get(userIdStr) || [];
    this.userMachines.set(userIdStr, [newMachine, ...existing]);

    await this.notification.createNotification({
      userId: telegramUserId,
      templateCode: 'MACHINE_ACTIVATED',
      variables: { machineName: `${tier.name} (${tier.capacityGhs} GH/s)` },
    });

    await this.audit.create({
      telegramUserId,
      eventType: AuditEventType.TRANSACTION_COMPLETED,
      description: `Purchased machine ${tier.name} for $${tier.priceUsdt} USDT`,
      metadata: { machineId: newMachine.id, tierCode: tier.tierCode, price: tier.priceUsdt },
    });

    return {
      success: true,
      requiresFunding: false,
      machine: newMachine,
      message: `Machine ${tier.name} purchased and activated successfully!`,
    };
  }
}
