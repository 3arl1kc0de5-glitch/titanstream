import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GrowthEventService } from './growth-event.service';
import { ReferralStatus, GrowthEventType, Prisma } from '@prisma/client';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'titanstream_bot';

  constructor(
    private readonly prisma: PrismaService,
    private readonly growthEventService: GrowthEventService,
  ) {}

  async markRefereePaying(refereeId: bigint): Promise<void> {
    const relationship = await this.prisma.referralRelationship.findUnique({
      where: { refereeId },
    });

    if (!relationship) return;

    if (
      relationship.status === ReferralStatus.PAYING ||
      relationship.status === ReferralStatus.REWARDED
    ) return;

    const updated = await this.prisma.referralRelationship.update({
      where: { id: relationship.id },
      data: { status: ReferralStatus.PAYING },
    });

    await this.prisma.referralEvent.create({
      data: {
        relationshipId: relationship.id,
        fromStatus: relationship.status,
        toStatus: ReferralStatus.PAYING,
        payload: { reason: 'PAYMENT_CONFIRMED' },
      },
    });

    await this.growthEventService.publish({
      telegramUserId: relationship.referrerId,
      eventType: GrowthEventType.REFERRAL_COMPLETED,
      payload: {
        refereeId: refereeId.toString(),
        relationshipId: relationship.id,
        paying: true,
      },
    });
  }

  /**
   * Get or create a unique referral code for a user.
   */
  async getOrCreateReferralCode(telegramUserId: bigint) {
    const existing = await this.prisma.referralCode.findUnique({
      where: { telegramUserId },
    });

    if (existing) {
      return {
        ...existing,
        referralLink: `https://t.me/${this.BOT_USERNAME}?start=ref_${existing.code}`,
      };
    }

    // Generate random 8-char uppercase code
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `TS${randomSuffix}`;

    const created = await this.prisma.referralCode.create({
      data: {
        telegramUserId,
        code,
        metadata: { generatedAt: new Date().toISOString() },
      },
    });

    return {
      ...created,
      referralLink: `https://t.me/${this.BOT_USERNAME}?start=ref_${created.code}`,
    };
  }

  /**
   * Record a new referral connection when a new user joins via a referral code.
   */
  async registerReferral(referrerCode: string, refereeId: bigint) {
    const codeRecord = await this.prisma.referralCode.findUnique({
      where: { code: referrerCode.toUpperCase() },
    });

    if (!codeRecord) {
      throw new NotFoundException(`Referral code ${referrerCode} not found`);
    }

    if (codeRecord.telegramUserId === refereeId) {
      throw new BadRequestException('Users cannot refer themselves');
    }

    // Check if referee already has a referrer
    const existingRelationship = await this.prisma.referralRelationship.findUnique({
      where: { refereeId },
    });

    if (existingRelationship) {
      return existingRelationship;
    }

    const relationship = await this.prisma.referralRelationship.create({
      data: {
        referrerId: codeRecord.telegramUserId,
        refereeId,
        referralCodeId: codeRecord.id,
        status: ReferralStatus.REGISTERED,
        metadata: { registeredAt: new Date().toISOString() },
      },
    });

    await this.prisma.referralEvent.create({
      data: {
        relationshipId: relationship.id,
        fromStatus: ReferralStatus.CREATED,
        toStatus: ReferralStatus.REGISTERED,
        payload: { referrerCode },
      },
    });

    await this.growthEventService.publish({
      telegramUserId: refereeId,
      eventType: GrowthEventType.USER_REGISTERED,
      payload: { referrerId: codeRecord.telegramUserId.toString(), referralCode: referrerCode },
    });

    return relationship;
  }

  /**
   * Transition referral state when a referee completes onboarding.
   */
  async handleRefereeOnboarded(refereeId: bigint) {
    const relationship = await this.prisma.referralRelationship.findUnique({
      where: { refereeId },
    });

    if (!relationship || relationship.status !== ReferralStatus.REGISTERED) {
      return null;
    }

    const updated = await this.prisma.referralRelationship.update({
      where: { id: relationship.id },
      data: { status: ReferralStatus.ONBOARDED },
    });

    await this.prisma.referralEvent.create({
      data: {
        relationshipId: relationship.id,
        fromStatus: relationship.status,
        toStatus: ReferralStatus.ONBOARDED,
      },
    });

    return updated;
  }

  /**
   * Evaluate if a referral relationship qualifies for a reward (Onboarded + First Successful Settlement).
   */
  async evaluateQualification(refereeId: bigint) {
    const relationship = await this.prisma.referralRelationship.findUnique({
      where: { refereeId },
    });

    if (!relationship) return null;

    if (
      relationship.status === ReferralStatus.QUALIFIED ||
      relationship.status === ReferralStatus.PAYING ||
      relationship.status === ReferralStatus.REWARDED
    ) {
      return relationship;
    }

    // Check if referee is READY and has completed at least 1 settlement
    const refereeUser = await this.prisma.user.findUnique({
      where: { telegramUserId: refereeId },
    });

    const completedSettlementCount = await this.prisma.settlementSession.count({
      where: { telegramUserId: refereeId, status: 'COMPLETED' },
    });

    if (refereeUser?.isReady && completedSettlementCount >= 1) {
      const updated = await this.prisma.referralRelationship.update({
        where: { id: relationship.id },
        data: {
          status: ReferralStatus.QUALIFIED,
          qualifiedAt: new Date(),
        },
      });

      await this.prisma.referralEvent.create({
        data: {
          relationshipId: relationship.id,
          fromStatus: relationship.status,
          toStatus: ReferralStatus.QUALIFIED,
          payload: { completedSettlements: completedSettlementCount },
        },
      });

      await this.growthEventService.publish({
        telegramUserId: relationship.referrerId,
        eventType: GrowthEventType.REFERRAL_COMPLETED,
        payload: {
          refereeId: refereeId.toString(),
          relationshipId: relationship.id,
        },
      });

      return updated;
    }

    return relationship;
  }

  /**
   * Mark referral relationship as REWARDED once financial reward has been granted.
   */
  async markRewarded(relationshipId: string, rewardId: string) {
    const relationship = await this.prisma.referralRelationship.update({
      where: { id: relationshipId },
      data: {
        status: ReferralStatus.REWARDED,
        rewardedAt: new Date(),
      },
    });

    await this.prisma.referralReward.create({
      data: {
        relationshipId,
        rewardId,
      },
    });

    await this.prisma.referralEvent.create({
      data: {
        relationshipId,
        fromStatus: ReferralStatus.QUALIFIED,
        toStatus: ReferralStatus.REWARDED,
        payload: { rewardId },
      },
    });

    return relationship;
  }

  /**
   * Get referral summary for a given user.
   */
  async getUserReferralSummary(telegramUserId: bigint) {
    const codeInfo = await this.getOrCreateReferralCode(telegramUserId);

    const relationships = await this.prisma.referralRelationship.findMany({
      where: { referrerId: telegramUserId },
      include: {
        referee: {
          select: {
            telegramUserId: true,
            firstName: true,
            telegramUsername: true,
            photoUrl: true,
            createdAt: true,
          },
        },
        rewards: {
          include: {
            reward: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalInvited = relationships.length;
    const qualifiedCount = relationships.filter(
      (r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
    ).length;
    const payingCount = relationships.filter(
      (r) => r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
    ).length;

    let totalEarnedUSDT = 0;
    relationships.forEach((r) => {
      r.rewards.forEach((rw) => {
        if (rw.reward && rw.reward.status === 'PROCESSED') {
          totalEarnedUSDT += Number(rw.reward.amount);
        }
      });
    });

    return {
      referralCode: codeInfo.code,
      referralLink: codeInfo.referralLink,
      totalInvited,
      qualifiedCount,
      payingCount,
      totalEarnedUSDT,
      referrals: relationships.map((r) => ({
        id: r.id,
        refereeId: r.refereeId.toString(),
        refereeName: r.referee.firstName,
        refereeUsername: r.referee.telegramUsername,
        status: r.status,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        rewardedAt: r.rewardedAt,
      })),
    };
  }
}
