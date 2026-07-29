import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GrowthEventService } from './growth-event.service';
import { ReferralStatus, GrowthEventType } from '@prisma/client';

export interface QualificationResult {
  eligible: boolean;
  qualifiedCount: number;
  payingCount: number;
  requirement: number;
  progressPercent: number;
  reason?: string;
}

export interface WithdrawalEligibility extends QualificationResult {
  canWithdraw: boolean;
  remainingNeeded: number;
}

export interface DiscountEligibility extends QualificationResult {
  canAccessDiscounts: boolean;
  payingRemaining: number;
}

@Injectable()
export class ReferralQualificationService {
  private readonly logger = new Logger(ReferralQualificationService.name);

  private readonly WITHDRAWAL_REQUIREMENT = 5;
  private readonly DISCOUNT_REQUIREMENT = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly growthEventService: GrowthEventService,
  ) {}

  async getQualifiedReferralCount(telegramUserId: bigint): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
      select: { qualifiedReferrals: true },
    });
    return user?.qualifiedReferrals ?? 0;
  }

  async getPayingReferralCount(telegramUserId: bigint): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
      select: { payingReferrals: true },
    });
    return user?.payingReferrals ?? 0;
  }

  async checkWithdrawalEligibility(telegramUserId: bigint): Promise<WithdrawalEligibility> {
    const qualifiedCount = await this.getQualifiedReferralCount(telegramUserId);
    const payingCount = await this.getPayingReferralCount(telegramUserId);

    const eligible = qualifiedCount >= this.WITHDRAWAL_REQUIREMENT;
    const progressPercent = Math.min(100, Math.round((qualifiedCount / this.WITHDRAWAL_REQUIREMENT) * 100));
    const remainingNeeded = Math.max(0, this.WITHDRAWAL_REQUIREMENT - qualifiedCount);

    const result: WithdrawalEligibility = {
      eligible,
      qualifiedCount,
      payingCount,
      requirement: this.WITHDRAWAL_REQUIREMENT,
      progressPercent,
      canWithdraw: eligible,
      remainingNeeded,
      reason: eligible
        ? undefined
        : `Withdrawal locked: need ${remainingNeeded} more qualified ${remainingNeeded === 1 ? 'referral' : 'referrals'} (${qualifiedCount}/${this.WITHDRAWAL_REQUIREMENT})`,
    };

    await this.recordCheck(telegramUserId, 'WITHDRAWAL_ELIGIBILITY', result);
    return result;
  }

  async checkDiscountEligibility(telegramUserId: bigint): Promise<DiscountEligibility> {
    const qualifiedCount = await this.getQualifiedReferralCount(telegramUserId);
    const payingCount = await this.getPayingReferralCount(telegramUserId);

    const eligible = payingCount >= this.DISCOUNT_REQUIREMENT;
    const progressPercent = Math.min(100, Math.round((payingCount / this.DISCOUNT_REQUIREMENT) * 100));
    const payingRemaining = Math.max(0, this.DISCOUNT_REQUIREMENT - payingCount);

    const result: DiscountEligibility = {
      eligible,
      qualifiedCount,
      payingCount,
      requirement: this.DISCOUNT_REQUIREMENT,
      progressPercent,
      canAccessDiscounts: eligible,
      payingRemaining,
      reason: eligible
        ? undefined
        : `Discount offers locked: need ${payingRemaining} more paying ${payingRemaining === 1 ? 'referral' : 'referrals'} (${payingCount}/${this.DISCOUNT_REQUIREMENT})`,
    };

    await this.recordCheck(telegramUserId, 'DISCOUNT_ELIGIBILITY', result);
    return result;
  }

  async getFullQualificationStatus(telegramUserId: bigint): Promise<{
    withdrawal: WithdrawalEligibility;
    discount: DiscountEligibility;
    qualifiedReferrals: number;
    payingReferrals: number;
  }> {
    const [withdrawal, discount] = await Promise.all([
      this.checkWithdrawalEligibility(telegramUserId),
      this.checkDiscountEligibility(telegramUserId),
    ]);

    return {
      withdrawal,
      discount,
      qualifiedReferrals: withdrawal.qualifiedCount,
      payingReferrals: discount.payingCount,
    };
  }

  private async recordCheck(
    telegramUserId: bigint,
    checkType: string,
    result: QualificationResult,
  ): Promise<void> {
    await this.prisma.referralQualificationHistory.create({
      data: {
        telegramUserId,
        checkType,
        qualified: result.eligible,
        qualifiedCount: result.qualifiedCount,
        payingCount: result.payingCount,
        requirement: result.requirement,
        metadata: { reason: result.reason },
      },
    });
  }

  async recountQualifiedReferrals(telegramUserId: bigint): Promise<void> {
    const relationships = await this.prisma.referralRelationship.findMany({
      where: { referrerId: telegramUserId },
      select: { status: true },
    });

    const qualifiedCount = relationships.filter(
      (r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
    ).length;

    const payingCount = relationships.filter(
      (r) => r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
    ).length;

    await this.prisma.user.update({
      where: { telegramUserId },
      data: {
        qualifiedReferrals: qualifiedCount,
        payingReferrals: payingCount,
      },
    });
  }

  evaluateOnboardingProgress(status: ReferralStatus): boolean {
    return status === ReferralStatus.ONBOARDED ||
      status === ReferralStatus.QUALIFIED ||
      status === ReferralStatus.PAYING ||
      status === ReferralStatus.REWARDED;
  }
}
