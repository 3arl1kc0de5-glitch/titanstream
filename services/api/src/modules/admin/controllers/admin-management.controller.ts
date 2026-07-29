import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { AdminRole } from '@prisma/client';
import { AdminManagementService } from '../services/admin-management.service';

@ApiTags('Admin Management & RBAC')
@Controller('admin/management')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminManagementController {
  constructor(private readonly service: AdminManagementService) {}

  @Get('admins')
  @Permissions(AdminPermission.USER_VIEW)
  @ApiOperation({ summary: 'List all authenticated admin users' })
  getAdmins() {
    return {
      success: true,
      data: this.service.getAdminAccounts(),
    };
  }

  @Post('invite')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  @ApiOperation({ summary: 'Invite a new Admin user by telegram_user_id' })
  inviteAdmin(
    @Body('telegramUserId') telegramUserId: string,
    @Body('name') name: string,
    @Body('role') role: AdminRole,
  ) {
    const admin = this.service.inviteAdmin({ telegramUserId, name, role });
    return {
      success: true,
      data: admin,
    };
  }

  @Post(':id/role')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  @ApiOperation({ summary: 'Update an admin user role and permissions' })
  updateAdminRole(
    @Param('id') id: string,
    @Body('role') role: AdminRole,
  ) {
    const admin = this.service.updateAdminRole(id, role);
    return {
      success: true,
      data: admin,
    };
  }

  @Post(':id/status')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  @ApiOperation({ summary: 'Suspend or activate an admin user' })
  toggleAdminStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
  ) {
    const admin = this.service.toggleAdminStatus(id, status);
    return {
      success: true,
      data: admin,
    };
  }
}
