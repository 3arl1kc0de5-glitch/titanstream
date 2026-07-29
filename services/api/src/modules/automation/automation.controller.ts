import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RbacGuard } from '../admin/guards/rbac.guard';
import { Permissions } from '../admin/decorators/permissions.decorator';
import { AdminPermission } from '../admin/interfaces/admin-permissions.enum';
import { DecisionEngineService, AutomationRule } from './decision-engine.service';

@ApiTags('Admin Automation & Rules Engine')
@Controller('admin/automation')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AutomationController {
  constructor(private readonly decisionEngine: DecisionEngineService) {}

  @Get('rules')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get active automation decision rules catalog' })
  getRules() {
    return {
      success: true,
      data: this.decisionEngine.getRules(),
    };
  }

  @Post('rules')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Create a new automated decision rule' })
  createRule(@Body() dto: Partial<AutomationRule>) {
    const rule = this.decisionEngine.createRule(dto);
    return {
      success: true,
      data: rule,
    };
  }

  @Put('rules/:id')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Update an existing automated decision rule' })
  updateRule(
    @Param('id') id: string,
    @Body() dto: Partial<AutomationRule>,
  ) {
    const rule = this.decisionEngine.updateRule(id, dto);
    return {
      success: true,
      data: rule,
    };
  }

  @Post('rules/:id/toggle')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Enable or disable an automated decision rule' })
  toggleRule(@Param('id') id: string) {
    const rule = this.decisionEngine.toggleRule(id);
    return {
      success: true,
      data: rule,
    };
  }

  @Get('evaluations')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get rule evaluation history audit logs' })
  getEvaluations() {
    return {
      success: true,
      data: this.decisionEngine.getEvaluations(),
    };
  }

  @Post('evaluate')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Dry-run evaluation of a test event payload' })
  evaluatePayload(
    @Body('eventPattern') eventPattern: string,
    @Body('payload') payload: any,
  ) {
    const results = this.decisionEngine.evaluateEvent(eventPattern || 'PaymentOrderCreated', payload || {});
    return {
      success: true,
      data: results,
    };
  }
}
