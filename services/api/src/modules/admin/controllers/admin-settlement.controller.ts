import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { AdminSettlementService, FilterSettlementsParams } from '../services/admin-settlement.service';

@Controller('admin/settlements')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminSettlementController {
  constructor(private readonly settlementService: AdminSettlementService) {}

  @Get()
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  async listSettlements(@Query() query: FilterSettlementsParams) {
    return this.settlementService.listSettlements(query);
  }

  @Get(':id')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  async getSettlement(@Param('id') id: string) {
    return this.settlementService.getSettlementDetail(id);
  }

  @Post(':id/review')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  async reviewSettlement(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { note: string; actionStatus?: any },
  ) {
    return this.settlementService.reviewSettlement(admin, id, body.note, body.actionStatus);
  }

  @Post(':id/escalate')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  async escalateSettlement(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.settlementService.escalateSettlement(admin, id, body.reason);
  }

  @Post(':id/reassign')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  async reassignMerchant(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { merchantId: string },
  ) {
    return this.settlementService.reassignMerchant(admin, id, body.merchantId);
  }

  @Post(':id/pause')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  async pauseSettlement(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.settlementService.pauseSettlement(admin, id, body.reason);
  }
}
