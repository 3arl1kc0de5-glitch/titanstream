import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TrustProfileService {
  private readonly logger = new Logger(TrustProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or initialize a user's trust profile.
   */
  async getOrCreateProfile(telegramUserId: bigint) {
    let profile = await this.prisma.userTrustProfile.findUnique({
      where: { telegramUserId },
      include: {
        trustEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!profile) {
      profile = await this.prisma.userTrustProfile.create({
        data: {
          telegramUserId,
          trustScore: 50,
          completedSettlements: 0,
          failedSettlements: 0,
          successRate: 100.0,
          accountAgeDays: 0,
          verificationStatus: 'UNVERIFIED',
        },
        include: {
          trustEvents: true,
        },
      });

      await this.prisma.trustEvent.create({
        data: {
          profileId: profile.id,
          telegramUserId,
          scoreDelta: 50,
          newScore: 50,
          reason: 'Initial trust score assigned',
        },
      });
    }

    return profile;
  }

  /**
   * Recalculate and update user trust score based on platform activity.
   */
  async recalculateTrustScore(telegramUserId: bigint) {
    const profile = await this.getOrCreateProfile(telegramUserId);
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
    });

    if (!user) return profile;

    // Calculate account age in days
    const ageMs = Date.now() - user.createdAt.getTime();
    const accountAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    // Calculate settlement metrics
    const completedSettlements = await this.prisma.settlementSession.count({
      where: { telegramUserId, status: 'COMPLETED' },
    });

    const failedSettlements = await this.prisma.settlementSession.count({
      where: {
        telegramUserId,
        status: { in: ['FAILED', 'REJECTED', 'DISPUTED', 'CANCELLED'] },
      },
    });

    const totalSettlements = completedSettlements + failedSettlements;
    const successRate = totalSettlements > 0 ? (completedSettlements / totalSettlements) * 100 : 100.0;

    // Score calculation formula:
    // Base: 40
    // Account Age: min(20, Math.floor(accountAgeDays / 7) * 2)
    // Completed Settlements: min(40, completedSettlements * 3)
    // Readiness Bonus: user.isReady ? 10 : 0
    // Failed Penalty: failedSettlements * 5
    let calculatedScore = 40;
    calculatedScore += Math.min(20, Math.floor(accountAgeDays / 7) * 2);
    calculatedScore += Math.min(40, completedSettlements * 3);
    if (user.isReady) calculatedScore += 10;
    calculatedScore -= failedSettlements * 5;

    // Clamp score to [10, 100]
    const finalScore = Math.max(10, Math.min(100, Math.round(calculatedScore)));
    const scoreDelta = finalScore - profile.trustScore;

    const verificationStatus = user.isReady ? 'VERIFIED' : 'UNVERIFIED';

    const updatedProfile = await this.prisma.userTrustProfile.update({
      where: { telegramUserId },
      data: {
        trustScore: finalScore,
        completedSettlements,
        failedSettlements,
        successRate,
        accountAgeDays,
        verificationStatus,
      },
    });

    if (scoreDelta !== 0) {
      await this.prisma.trustEvent.create({
        data: {
          profileId: profile.id,
          telegramUserId,
          scoreDelta,
          newScore: finalScore,
          reason: `Recalculated trust score (Completed: ${completedSettlements}, Failed: ${failedSettlements}, Age: ${accountAgeDays}d)`,
        },
      });
      this.logger.log(`[TrustProfile] Updated user ${telegramUserId} score to ${finalScore} (delta: ${scoreDelta})`);
    }

    return updatedProfile;
  }
}
