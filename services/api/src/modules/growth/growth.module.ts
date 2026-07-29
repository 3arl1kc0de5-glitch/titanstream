import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { AdminModule } from '../admin/admin.module';
import { GrowthEventService } from './growth-event.service';
import { ReferralService } from './referral.service';
import { ReferralGraphService } from './referral-graph.service';
import { ReferralQualificationService } from './referral-qualification.service';
import { DiscountEligibilityService } from './discount-eligibility.service';
import { RewardService } from './reward.service';
import { TrustProfileService } from './trust-profile.service';
import { UserLevelService } from './user-level.service';
import { GrowthNotificationService } from './growth-notification.service';
import { GrowthAnalyticsService } from './growth-analytics.service';
import { GrowthController } from './growth.controller';
import { GrowthAdminController } from './growth-admin.controller';
import { GrowthAnalyticsController } from './growth-analytics.controller';
import { GrowthEventType } from '@prisma/client';

@Module({
  imports: [PrismaModule, FinancialOrchestrationModule, forwardRef(() => AdminModule)],
  controllers: [GrowthController, GrowthAdminController, GrowthAnalyticsController],
  providers: [
    GrowthEventService,
    ReferralService,
    ReferralGraphService,
    ReferralQualificationService,
    DiscountEligibilityService,
    RewardService,
    TrustProfileService,
    UserLevelService,
    GrowthNotificationService,
    GrowthAnalyticsService,
  ],
  exports: [
    GrowthEventService,
    ReferralService,
    ReferralGraphService,
    ReferralQualificationService,
    DiscountEligibilityService,
    RewardService,
    TrustProfileService,
    UserLevelService,
    GrowthNotificationService,
    GrowthAnalyticsService,
  ],
})
export class GrowthModule implements OnModuleInit {
  constructor(
    private readonly growthEventService: GrowthEventService,
    private readonly referralService: ReferralService,
    private readonly qualificationService: ReferralQualificationService,
    private readonly rewardService: RewardService,
    private readonly trustProfileService: TrustProfileService,
    private readonly userLevelService: UserLevelService,
    private readonly notificationService: GrowthNotificationService,
  ) {}

  async onModuleInit() {
    await this.rewardService.ensureDefaultRules();
    await this.userLevelService.ensureDefaultLevelConfigs();
    await this.notificationService.ensureDefaultTemplates();

    this.registerEventListeners();
  }

  private registerEventListeners() {
    // 1. When a user completes a settlement
    this.growthEventService.on(GrowthEventType.SETTLEMENT_COMPLETED, async (event) => {
      const { telegramUserId, amount, provider } = event.payload || {};
      if (!telegramUserId) return;

      const userId = BigInt(telegramUserId);

      await this.trustProfileService.recalculateTrustScore(userId);
      await this.userLevelService.evaluateUserLevel(userId);
      await this.referralService.evaluateQualification(userId);
      await this.qualificationService.recountQualifiedReferrals(userId);

      await this.notificationService.sendNotification({
        telegramUserId: userId,
        templateCode: 'SETTLEMENT_COMPLETED',
        variables: {
          amount: String(amount || '0'),
          asset: 'USDT',
          provider: String(provider || 'Settlement Rail'),
        },
      });
    });

    // 2. When a referral is qualified
    this.growthEventService.on(GrowthEventType.REFERRAL_COMPLETED, async (event) => {
      const { refereeId, relationshipId, paying } = event.payload || {};
      if (!event.telegramUserId || !refereeId) return;

      const referrerId = event.telegramUserId;

      const reward = await this.rewardService.createReward({
        telegramUserId: referrerId,
        rewardType: 'REFERRAL',
        amount: '5.000000',
        ruleCode: 'REFERRAL_DEFAULT_5USDT',
        reference: `ref_qual_${relationshipId}`,
        metadata: { refereeId, relationshipId, paying: !!paying },
      });

      try {
        await this.rewardService.approveAndDisburseReward(reward.id);
        await this.referralService.markRewarded(relationshipId, reward.id);

        await this.qualificationService.recountQualifiedReferrals(referrerId);

        await this.notificationService.sendNotification({
          telegramUserId: referrerId,
          templateCode: 'REFERRAL_COMPLETED',
          variables: {
            refereeName: 'Your Friend',
          },
        });
      } catch (err: any) {
        // Pending reward remains for admin review if auto-disburse fails
      }
    });

    // 3. When a payment is confirmed (referee becomes PAYING)
    this.growthEventService.on(GrowthEventType.PAYMENT_CONFIRMED, async (event) => {
      const { telegramUserId } = event.payload || {};
      if (!telegramUserId) return;

      const userId = BigInt(telegramUserId);
      await this.referralService.markRefereePaying(userId);
      await this.qualificationService.recountQualifiedReferrals(userId);
    });

    // 4. When a withdrawal is requested — log qualification check
    this.growthEventService.on(GrowthEventType.WITHDRAWAL_REQUESTED, async (event) => {
      const { telegramUserId } = event.payload || {};
      if (!telegramUserId) return;

      const userId = BigInt(telegramUserId);
      const eligibility = await this.qualificationService.checkWithdrawalEligibility(userId);
      await this.notificationService.sendNotification({
        telegramUserId: userId,
        templateCode: eligibility.canWithdraw ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_BLOCKED',
        variables: {
          reason: eligibility.reason || '',
          qualifiedCount: String(eligibility.qualifiedCount),
          requirement: String(eligibility.requirement),
        },
      });
    });

    // 5. When a user's level is upgraded
    this.growthEventService.on(GrowthEventType.LEVEL_UPGRADED, async (event) => {
      const { newLevel } = event.payload || {};
      if (!event.telegramUserId) return;

      await this.notificationService.sendNotification({
        telegramUserId: event.telegramUserId,
        templateCode: 'LEVEL_UPGRADED',
        variables: {
          newLevel: String(newLevel),
          newLevelName: String(newLevel),
        },
      });
    });
  }
}
