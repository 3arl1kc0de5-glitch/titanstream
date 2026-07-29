import { Injectable, NotFoundException } from '@nestjs/common';
import { UserState } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OperationalAuditService } from './operational-audit.service';

export interface SearchUsersParams {
  telegramUserId?: string;
  telegramUsername?: string;
  settlementReference?: string;
  transactionReference?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class UserInvestigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OperationalAuditService,
  ) {}

  async searchUsers(params: SearchUsersParams) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    // If searching by settlement reference
    if (params.settlementReference) {
      const session = await this.prisma.settlementSession.findUnique({
        where: { referenceCode: params.settlementReference },
        select: { telegramUserId: true },
      });
      if (session) {
        params.telegramUserId = session.telegramUserId.toString();
      }
    }

    const where: any = {};
    if (params.telegramUserId) {
      where.telegramUserId = BigInt(params.telegramUserId);
    }
    if (params.telegramUsername) {
      where.telegramUsername = { contains: params.telegramUsername, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          financialAccount: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => ({
        ...user,
        telegramUserId: user.telegramUserId.toString(),
      })),
      pagination: { total, limit, offset },
    };
  }

  async getUserDetail(telegramUserId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
      include: {
        financialAccount: true,
        onboardingProgress: true,
        settlementSessions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const [riskEvents, supportCases] = await Promise.all([
      this.prisma.riskEvent.findMany({
        where: { entityType: 'USER', entityId: telegramUserId.toString() },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportCase.findMany({
        where: { userId: telegramUserId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      ...user,
      telegramUserId: user.telegramUserId.toString(),
      settlementSessions: user.settlementSessions.map((s) => ({
        ...s,
        telegramUserId: s.telegramUserId.toString(),
        requestedAmount: s.requestedAmount.toString(),
        expectedCryptoAmount: s.expectedCryptoAmount.toString(),
      })),
      riskEvents,
      supportCases: supportCases.map((c) => ({
        ...c,
        userId: c.userId?.toString(),
      })),
    };
  }

  async freezeUser(admin: { id: string; role: string }, telegramUserId: bigint, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const updated = await this.prisma.user.update({
      where: { telegramUserId },
      data: { state: UserState.SUSPENDED_USER },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'USER_FROZEN',
      entity: 'USER',
      entityId: telegramUserId.toString(),
      metadata: { previousState: user.state, newState: updated.state, reason },
    });

    return {
      status: 'FROZEN',
      telegramUserId: telegramUserId.toString(),
      previousState: user.state,
      currentState: updated.state,
    };
  }

  async unfreezeUser(admin: { id: string; role: string }, telegramUserId: bigint, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const updated = await this.prisma.user.update({
      where: { telegramUserId },
      data: { state: UserState.ACTIVE_USER },
    });

    await this.auditService.logAction({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'USER_UNFROZEN',
      entity: 'USER',
      entityId: telegramUserId.toString(),
      metadata: { previousState: user.state, newState: updated.state, reason },
    });

    return {
      status: 'UNFROZEN',
      telegramUserId: telegramUserId.toString(),
      previousState: user.state,
      currentState: updated.state,
    };
  }
}
