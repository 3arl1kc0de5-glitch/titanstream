import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { GrowthEventService } from './growth-event.service';
import { RewardStatus, RewardType, GrowthEventType, Prisma } from '@prisma/client';

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly growthEventService: GrowthEventService,
  ) {}

  /**
   * Seed default reward rules if none exist.
   */
  async ensureDefaultRules() {
    const defaultRules = [
      {
        code: 'REFERRAL_DEFAULT_5USDT',
        name: 'Standard Referral Reward',
        rewardType: RewardType.REFERRAL,
        amount: '5.000000',
        assetCode: 'USDT',
        parameters: { description: 'Earn 5 USDT per qualified referral' },
      },
      {
        code: 'MILESTONE_FIRST_SETTLEMENT',
        name: 'First Settlement Bonus',
        rewardType: RewardType.MILESTONE,
        amount: '2.000000',
        assetCode: 'USDT',
        parameters: { description: 'Earn 2 USDT upon completing your first settlement' },
      },
    ];

    for (const rule of defaultRules) {
      await this.prisma.rewardRule.upsert({
        where: { code: rule.code },
        update: {},
        create: rule,
      });
    }
  }

  /**
   * Create a PENDING reward record.
   */
  async createReward(data: {
    telegramUserId: bigint;
    rewardType: RewardType;
    amount: string;
    ruleCode?: string;
    reference: string;
    metadata?: Record<string, unknown>;
  }) {
    // Check idempotency via unique reference
    const existing = await this.prisma.reward.findUnique({
      where: { reference: data.reference },
    });

    if (existing) {
      return existing;
    }

    let ruleId: string | undefined;
    if (data.ruleCode) {
      const rule = await this.prisma.rewardRule.findUnique({
        where: { code: data.ruleCode },
      });
      if (rule) ruleId = rule.id;
    }

    const reward = await this.prisma.reward.create({
      data: {
        telegramUserId: data.telegramUserId,
        ruleId,
        rewardType: data.rewardType,
        amount: data.amount,
        assetCode: 'USDT',
        status: RewardStatus.PENDING,
        reference: data.reference,
        metadata: (data.metadata as Prisma.InputJsonValue) || {},
      },
    });

    this.logger.log(`[RewardService] Created PENDING reward ${reward.id} (${data.amount} USDT) for user ${data.telegramUserId}`);
    return reward;
  }

  /**
   * Process and disburse an APPROVED reward through Financial Orchestrator.
   * STRICT CONSTRAINT: Never update balances directly. Must go through FinancialOrchestrator.
   */
  async approveAndDisburseReward(rewardId: string) {
    const reward = await this.prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new NotFoundException(`Reward ${rewardId} not found`);
    }

    if (reward.status === RewardStatus.PROCESSED) {
      return reward;
    }

    if (reward.status === RewardStatus.CANCELLED) {
      throw new BadRequestException(`Cannot process cancelled reward ${rewardId}`);
    }

    // Step 1: Update status to APPROVED
    await this.prisma.reward.update({
      where: { id: rewardId },
      data: { status: RewardStatus.APPROVED },
    });

    try {
      // Step 2: Dispatch operation to Financial Orchestrator
      // OperationType.SYSTEM_ALLOCATION or INTERNAL_ADJUSTMENT
      const operationResult = await this.orchestrator.requestOperation({
        telegramUserId: reward.telegramUserId,
        operationType: 'SYSTEM_ALLOCATION',
        assetCode: reward.assetCode,
        amount: reward.amount.toString(),
        idempotencyKey: `reward_${reward.id}`,
        reference: `ref_reward_${reward.id}`,
        metadata: {
          rewardId: reward.id,
          rewardType: reward.rewardType,
          originalReference: reward.reference,
        },
      });

      // Step 3: Mark reward PROCESSED with operationId
      const processedReward = await this.prisma.reward.update({
        where: { id: rewardId },
        data: {
          status: RewardStatus.PROCESSED,
          operationId: (operationResult as any)?.id || null,
          processedAt: new Date(),
        },
      });

      // Step 4: Publish REWARD_GRANTED event
      await this.growthEventService.publish({
        telegramUserId: reward.telegramUserId,
        eventType: GrowthEventType.REWARD_GRANTED,
        payload: {
          rewardId: reward.id,
          amount: reward.amount.toString(),
          assetCode: reward.assetCode,
          rewardType: reward.rewardType,
          operationId: (operationResult as any)?.id,
        },
      });

      this.logger.log(`[RewardService] Reward ${reward.id} PROCESSED & disbursed via Orchestrator`);
      return processedReward;
    } catch (err: any) {
      this.logger.error(`[RewardService] Failed to disburse reward ${rewardId}: ${err.message}`, err.stack);
      // Revert status to PENDING on failure
      await this.prisma.reward.update({
        where: { id: rewardId },
        data: { status: RewardStatus.PENDING },
      });
      throw err;
    }
  }

  /**
   * Get user rewards list.
   */
  async getUserRewards(telegramUserId: bigint) {
    return this.prisma.reward.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all rewards (for Admin management).
   */
  async getAllRewards(status?: RewardStatus) {
    return this.prisma.reward.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            telegramUserId: true,
            firstName: true,
            telegramUsername: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
