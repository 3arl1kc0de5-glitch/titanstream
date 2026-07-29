import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FinancialModule } from '../financial/financial.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { PaymentOrderModule } from '../payment-order/payment-order.module';

import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminMerchantController } from './controllers/admin-merchant.controller';
import { AdminObservabilityController } from './controllers/admin-observability.controller';
import { AdminRiskController } from './controllers/admin-risk.controller';
import { AdminSettlementController } from './controllers/admin-settlement.controller';
import { AdminSupportController } from './controllers/admin-support.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminWithdrawalController } from './controllers/admin-withdrawal.controller';
import { MerchantPortalController } from './controllers/merchant-portal.controller';
import { AdminOperationsController } from './controllers/admin-operations.controller';
import { CommandCenterConfigController } from './controllers/command-center-config.controller';
import { AdminManagementController } from './controllers/admin-management.controller';

import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminSettlementService } from './services/admin-settlement.service';
import { MerchantPerformanceService } from './services/merchant-performance.service';
import { MerchantPortalService } from './services/merchant-portal.service';
import { OperationalAuditService } from './services/operational-audit.service';
import { RiskOperationsService } from './services/risk-operations.service';
import { SettlementObservabilityService } from './services/settlement-observability.service';
import { SupportService } from './services/support.service';
import { UserInvestigationService } from './services/user-investigation.service';
import { OperationsService } from './services/operations.service';
import { IncidentEngineService } from './services/incident-engine.service';
import { OperationalSearchService } from './services/operational-search.service';
import { CommandCenterConfigService } from './services/command-center-config.service';
import { AdminManagementService } from './services/admin-management.service';
import { SupportCenterService } from './services/support-center.service';
import { AuditExplorerService } from './services/audit-explorer.service';

@Module({
  imports: [
    PrismaModule, 
    forwardRef(() => FinancialModule),
    forwardRef(() => TreasuryModule),
    forwardRef(() => PaymentOrderModule),
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminSettlementController,
    AdminMerchantController,
    AdminUserController,
    AdminRiskController,
    AdminSupportController,
    AdminObservabilityController,
    MerchantPortalController,
    AdminWithdrawalController,
    AdminOperationsController,
    CommandCenterConfigController,
    AdminManagementController,
  ],
  providers: [
    AdminAuthGuard,
    RbacGuard,
    AdminAuthService,
    OperationalAuditService,
    AdminDashboardService,
    AdminSettlementService,
    MerchantPerformanceService,
    MerchantPortalService,
    UserInvestigationService,
    RiskOperationsService,
    SupportService,
    SettlementObservabilityService,
    OperationsService,
    IncidentEngineService,
    OperationalSearchService,
    CommandCenterConfigService,
    AdminManagementService,
    SupportCenterService,
    AuditExplorerService,
  ],
  exports: [
    AdminAuthService,
    OperationalAuditService,
    AdminDashboardService,
    AdminSettlementService,
    MerchantPerformanceService,
    MerchantPortalService,
    UserInvestigationService,
    RiskOperationsService,
    SupportService,
    SettlementObservabilityService,
    OperationsService,
    IncidentEngineService,
    OperationalSearchService,
    CommandCenterConfigService,
    AdminManagementService,
    SupportCenterService,
    AuditExplorerService,
    AdminAuthGuard,
    RbacGuard,
  ],
})
export class AdminModule {}
