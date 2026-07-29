import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReferralQualificationService } from './referral-qualification.service';

export interface DiscountTier {
  tier: string;
  discountPercent: number;
  minPayingReferrals: number;
  description: string;
}

export interface UserDiscountStatus {
  eligible: boolean;
  currentTier: DiscountTier | null;
  nextTier: DiscountTier | null;
  payingReferrals: number;
  discounts: DiscountTier[];
}

@Injectable()
export class DiscountEligibilityService {
  private readonly logger = new Logger(DiscountEligibilityService.name);

  private readonly DISCOUNT_TIERS: DiscountTier[] = [
    { tier: 'BRONZE', discountPercent: 5, minPayingReferrals: 5, description: '5% off settlement fees' },
    { tier: 'SILVER', discountPercent: 10, minPayingReferrals: 15, description: '10% off settlement fees' },
    { tier: 'GOLD', discountPercent: 20, minPayingReferrals: 30, description: '20% off settlement fees + priority routing' },
    { tier: 'PLATINUM', discountPercent: 30, minPayingReferrals: 50, description: '30% off settlement fees + priority routing + dedicated support' },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualificationService: ReferralQualificationService,
  ) {}

  async getUserDiscountStatus(telegramUserId: bigint): Promise<UserDiscountStatus> {
    const payingCount = await this.qualificationService.getPayingReferralCount(telegramUserId);

    const eligible = payingCount >= this.DISCOUNT_TIERS[0].minPayingReferrals;

    let currentTier: DiscountTier | null = null;
    let nextTier: DiscountTier | null = null;

    for (let i = this.DISCOUNT_TIERS.length - 1; i >= 0; i--) {
      if (payingCount >= this.DISCOUNT_TIERS[i].minPayingReferrals) {
        currentTier = this.DISCOUNT_TIERS[i];
        nextTier = i < this.DISCOUNT_TIERS.length - 1 ? this.DISCOUNT_TIERS[i + 1] : null;
        break;
      }
    }

    if (!currentTier) {
      nextTier = this.DISCOUNT_TIERS[0];
    }

    return {
      eligible,
      currentTier,
      nextTier,
      payingReferrals: payingCount,
      discounts: this.DISCOUNT_TIERS,
    };
  }

  async getApplicableDiscountPercent(telegramUserId: bigint): Promise<number> {
    const status = await this.getUserDiscountStatus(telegramUserId);

    if (!status.eligible) return 0;

    if (status.currentTier) {
      return status.currentTier.discountPercent;
    }

    return 0;
  }

  async getDiscountProgress(telegramUserId: bigint): Promise<{
    current: number;
    tiers: Array<{ tier: string; min: number; unlocked: boolean; progress: number }>;
  }> {
    const payingCount = await this.qualificationService.getPayingReferralCount(telegramUserId);

    const tiers = this.DISCOUNT_TIERS.map((t) => {
      const prevMin = 0;
      const progress = Math.min(100, Math.round(((payingCount - prevMin) / (t.minPayingReferrals - prevMin)) * 100));

      return {
        tier: t.tier,
        min: t.minPayingReferrals,
        unlocked: payingCount >= t.minPayingReferrals,
        progress: Math.max(0, Math.min(100, progress)),
      };
    });

    return {
      current: payingCount,
      tiers,
    };
  }
}
