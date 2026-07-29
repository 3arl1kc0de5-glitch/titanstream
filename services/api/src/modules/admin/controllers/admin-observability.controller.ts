import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { SettlementObservabilityService } from '../services/settlement-observability.service';

@Controller('admin/observability')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminObservabilityController {
  constructor(private readonly observabilityService: SettlementObservabilityService) {}

  @Get('slas')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  async getSlaMetrics(@Query('timeframeDays') timeframeDays?: number) {
    const days = timeframeDays ? Number(timeframeDays) : 7;
    return this.observabilityService.calculateSlaMetrics(days);
  }

  @Get('bottlenecks')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  async getBottlenecks() {
    return this.observabilityService.detectBottlenecks();
  }

  @Get('merchant-rankings')
  @Permissions(AdminPermission.MERCHANT_VIEW)
  async getMerchantRankings() {
    return this.observabilityService.getMerchantRankings();
  }
}
