import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { OperatorController } from './operator.controller';
import { OperationsPortalController } from './operator-portal.controller';
import { OperatorRepository } from './operator.repository';
import { InternalOperationsProvider } from './operator-settlement.provider';
import { OperatorService } from './operator.service';
import { CryptoBotProvider, CryptoBotSettlementProvider } from './cryptobot.provider';
import { MerchantSettlementProvider } from './merchant-settlement.provider';
import { ProviderEventService } from './provider-event.service';
import { ProviderRegistryService, SettlementProviderRegistry } from './provider-registry.service';
import { RoutingService } from './routing.service';
import { SettlementController } from './settlement.controller';
import { SettlementRiskService } from './settlement-risk.service';
import { SettlementService } from './settlement.service';
import { UniversalSettlementController } from './universal-settlement.controller';

import { CryptoBotModule } from './cryptobot/cryptobot.module';
import { CryptoBotClient } from './cryptobot/cryptobot.client';
import { CryptoBotSignatureService } from './cryptobot/cryptobot.signature.service';
import { CryptoBotReconciliationService } from './cryptobot/cryptobot.reconciliation.service';

@Module({
  imports: [PrismaModule, FinancialOrchestrationModule, CryptoBotModule],
  controllers: [OperatorController, SettlementController, OperationsPortalController, UniversalSettlementController],
  providers: [
    OperatorRepository,
    OperatorService,
    RoutingService,
    SettlementRiskService,
    SettlementService,
    ProviderEventService,
    InternalOperationsProvider,
    MerchantSettlementProvider,
    CryptoBotProvider,
    CryptoBotSettlementProvider,
    ProviderRegistryService,
    SettlementProviderRegistry,
  ],
  exports: [
    SettlementService,
    RoutingService,
    SettlementRiskService,
    ProviderRegistryService,
    SettlementProviderRegistry,
    MerchantSettlementProvider,
    CryptoBotProvider,
    CryptoBotSettlementProvider,
  ],
})
export class SettlementModule {}
