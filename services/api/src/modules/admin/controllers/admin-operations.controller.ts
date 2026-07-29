import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { OperationsService } from '../services/operations.service';
import { IncidentEngineService, IncidentSeverity } from '../services/incident-engine.service';
import { OperationalSearchService } from '../services/operational-search.service';

@ApiTags('Admin Operations & Mission Control')
@Controller('admin/operations')
@UseGuards(AdminAuthGuard, RbacGuard)
export class AdminOperationsController {
  constructor(
    private readonly operationsService: OperationsService,
    private readonly incidentEngine: IncidentEngineService,
    private readonly searchService: OperationalSearchService,
  ) {}

  @Get('mission-control')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get 30-second Mission Control operational headquarters overview' })
  async getMissionControlOverview() {
    const data = await this.operationsService.getMissionControlOverview();
    return {
      success: true,
      data,
    };
  }

  @Get('queue')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get actionable Operations Queue (DLQ / failure items)' })
  async getOperationsQueue() {
    const items = await this.operationsService.getOperationsQueue();
    return {
      success: true,
      data: items,
    };
  }

  @Post('queue/:id/resolve')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Resolve an Operations Queue item with operator resolution note' })
  async resolveQueueItem(
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    const item = await this.operationsService.resolveQueueItem(id, note);
    return {
      success: true,
      data: item,
    };
  }

  @Post('queue/:id/retry')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  @ApiOperation({ summary: 'Re-trigger execution for a failed Operations Queue item' })
  async retryQueueItem(@Param('id') id: string) {
    const item = await this.operationsService.retryQueueItem(id);
    return {
      success: true,
      data: item,
    };
  }

  @Get('incidents')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get all active and past system operational incidents' })
  getIncidents() {
    return {
      success: true,
      data: this.incidentEngine.getAllIncidents(),
    };
  }

  @Post('incidents')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Create a new operational system incident' })
  createIncident(
    @Body() body: {
      title: string;
      description: string;
      severity: IncidentSeverity;
      affectedComponent: string;
      ownerName?: string;
    },
  ) {
    const inc = this.incidentEngine.createIncident(body);
    return {
      success: true,
      data: inc,
    };
  }

  @Post('incidents/:id/assign')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Assign an owner to a system incident' })
  assignIncidentOwner(
    @Param('id') id: string,
    @Body('ownerName') ownerName: string,
  ) {
    const inc = this.incidentEngine.assignOwner(id, ownerName);
    return {
      success: true,
      data: inc,
    };
  }

  @Post('incidents/:id/resolve')
  @Permissions(AdminPermission.SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Resolve a system incident with resolution note' })
  resolveIncident(
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    const inc = this.incidentEngine.resolveIncident(id, note || 'Resolved by operator');
    return {
      success: true,
      data: inc,
    };
  }

  @Get('search')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Global operational search across Payment Orders, Queue, Incidents, Users, and Audit Logs' })
  async search(@Query('q') query: string) {
    const items = await this.searchService.search(query || '');
    return {
      success: true,
      data: items,
    };
  }
}
