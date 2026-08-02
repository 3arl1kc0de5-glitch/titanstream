import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { BalanceService } from '../financial/balance.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { PaymentOrderService } from '../payment-order/payment-order.service';
import { MiningService } from '../mining/mining.service';
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
  promoYieldRate?: number;
  promoOutputCap?: number;
  spinnerSpeedMultiplier?: number;
  promoSpinnerSpeedMultiplier?: number;
  // Economic calibration knobs — tuned per machine, read by the mining engine
  maxMultiplier?: number;
  multiplierDecayPerSec?: number;
  interactiveBaseRate?: number;
  interactiveBonusCap?: number;
  promoMultiplierInfluence?: number;
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
      name: 'Titan Core',
      priceUsdt: 0.0,
      capacityGhs: 1.0,
      powerRatingW: 10,
      description: 'Permanent baseline core with dual-phase promotional high-yield and standard modes.',
      technicalSummary: 'Permanently active entry-level hash rate generator.',
      simpleExplanation: 'Free baseline node that earns indefinitely.',
      dailyYieldEstimateUsdt: 2.0,
      computeRating: 'Core Queue Class 0',
      performanceTier: 'Baseline Tier',
      capacityScore: 10,
      recommendedFor: 'Starter core for everyone.',
      passiveYieldRate: 0.0000001929,
      promoYieldRate: 0.00000289,
      promoOutputCap: 5.0,
      spinnerSpeedMultiplier: 0.1,
      promoSpinnerSpeedMultiplier: 0.5,
      maxMultiplier: 20.2,
      multiplierDecayPerSec: 0.5,
      interactiveBaseRate: 0.01,
      interactiveBonusCap: 0.10,
      promoMultiplierInfluence: 1.06,
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
    private readonly balanceService: BalanceService,
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly paymentOrderService: PaymentOrderService,
    @Inject(forwardRef(() => MiningService))
    private readonly miningService?: MiningService,
  ) {}

  getCatalog(): MachineTier[] {
    return this.catalog;
  }

  async getUserMachines(telegramUserId: string): Promise<UserMachineAsset[]> {
    let bigIntUserId: bigint;
    try {
      bigIntUserId = BigInt(telegramUserId);
    } catch {
      bigIntUserId = BigInt(0);
    }

    const records = await this.prisma.userMachine.findMany({
      where: { telegramUserId: bigIntUserId },
      orderBy: { purchasedAt: 'desc' },
    });

    const now = new Date();
    const trialMachine: UserMachineAsset = {
      id: 'mach_free_trial',
      telegramUserId,
      tierCode: 'TS_TRIAL',
      name: 'Titan Core',
      purchasePrice: 0.0,
      currency: 'USDT',
      status: 'ACTIVE',
      capacityGhs: 1.0,
      lifetimeEarnings: 0.0,
      purchasedAt: now.toISOString(),
      activatedAt: now.toISOString(),
    };

    const userAssets: UserMachineAsset[] = records.map((r) => ({
      id: r.id,
      telegramUserId: r.telegramUserId.toString(),
      tierCode: r.tierCode,
      name: r.name,
      purchasePrice: r.purchasePrice.toNumber(),
      currency: r.currency,
      status: r.status as any,
      capacityGhs: r.capacityGhs.toNumber(),
      lifetimeEarnings: r.lifetimeEarnings.toNumber(),
      purchasedAt: r.purchasedAt.toISOString(),
      activatedAt: r.activatedAt.toISOString(),
    }));

    return [trialMachine, ...userAssets];
  }

  async fulfillMachineOwnershipAfterPayment(telegramUserId: bigint, tierCode: string, pricePaid: number) {
    const tier = this.catalog.find((t) => t.tierCode === tierCode);
    const machineName = tier ? tier.name : tierCode;
    const capacityGhs = tier ? tier.capacityGhs : 5.0;

    const createdMachine = await this.prisma.userMachine.create({
      data: {
        telegramUserId,
        tierCode,
        name: machineName,
        purchasePrice: pricePaid,
        currency: 'USDT',
        status: 'ACTIVE',
        capacityGhs,
      },
    });

    if (this.miningService) {
      await this.miningService.recalculateUserMiningState(telegramUserId.toString());
    }

    await this.notification.createNotification({
      userId: telegramUserId,
      templateCode: 'MACHINE_ACTIVATED',
      variables: { machineName: `${machineName} (${capacityGhs} GH/s)` },
    });

    await this.audit.create({
      telegramUserId,
      eventType: AuditEventType.TRANSACTION_COMPLETED,
      description: `Fulfilled machine ownership for ${machineName} ($${pricePaid} USDT)`,
      metadata: { machineId: createdMachine.id, tierCode, price: pricePaid },
    });

    return createdMachine;
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

    const createdMachine = await this.prisma.userMachine.create({
      data: {
        telegramUserId,
        tierCode: tier.tierCode,
        name: tier.name,
        purchasePrice: tier.priceUsdt,
        currency: 'USDT',
        status: 'ACTIVE',
        capacityGhs: tier.capacityGhs,
      },
    });

    const newMachineAsset: UserMachineAsset = {
      id: createdMachine.id,
      telegramUserId: userIdStr,
      tierCode: createdMachine.tierCode,
      name: createdMachine.name,
      purchasePrice: createdMachine.purchasePrice.toNumber(),
      currency: createdMachine.currency,
      status: createdMachine.status as any,
      capacityGhs: createdMachine.capacityGhs.toNumber(),
      lifetimeEarnings: createdMachine.lifetimeEarnings.toNumber(),
      purchasedAt: createdMachine.purchasedAt.toISOString(),
      activatedAt: createdMachine.activatedAt.toISOString(),
    };

    if (this.miningService) {
      await this.miningService.recalculateUserMiningState(userIdStr);
    }

    await this.notification.createNotification({
      userId: telegramUserId,
      templateCode: 'MACHINE_ACTIVATED',
      variables: { machineName: `${tier.name} (${tier.capacityGhs} GH/s)` },
    });

    await this.audit.create({
      telegramUserId,
      eventType: AuditEventType.TRANSACTION_COMPLETED,
      description: `Purchased machine ${tier.name} for $${tier.priceUsdt} USDT`,
      metadata: { machineId: createdMachine.id, tierCode: tier.tierCode, price: tier.priceUsdt },
    });

    return {
      success: true,
      requiresFunding: false,
      machine: newMachineAsset,
      message: `Machine ${tier.name} purchased and activated successfully!`,
    };
  }
}

