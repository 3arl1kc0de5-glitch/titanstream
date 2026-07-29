import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard';
import { RbacGuard } from '../../admin/guards/rbac.guard';
import { Permissions } from '../../admin/decorators/permissions.decorator';
import { AdminPermission } from '../../admin/interfaces/admin-permissions.enum';
import { LaunchCertificationService } from '../services/launch-certification.service';

@ApiTags('Admin Launch Certification')
@Controller('admin/readiness')
@UseGuards(AdminAuthGuard, RbacGuard)
export class LaunchCertificationController {
  constructor(private readonly service: LaunchCertificationService) {}

  @Get('launch-certification')
  @Permissions(AdminPermission.METRICS_VIEW)
  @ApiOperation({ summary: 'Get Master Launch Certification Report & Production Sign-Off Matrix' })
  async getLaunchCertification() {
    const report = await this.service.getMasterLaunchReport();
    return {
      success: true,
      data: report,
    };
  }
}
