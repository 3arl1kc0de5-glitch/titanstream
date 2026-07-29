import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { WithdrawalService } from '../../financial/withdrawal.service';

@Controller('admin/withdrawals')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminWithdrawalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  @Get()
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  async listWithdrawals(
    @Query('status') status?: SettlementStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const lim = limit ? Number(limit) : 50;
    const off = offset ? Number(offset) : 0;

    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.settlementSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: lim,
        skip: off,
        include: { user: { select: { telegramUsername: true, firstName: true } } },
      }),
      this.prisma.settlementSession.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        telegramUserId: item.telegramUserId.toString(),
        requestedAmount: item.requestedAmount.toString(),
      })),
      pagination: { total, limit: lim, offset: off },
    };
  }

  @Post(':id/approve')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  async approveWithdrawal(@CurrentAdmin() admin: AuthenticatedAdmin, @Param('id') id: string) {
    return this.withdrawalService.approveWithdrawal(admin, id);
  }

  @Post(':id/reject')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  async rejectWithdrawal(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.withdrawalService.rejectWithdrawal(admin, id, body.reason);
  }

  @Post(':id/retry')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  async retryPayout(@Param('id') id: string) {
    return this.withdrawalService.dispatchPayout(id);
  }
}
