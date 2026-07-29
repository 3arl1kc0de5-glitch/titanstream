import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BotAnalyticsService {
  private readonly logger = new Logger(BotAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMetricsOverview() {
    const [
      totalBotStarts,
      verifiedChannelMembers,
      readyUsers,
      totalSettlements,
      completedSettlements,
      totalReferralRelationships,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { channelVerified: true } }),
      this.prisma.user.count({ where: { isReady: true } }),
      this.prisma.settlementSession.count(),
      this.prisma.settlementSession.count({ where: { status: 'COMPLETED' } }),
      this.prisma.referralRelationship.count(),
    ]);

    const verificationConversionRate = totalBotStarts > 0 ? (verifiedChannelMembers / totalBotStarts) * 100 : 0;
    const readinessConversionRate = totalBotStarts > 0 ? (readyUsers / totalBotStarts) * 100 : 0;

    return {
      acquisition: {
        totalBotStarts,
        verifiedChannelMembers,
        verificationConversionRate: `${verificationConversionRate.toFixed(1)}%`,
      },
      engagement: {
        readyUsers,
        readinessConversionRate: `${readinessConversionRate.toFixed(1)}%`,
        totalReferralRelationships,
      },
      conversion: {
        totalSettlements,
        completedSettlements,
        settlementSuccessRate: totalSettlements > 0 ? `${((completedSettlements / totalSettlements) * 100).toFixed(1)}%` : '0%',
      },
    };
  }
}
