import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard as AuthGuard } from '../../common/guards/jwt-auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { ReferralService } from './referral.service';
import { ReferralGraphService } from './referral-graph.service';
import { ReferralQualificationService } from './referral-qualification.service';
import { DiscountEligibilityService } from './discount-eligibility.service';
import { RewardService } from './reward.service';
import { TrustProfileService } from './trust-profile.service';
import { UserLevelService } from './user-level.service';
import { GrowthNotificationService } from './growth-notification.service';
import { PrismaService } from '../../database/prisma.service';

@Controller('growth')
@UseGuards(AuthGuard)
export class GrowthController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly referralGraphService: ReferralGraphService,
    private readonly qualificationService: ReferralQualificationService,
    private readonly discountService: DiscountEligibilityService,
    private readonly rewardService: RewardService,
    private readonly trustProfileService: TrustProfileService,
    private readonly userLevelService: UserLevelService,
    private readonly notificationService: GrowthNotificationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /growth/profile
   * Comprehensive user trust profile, level status, benefits unlocked, and growth stats.
   */
  @Get('profile')
  async getGrowthProfile(@TelegramUserId() telegramUserId: bigint) {
    const levelSummary = await this.userLevelService.getUserLevelSummary(telegramUserId);
    const referralSummary = await this.referralService.getUserReferralSummary(telegramUserId);
    const rewards = await this.rewardService.getUserRewards(telegramUserId);

    // Calculate total settlement volume
    const completedSettlements = await this.prisma.settlementSession.findMany({
      where: { telegramUserId, status: 'COMPLETED' },
      select: { expectedCryptoAmount: true },
    });

    const totalVolumeUSDT = completedSettlements.reduce(
      (sum, item) => sum + Number(item.expectedCryptoAmount),
      0,
    );

    return {
      telegramUserId: telegramUserId.toString(),
      trustScore: levelSummary.trustProfile.trustScore,
      level: levelSummary.currentLevel,
      levelName: levelSummary.levelName,
      benefits: levelSummary.benefits,
      nextLevel: levelSummary.nextLevel,
      completedSettlements: levelSummary.trustProfile.completedSettlements,
      accountAgeDays: levelSummary.trustProfile.accountAgeDays,
      totalVolumeUSDT,
      referrals: {
        code: referralSummary.referralCode,
        link: referralSummary.referralLink,
        totalInvited: referralSummary.totalInvited,
        qualifiedCount: referralSummary.qualifiedCount,
        totalEarnedUSDT: referralSummary.totalEarnedUSDT,
      },
      rewardsCount: rewards.length,
    };
  }

  /**
   * GET /growth/referrals
   * User referral dashboard data.
   */
  @Get('referrals')
  async getReferralDashboard(@TelegramUserId() telegramUserId: bigint) {
    return this.referralService.getUserReferralSummary(telegramUserId);
  }

  /**
   * POST /growth/referral/link
   * Get or initialize referral code.
   */
  @Post('referral/link')
  async getReferralLink(@TelegramUserId() telegramUserId: bigint) {
    return this.referralService.getOrCreateReferralCode(telegramUserId);
  }

  /**
   * GET /growth/rewards
   * User rewards list.
   */
  @Get('rewards')
  async getUserRewards(@TelegramUserId() telegramUserId: bigint) {
    const rewards = await this.rewardService.getUserRewards(telegramUserId);
    return rewards.map((r) => ({
      ...r,
      telegramUserId: r.telegramUserId.toString(),
      amount: r.amount.toString(),
    }));
  }

  /**
   * GET /growth/qualification
   * Full qualification status for withdrawal and discount access.
   */
  @Get('qualification')
  async getQualificationStatus(@TelegramUserId() telegramUserId: bigint) {
    return this.qualificationService.getFullQualificationStatus(telegramUserId);
  }

  /**
   * GET /growth/qualification/withdrawal
   * Withdrawal eligibility check.
   */
  @Get('qualification/withdrawal')
  async getWithdrawalEligibility(@TelegramUserId() telegramUserId: bigint) {
    return this.qualificationService.checkWithdrawalEligibility(telegramUserId);
  }

  /**
   * GET /growth/qualification/discount
   * Discount eligibility check.
   */
  @Get('qualification/discount')
  async getDiscountEligibility(@TelegramUserId() telegramUserId: bigint) {
    return this.discountService.getUserDiscountStatus(telegramUserId);
  }

  /**
   * GET /growth/graph/tree
   * Referral tree for the current user.
   */
  @Get('graph/tree')
  async getReferralTree(@TelegramUserId() telegramUserId: bigint) {
    return this.referralGraphService.getReferralTree(telegramUserId);
  }

  /**
   * GET /growth/graph/chain
   * Referral chain (upline) for the current user.
   */
  @Get('graph/chain')
  async getReferralChain(@TelegramUserId() telegramUserId: bigint) {
    return this.referralGraphService.getReferralChain(telegramUserId);
  }

  /**
   * GET /growth/graph/downstream
   * Downstream referral counts.
   */
  @Get('graph/downstream')
  async getDownstreamCount(@TelegramUserId() telegramUserId: bigint) {
    return this.referralGraphService.getDownstreamCount(telegramUserId);
  }

  /**
   * GET /growth/levels
   * Progression levels details.
   */
  @Get('levels')
  async getUserLevels(@TelegramUserId() telegramUserId: bigint) {
    return this.userLevelService.getUserLevelSummary(telegramUserId);
  }

  /**
   * GET /growth/notifications
   * Notification history.
   */
  @Get('notifications')
  async getNotifications(
    @TelegramUserId() telegramUserId: bigint,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const records = await this.notificationService.getUserNotifications(telegramUserId, parsedLimit);
    const preferences = await this.notificationService.getPreferences(telegramUserId);

    return {
      preferences,
      notifications: records.map((n) => ({
        ...n,
        telegramUserId: n.telegramUserId.toString(),
      })),
    };
  }

  /**
   * POST /growth/notifications/preferences
   * Update notification preferences.
   */
  @Post('notifications/preferences')
  async updateNotificationPreferences(
    @TelegramUserId() telegramUserId: bigint,
    @Body() body: { telegramEnabled?: boolean; inAppEnabled?: boolean; marketingEnabled?: boolean },
  ) {
    return this.notificationService.updatePreferences(telegramUserId, body);
  }
}
