import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RbacGuard } from '../admin/guards/rbac.guard';
import { Permissions } from '../admin/decorators/permissions.decorator';
import { AdminPermission } from '../admin/interfaces/admin-permissions.enum';
import { GrowthAnalyticsService } from './growth-analytics.service';

@ApiTags('Admin Growth & Engagement Intelligence')
@Controller('admin/growth')
@UseGuards(AdminAuthGuard, RbacGuard)
export class GrowthAnalyticsController {
  constructor(private readonly service: GrowthAnalyticsService) {}

  @Get('analytics-overview')
  @Permissions(AdminPermission.METRICS_VIEW)
  @ApiOperation({ summary: 'Get aggregated growth intelligence overview metrics' })
  async getAnalyticsOverview() {
    const data = await this.service.getGrowthAnalyticsOverview();
    return {
      success: true,
      data,
    };
  }

  @Get('cohorts')
  @Permissions(AdminPermission.METRICS_VIEW)
  @ApiOperation({ summary: 'Get user retention cohorts (D1, D7, D30)' })
  async getCohorts() {
    const data = await this.service.getGrowthAnalyticsOverview();
    return {
      success: true,
      data: data.cohorts,
    };
  }

  @Get('conversion-funnel')
  @Permissions(AdminPermission.METRICS_VIEW)
  @ApiOperation({ summary: 'Get user lifecycle conversion funnel metrics' })
  async getFunnel() {
    const data = await this.service.getGrowthAnalyticsOverview();
    return {
      success: true,
      data: data.funnel,
    };
  }
}
