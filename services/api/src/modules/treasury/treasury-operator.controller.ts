import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RbacGuard } from '../admin/guards/rbac.guard';
import { Permissions } from '../admin/decorators/permissions.decorator';
import { AdminPermission } from '../admin/interfaces/admin-permissions.enum';
import { CurrentAdmin, AuthenticatedAdmin } from '../admin/decorators/current-admin.decorator';
import { TreasuryOperatorService, DutyStatus } from './treasury-operator.service';

@ApiTags('Admin Treasury Operators')
@Controller('admin/treasury-operators')
@UseGuards(AdminAuthGuard, RbacGuard)
export class TreasuryOperatorController {
  constructor(private readonly service: TreasuryOperatorService) {}

  @Get('roster')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get active Treasury Operator Duty Roster' })
  getRoster() {
    return {
      success: true,
      data: this.service.getRoster(),
    };
  }

  @Post('duty')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Toggle operator duty status (ACTIVE, ON_CALL, OFF_DUTY)' })
  setDutyStatus(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body('dutyStatus') dutyStatus: DutyStatus,
  ) {
    const op = this.service.setDutyStatus(admin.id, dutyStatus || 'ACTIVE');
    return {
      success: true,
      data: op,
    };
  }

  @Get('queue')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get Treasury Operator pending payment order verification queue' })
  getQueue() {
    return {
      success: true,
      data: this.service.getVerificationQueue(),
    };
  }

  @Post('verify/:orderId')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Approve or Reject payment order and execute double-entry ledger settlement' })
  async verifyPaymentOrder(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('orderId') orderId: string,
    @Body('action') action: 'APPROVE' | 'REJECT',
    @Body('reason') reason?: string,
  ) {
    const result = await this.service.verifyPaymentOrder(orderId, action || 'APPROVE', admin.id, reason);
    return {
      success: true,
      data: result,
    };
  }
}
