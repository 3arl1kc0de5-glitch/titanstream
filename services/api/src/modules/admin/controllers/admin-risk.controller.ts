import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RiskEventStatus, RiskSeverity } from '@prisma/client';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { CreateRiskEventDto, RiskOperationsService } from '../services/risk-operations.service';

@Controller('admin/risk-events')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminRiskController {
  constructor(private readonly riskService: RiskOperationsService) {}

  @Get()
  @Permissions(AdminPermission.RISK_MANAGE)
  async listRiskEvents(@Query() query: { status?: RiskEventStatus; severity?: RiskSeverity; limit?: number; offset?: number }) {
    return this.riskService.listRiskEvents(query);
  }

  @Post()
  @Permissions(AdminPermission.RISK_MANAGE)
  async createRiskEvent(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() dto: CreateRiskEventDto,
  ) {
    return this.riskService.createRiskEvent(admin, dto);
  }

  @Patch(':id')
  @Permissions(AdminPermission.RISK_MANAGE)
  async updateRiskEvent(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { status?: RiskEventStatus; assignedOperatorId?: string; notes?: string },
  ) {
    return this.riskService.updateRiskEvent(admin, id, body);
  }
}
