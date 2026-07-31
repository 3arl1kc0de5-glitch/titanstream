import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { AdminModule } from '../admin/admin.module';
import { GrowthModule } from '../growth/growth.module';
import { AssetRegistryService } from './asset-registry.service';
import { BalanceService } from './balance.service';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { FinancialAccountController } from './financial-account.controller';
import { FinancialController } from './financial.controller';
import { FinancialAccountRepository } from './financial-account.repository';
import { FinancialAccountService } from './financial-account.service';
import { LedgerService } from './ledger.service';
import { TransactionService } from './transaction.service';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalRiskService } from './withdrawal-risk.service';
import { WithdrawalController } from './withdrawal.controller';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateController } from './exchange-rate.controller';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    forwardRef(() => FinancialOrchestrationModule),
    forwardRef(() => AdminModule),
    GrowthModule,
  ],
  controllers: [FinancialController, FinancialAccountController, WithdrawalController, ExchangeRateController],
  providers: [
    AssetRegistryService,
    BalanceService,
    ChartOfAccountsService,
    FinancialAccountRepository,
    FinancialAccountService,
    LedgerService,
    TransactionService,
    WithdrawalService,
    WithdrawalRiskService,
    ExchangeRateService,
  ],
  exports: [
    FinancialAccountService,
    BalanceService,
    LedgerService,
    TransactionService,
    WithdrawalService,
    WithdrawalRiskService,
    ExchangeRateService,
  ],
})
export class FinancialModule implements OnModuleInit {
  constructor(
    private readonly assets: AssetRegistryService,
    private readonly chart: ChartOfAccountsService,
  ) {}

  async onModuleInit() {
    try {
      await this.assets.ensureDefaults();
      await this.chart.ensureDefaults();
    } catch (err: any) {
      console.warn('Failed to seed default financial configs on startup:', err?.message);
    }
  }
}
