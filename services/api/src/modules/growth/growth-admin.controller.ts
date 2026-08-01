import { Controller, Get, Post, Param, Body, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard as AuthGuard } from '../../common/guards/jwt-auth.guard';
import { RewardService } from './reward.service';
import { UserLevelService } from './user-level.service';
import { GrowthNotificationService } from './growth-notification.service';
import { ReferralGraphService } from './referral-graph.service';
import { FraudDetectionService } from '../fraud/fraud-detection.service';
import { PrismaService } from '../../database/prisma.service';
import { RewardStatus, RewardType, ReferralStatus, UserLevelTier, NotificationChannel } from '@prisma/client';

@Controller('admin')
@UseGuards(AuthGuard)
export class GrowthAdminController {
  constructor(
    private readonly rewardService: RewardService,
    private readonly userLevelService: UserLevelService,
    private readonly notificationService: GrowthNotificationService,
    private readonly referralGraphService: ReferralGraphService,
    @Inject(forwardRef(() => FraudDetectionService))
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /admin/rewards
   * Admin view of all rewards.
   */
  @Get('rewards')
  async getAllRewards(@Query('status') status?: RewardStatus) {
    const rewards = await this.rewardService.getAllRewards(status);
    return rewards.map((r) => ({
      ...r,
      telegramUserId: r.telegramUserId.toString(),
      amount: r.amount.toString(),
    }));
  }

  /**
   * POST /admin/rewards/:id/approve
   * Admin trigger to approve & disburse pending reward via Financial Orchestrator.
   */
  @Post('rewards/:id/approve')
  async approveReward(@Param('id') id: string) {
    const result = await this.rewardService.approveAndDisburseReward(id);
    return {
      ...result,
      telegramUserId: result.telegramUserId.toString(),
      amount: result.amount.toString(),
    };
  }

  /**
   * GET /admin/referrals/relationships
   * Detailed listing of all referral relationships for auditing.
   */
  @Get('referrals/relationships')
  async getReferralRelationships(
    @Query('status') status?: ReferralStatus,
    @Query('referrerId') referrerId?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (referrerId) where.referrerId = BigInt(referrerId);

    const list = await this.prisma.referralRelationship.findMany({
      where,
      include: {
        referrer: { select: { telegramUserId: true, firstName: true, telegramUsername: true } },
        referee: { select: { telegramUserId: true, firstName: true, telegramUsername: true } },
        rewards: { include: { reward: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return list.map((r) => ({
      id: r.id,
      referrerId: r.referrerId.toString(),
      referrerName: r.referrer.firstName,
      referrerUsername: r.referrer.telegramUsername,
      refereeId: r.refereeId.toString(),
      refereeName: r.referee.firstName,
      refereeUsername: r.referee.telegramUsername,
      status: r.status,
      createdAt: r.createdAt,
      qualifiedAt: r.qualifiedAt,
      rewardedAt: r.rewardedAt,
      rewards: r.rewards.map((rw) => ({
        id: rw.reward.id,
        amount: rw.reward.amount.toString(),
        status: rw.reward.status,
        reference: rw.reward.reference,
      })),
    }));
  }

  /**
   * GET /admin/referrals/graph/:userId
   * Inspect referral graph tree & chain for a specific user.
   */
  @Get('referrals/graph/:userId')
  async getReferralGraphForUser(@Param('userId') userId: string) {
    const targetId = BigInt(userId);
    const tree = await this.referralGraphService.getReferralTree(targetId);
    const chain = await this.referralGraphService.getReferralChain(targetId);
    const downstream = await this.referralGraphService.getDownstreamCount(targetId);

    return {
      telegramUserId: userId,
      tree,
      chain,
      downstream,
    };
  }

  /**
   * GET /admin/referrals/fraud-check
   * Run fraud analysis across IP clusters and referral graph cycles.
   */
  @Get('referrals/fraud-check')
  async runFraudCheck() {
    const ipClusters = await this.fraudDetectionService.analyzeIpClusters();
    const graphCycles = await this.fraudDetectionService.checkReferralGraph();

    return {
      timestamp: new Date().toISOString(),
      ipClusters,
      graphCycles,
    };
  }

  /**
   * POST /admin/rewards/rules
   * Create or update a reward rule.
   */
  @Post('rewards/rules')
  async upsertRewardRule(
    @Body()
    body: {
      code: string;
      name: string;
      rewardType: RewardType;
      amount: string;
      assetCode?: string;
      enabled?: boolean;
      parameters?: Record<string, any>;
    },
  ) {
    return this.prisma.rewardRule.upsert({
      where: { code: body.code },
      update: {
        name: body.name,
        rewardType: body.rewardType,
        amount: body.amount,
        assetCode: body.assetCode || 'USDT',
        enabled: body.enabled !== undefined ? body.enabled : true,
        parameters: body.parameters || {},
      },
      create: {
        code: body.code,
        name: body.name,
        rewardType: body.rewardType,
        amount: body.amount,
        assetCode: body.assetCode || 'USDT',
        enabled: body.enabled !== undefined ? body.enabled : true,
        parameters: body.parameters || {},
      },
    });
  }

  /**
   * POST /admin/levels/configure
   * Configure user level progression criteria and benefits.
   */
  @Post('levels/configure')
  async configureLevel(
    @Body()
    body: {
      level: UserLevelTier;
      name: string;
      minAccountAgeDays: number;
      minSuccessfulSettlements: number;
      minTrustScore: number;
      benefits: string[];
      orderIndex: number;
    },
  ) {
    return this.prisma.userLevelConfig.upsert({
      where: { level: body.level },
      update: {
        name: body.name,
        minAccountAgeDays: body.minAccountAgeDays,
        minSuccessfulSettlements: body.minSuccessfulSettlements,
        minTrustScore: body.minTrustScore,
        benefits: body.benefits,
        orderIndex: body.orderIndex,
      },
      create: body,
    });
  }

  /**
   * POST /admin/notifications/templates
   * Create or update notification templates.
   */
  @Post('notifications/templates')
  async upsertNotificationTemplate(
    @Body()
    body: {
      code: string;
      name: string;
      titleTemplate: string;
      bodyTemplate: string;
      channel?: NotificationChannel;
      enabled?: boolean;
    },
  ) {
    return this.prisma.notificationTemplate.upsert({
      where: { code: body.code },
      update: {
        name: body.name,
        titleTemplate: body.titleTemplate,
        bodyTemplate: body.bodyTemplate,
        channel: body.channel || NotificationChannel.TELEGRAM,
        enabled: body.enabled !== undefined ? body.enabled : true,
      },
      create: {
        code: body.code,
        name: body.name,
        titleTemplate: body.titleTemplate,
        bodyTemplate: body.bodyTemplate,
        channel: body.channel || NotificationChannel.TELEGRAM,
        enabled: body.enabled !== undefined ? body.enabled : true,
      },
    });
  }
}
