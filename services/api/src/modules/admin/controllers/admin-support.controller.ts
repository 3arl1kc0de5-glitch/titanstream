import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SupportCategory, SupportPriority, SupportStatus } from '@prisma/client';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { CreateSupportCaseDto, SupportService } from '../services/support.service';

@Controller('admin/cases')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  @Permissions(AdminPermission.SUPPORT_MANAGE)
  async listCases(@Query() query: { status?: SupportStatus; category?: SupportCategory; priority?: SupportPriority; limit?: number; offset?: number }) {
    return this.supportService.listCases(query);
  }

  @Post()
  @Permissions(AdminPermission.SUPPORT_MANAGE)
  async createCase(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() dto: CreateSupportCaseDto,
  ) {
    return this.supportService.createCase(admin, dto);
  }

  @Patch(':id')
  @Permissions(AdminPermission.SUPPORT_MANAGE)
  async updateCase(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { status?: SupportStatus; priority?: SupportPriority; assignedOperatorId?: string; notes?: string },
  ) {
    return this.supportService.updateCase(admin, id, body);
  }
}
