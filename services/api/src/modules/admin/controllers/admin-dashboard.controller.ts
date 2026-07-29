import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  async getDashboard() {
    return this.dashboardService.getDashboardOverview();
  }
}
