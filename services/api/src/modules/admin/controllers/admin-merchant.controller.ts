import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MerchantStatus } from '@prisma/client';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { CreateMerchantDto, MerchantPerformanceService } from '../services/merchant-performance.service';

@Controller('admin/merchants')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminMerchantController {
  constructor(private readonly merchantService: MerchantPerformanceService) {}

  @Get()
  @Permissions(AdminPermission.MERCHANT_VIEW)
  async listMerchants(@Query() query: { status?: MerchantStatus; country?: string; limit?: number; offset?: number }) {
    return this.merchantService.listMerchants(query);
  }

  @Post()
  @Permissions(AdminPermission.MERCHANT_CREATE)
  async createMerchant(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() dto: CreateMerchantDto,
  ) {
    return this.merchantService.createMerchant(admin, dto);
  }

  @Get(':id')
  @Permissions(AdminPermission.MERCHANT_VIEW)
  async getMerchant(@Param('id') id: string) {
    return this.merchantService.getMerchant(id);
  }

  @Patch(':id/status')
  @Permissions(AdminPermission.MERCHANT_SUSPEND)
  async updateStatus(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { status: MerchantStatus; reason?: string },
  ) {
    return this.merchantService.updateMerchantStatus(admin, id, body.status, body.reason);
  }

  @Patch(':id/limits')
  @Permissions(AdminPermission.MERCHANT_CREATE)
  async updateLimits(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { dailyLimitUsd: string },
  ) {
    return this.merchantService.updateMerchantLimits(admin, id, body.dailyLimitUsd);
  }

  @Get(':id/performance')
  @Permissions(AdminPermission.MERCHANT_VIEW)
  async getPerformance(@Param('id') id: string) {
    return this.merchantService.calculateMerchantPerformance(id);
  }
}
