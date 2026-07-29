import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { PrismaService } from '../../database/prisma.service';
import { PaginationDto } from '../financial/dto/pagination.dto';
import { CreateFinancialOperationDto } from './dto/create-financial-operation.dto';
import { FinancialOrchestratorService } from './financial-orchestrator.service';

import { ReconciliationService } from './reconciliation.service';

@ApiTags('Financial Orchestration')
@Controller('financial/orchestration')
@UseGuards(AuthGuard)
export class FinancialOrchestrationController {
  constructor(
    private readonly orchestrator: FinancialOrchestratorService,
    private readonly reconciliation: ReconciliationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('operations')
  @ApiOperation({ summary: 'Request a financial operation through the orchestrator' })
  requestOperation(@TelegramUserId() telegramUserId: bigint, @Body() dto: CreateFinancialOperationDto) {
    return this.orchestrator.requestOperation({ telegramUserId, ...dto });
  }

  @Get('operations')
  @ApiOperation({ summary: 'List current user financial operations' })
  async listOperations(@TelegramUserId() telegramUserId: bigint, @Query() query: PaginationDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const items = await this.prisma.financialOperation.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return { items, pagination: { limit, offset } };
  }

  @Post('reconciliation/trigger')
  @ApiOperation({ summary: 'Trigger a full end-to-end financial reconciliation audit sweep' })
  triggerReconciliation(@Query('source') source?: string) {
    return this.reconciliation.runFullReconciliation(source || 'ADMIN_TRIGGER');
  }

  @Get('reconciliation/runs')
  @ApiOperation({ summary: 'List recent financial reconciliation runs and checkpoints' })
  listReconciliationRuns(@Query('limit') limit?: number) {
    return this.reconciliation.getRecentRuns(limit ? Number(limit) : 20);
  }
}
