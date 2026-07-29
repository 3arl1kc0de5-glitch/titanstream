import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard';
import { RbacGuard } from '../../admin/guards/rbac.guard';
import { Permissions } from '../../admin/decorators/permissions.decorator';
import { AdminPermission } from '../../admin/interfaces/admin-permissions.enum';
import { SecurityHardeningService } from '../services/security-hardening.service';
import { IdempotencyGuard } from '../../../common/guards/idempotency.guard';

@ApiTags('Admin Readiness & Security Hardening')
@Controller('admin/readiness')
@UseGuards(AdminAuthGuard, RbacGuard)
export class SecurityHardeningController {
  constructor(private readonly service: SecurityHardeningService) {}

  @Get('security-audit')
  @Permissions(AdminPermission.METRICS_VIEW)
  @ApiOperation({ summary: 'Get system security posture audit report' })
  async getSecurityAudit() {
    const report = await this.service.getSecurityAuditReport();
    return {
      success: true,
      data: report,
    };
  }

  @Post('verify-idempotency')
  @UseGuards(IdempotencyGuard)
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Test endpoint to verify idempotency key collision rejection' })
  verifyIdempotency(@Body('idempotencyKey') idempotencyKey: string) {
    return {
      success: true,
      message: `Idempotency key '${idempotencyKey}' accepted and processed cleanly.`,
    };
  }
}
