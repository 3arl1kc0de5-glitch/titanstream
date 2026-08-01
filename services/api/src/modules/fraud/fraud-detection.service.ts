import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReferralGraphService } from '../growth/referral-graph.service';
import { UserState } from '@prisma/client';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ReferralGraphService))
    private readonly referralGraphService: ReferralGraphService,
  ) {}

  /**
   * Detect IP address clustering (multiple accounts operating from same IP).
   */
  async analyzeIpClusters(): Promise<{ flagged: number; details: any[] }> {
    const ipGroups = await this.prisma.user.groupBy({
      by: ['lastActiveIp'],
      where: {
        lastActiveIp: { not: null },
      },
      _count: { telegramUserId: true },
      having: {
        telegramUserId: { _count: { gt: 3 } },
      },
    });

    const details = await Promise.all(
      ipGroups.map(async (group) => {
        const users = await this.prisma.user.findMany({
          where: { lastActiveIp: group.lastActiveIp },
          select: {
            telegramUserId: true,
            telegramUsername: true,
            state: true,
            createdAt: true,
          },
        });
        return {
          ipAddress: group.lastActiveIp,
          accountCount: group._count.telegramUserId,
          users: users.map((u) => ({
            telegramUserId: u.telegramUserId.toString(),
            username: u.telegramUsername,
            state: u.state,
          })),
        };
      }),
    );

    return {
      flagged: ipGroups.length,
      details,
    };
  }

  /**
   * Check for circular referral loops in the graph.
   */
  async checkReferralGraph(): Promise<{ flagged: boolean; cycles: any[] }> {
    const cycles = await this.referralGraphService.detectCycles();
    return {
      flagged: cycles.length > 0,
      cycles,
    };
  }

  /**
   * Automatically suspend flagged suspicious account clusters.
   */
  async autoSuspendCluster(ipAddress: string): Promise<{ suspendedCount: number }> {
    if (!ipAddress) return { suspendedCount: 0 };

    const usersToSuspend = await this.prisma.user.findMany({
      where: {
        lastActiveIp: ipAddress,
        state: { notIn: [UserState.BANNED_USER, UserState.SUSPENDED_USER] },
      },
      select: { telegramUserId: true },
    });

    for (const u of usersToSuspend) {
      await this.prisma.user.update({
        where: { telegramUserId: u.telegramUserId },
        data: { state: UserState.SUSPENDED_USER },
      });

      await this.prisma.userStateTransition.create({
        data: {
          telegramUserId: u.telegramUserId,
          fromState: UserState.ACTIVE_USER,
          toState: UserState.SUSPENDED_USER,
          reason: `FRAUD_IP_CLUSTER_AUTO_SUSPEND:${ipAddress}`,
        },
      });
    }

    this.logger.warn(`Suspended ${usersToSuspend.length} users associated with IP cluster ${ipAddress}`);

    return {
      suspendedCount: usersToSuspend.length,
    };
  }
}
