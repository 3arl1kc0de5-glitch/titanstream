import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { isProduction } from '../../common/config/env.util';
import { FinancialModule } from '../financial/financial.module';
import { CommandProcessorService } from './command-processor.service';
import { DomainEventService } from './domain-event.service';
import { FinancialOrchestrationController } from './financial-orchestration.controller';
import { FinancialOrchestratorService } from './financial-orchestrator.service';
import { FinancialRulesService } from './financial-rules.service';
import { FinancialWorkflowService } from './financial-workflow.service';
import { IdempotencyService } from './idempotency.service';
import { ReconciliationService } from './reconciliation.service';
import { LedgerReconciliationSweeperService } from './ledger-reconciliation-sweeper.service';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [PrismaModule, forwardRef(() => FinancialModule), MetricsModule],
  controllers: [FinancialOrchestrationController],
  providers: [
    CommandProcessorService,
    DomainEventService,
    FinancialOrchestratorService,
    FinancialRulesService,
    FinancialWorkflowService,
    IdempotencyService,
    ReconciliationService,
    LedgerReconciliationSweeperService,
  ],
  exports: [FinancialOrchestratorService, FinancialRulesService, ReconciliationService, LedgerReconciliationSweeperService, IdempotencyService],
})
export class FinancialOrchestrationModule implements OnModuleInit {
  constructor(private readonly rules: FinancialRulesService) {}

  async onModuleInit() {
    try {
      await this.rules.ensureDefaults();
    } catch (err: any) {
      if (isProduction()) {
        console.error('FATAL: Failed to seed default financial rules:', err?.message);
        throw err;
      }
      console.warn('Failed to seed default financial rules on startup:', err?.message);
    }
  }
}
