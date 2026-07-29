import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { SearchUsersParams, UserInvestigationService } from '../services/user-investigation.service';

@Controller('admin/users')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminUserController {
  constructor(private readonly userService: UserInvestigationService) {}

  @Get()
  @Permissions(AdminPermission.USER_VIEW)
  async listUsers(@Query() query: SearchUsersParams) {
    return this.userService.searchUsers(query);
  }

  @Get(':id')
  @Permissions(AdminPermission.USER_VIEW)
  async getUser(@Param('id') id: string) {
    return this.userService.getUserDetail(BigInt(id));
  }

  @Post(':id/freeze')
  @Permissions(AdminPermission.USER_FREEZE)
  async freezeUser(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.userService.freezeUser(admin, BigInt(id), body.reason);
  }

  @Post(':id/unfreeze')
  @Permissions(AdminPermission.USER_FREEZE)
  async unfreezeUser(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.userService.unfreezeUser(admin, BigInt(id), body.reason);
  }
}
