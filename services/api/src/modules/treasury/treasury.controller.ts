import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permissions } from '../admin/decorators/permissions.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RbacGuard } from '../admin/guards/rbac.guard';
import { AdminPermission } from '../admin/interfaces/admin-permissions.enum';
import { TreasuryService } from './treasury.service';

@Controller('admin/treasury')
@UseGuards(AdminAuthGuard, RbacGuard)
export class TreasuryController {
  constructor(private readonly service: TreasuryService) {}

  @Get('health')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  async getTreasuryHealth() {
    return this.service.getMetrics();
  }
}
