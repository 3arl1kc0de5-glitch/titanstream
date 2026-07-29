import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TrustProfileService } from './trust-profile.service';
import { GrowthEventService } from './growth-event.service';
import { UserLevelTier, GrowthEventType } from '@prisma/client';

export interface LevelConfigDefinition {
  level: UserLevelTier;
  name: string;
  minAccountAgeDays: number;
  minSuccessfulSettlements: number;
  minTrustScore: number;
  benefits: string[];
  orderIndex: number;
}

const DEFAULT_LEVEL_CONFIGS: LevelConfigDefinition[] = [
  {
    level: UserLevelTier.NEW,
    name: 'New Explorer',
    minAccountAgeDays: 0,
    minSuccessfulSettlements: 0,
    minTrustScore: 0,
    benefits: ['Standard daily settlement limits (1,000 USDT/day)'],
    orderIndex: 1,
  },
  {
    level: UserLevelTier.VERIFIED,
    name: 'Verified User',
    minAccountAgeDays: 1,
    minSuccessfulSettlements: 1,
    minTrustScore: 55,
    benefits: ['Increased daily limit (2,500 USDT/day)', 'Priority settlement routing'],
    orderIndex: 2,
  },
  {
    level: UserLevelTier.TRUSTED,
    name: 'Trusted Trader',
    minAccountAgeDays: 7,
    minSuccessfulSettlements: 5,
    minTrustScore: 70,
    benefits: ['High daily limit (5,000 USDT/day)', 'Zero fee settlement processing', 'Priority Telegram support'],
    orderIndex: 3,
  },
  {
    level: UserLevelTier.PREMIUM,
    name: 'Premium Member',
    minAccountAgeDays: 30,
    minSuccessfulSettlements: 20,
    minTrustScore: 85,
    benefits: ['Ultra daily limit (10,000 USDT/day)', 'Dedicated merchant matching', 'Exclusive referral bonus multiplier'],
    orderIndex: 4,
  },
  {
    level: UserLevelTier.ELITE,
    name: 'Elite Partner',
    minAccountAgeDays: 60,
    minSuccessfulSettlements: 50,
    minTrustScore: 95,
    benefits: ['Unlimited custom daily limits', 'VIP Concierge desk', 'Early access to new liquidity pools'],
    orderIndex: 5,
  },
];

@Injectable()
export class UserLevelService {
  private readonly logger = new Logger(UserLevelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trustProfileService: TrustProfileService,
    private readonly growthEventService: GrowthEventService,
  ) {}

  /**
   * Seed default level configurations.
   */
  async ensureDefaultLevelConfigs() {
    for (const conf of DEFAULT_LEVEL_CONFIGS) {
      await this.prisma.userLevelConfig.upsert({
        where: { level: conf.level },
        update: {},
        create: conf,
      });
    }
  }

  /**
   * Get or initialize a user's level record.
   */
  async getUserLevelRecord(telegramUserId: bigint) {
    let record = await this.prisma.userLevelRecord.findUnique({
      where: { telegramUserId },
    });

    if (!record) {
      record = await this.prisma.userLevelRecord.create({
        data: {
          telegramUserId,
          currentLevel: UserLevelTier.NEW,
        },
      });
    }

    return record;
  }

  /**
   * Evaluate and upgrade user level based on trust score and settlement history.
   */
  async evaluateUserLevel(telegramUserId: bigint) {
    await this.ensureDefaultLevelConfigs();
    const currentRecord = await this.getUserLevelRecord(telegramUserId);
    const trustProfile = await this.trustProfileService.recalculateTrustScore(telegramUserId);

    const levelConfigs = await this.prisma.userLevelConfig.findMany({
      orderBy: { orderIndex: 'desc' },
    });

    let qualifiedLevel: UserLevelTier = UserLevelTier.NEW;

    for (const config of levelConfigs) {
      if (
        trustProfile.accountAgeDays >= config.minAccountAgeDays &&
        trustProfile.completedSettlements >= config.minSuccessfulSettlements &&
        trustProfile.trustScore >= config.minTrustScore
      ) {
        qualifiedLevel = config.level;
        break;
      }
    }

    if (qualifiedLevel !== currentRecord.currentLevel) {
      const updated = await this.prisma.userLevelRecord.update({
        where: { telegramUserId },
        data: {
          currentLevel: qualifiedLevel,
          upgradedAt: new Date(),
        },
      });

      await this.growthEventService.publish({
        telegramUserId,
        eventType: GrowthEventType.LEVEL_UPGRADED,
        payload: {
          previousLevel: currentRecord.currentLevel,
          newLevel: qualifiedLevel,
        },
      });

      this.logger.log(`[UserLevel] User ${telegramUserId} UPGRADED from ${currentRecord.currentLevel} to ${qualifiedLevel}`);
      return updated;
    }

    return currentRecord;
  }

  /**
   * Get complete level details and progress towards next level.
   */
  async getUserLevelSummary(telegramUserId: bigint) {
    await this.ensureDefaultLevelConfigs();
    const record = await this.getUserLevelRecord(telegramUserId);
    const trustProfile = await this.trustProfileService.getOrCreateProfile(telegramUserId);

    const configs = await this.prisma.userLevelConfig.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    const currentConfig = configs.find((c) => c.level === record.currentLevel) || configs[0];
    const currentIndex = configs.findIndex((c) => c.level === record.currentLevel);
    const nextConfig = currentIndex < configs.length - 1 ? configs[currentIndex + 1] : null;

    return {
      currentLevel: record.currentLevel,
      levelName: currentConfig.name,
      benefits: currentConfig.benefits,
      upgradedAt: record.upgradedAt,
      nextLevel: nextConfig
        ? {
            level: nextConfig.level,
            name: nextConfig.name,
            minAccountAgeDays: nextConfig.minAccountAgeDays,
            minSuccessfulSettlements: nextConfig.minSuccessfulSettlements,
            minTrustScore: nextConfig.minTrustScore,
            benefits: nextConfig.benefits,
          }
        : null,
      trustProfile: {
        trustScore: trustProfile.trustScore,
        completedSettlements: trustProfile.completedSettlements,
        accountAgeDays: trustProfile.accountAgeDays,
        verificationStatus: trustProfile.verificationStatus,
      },
    };
  }
}
