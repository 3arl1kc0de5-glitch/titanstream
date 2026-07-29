import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../database/prisma.module';
import { FinancialOrchestrationModule } from '../../financial-orchestration/financial-orchestration.module';
import { ProviderEventService } from '../provider-event.service';
import { CryptoBotClient } from './cryptobot.client';
import { CryptoBotSignatureService } from './cryptobot.signature.service';
import { CryptoBotReconciliationService } from './cryptobot.reconciliation.service';
import { CryptoBotProvider } from './cryptobot.provider';
import { CryptoBotController } from './cryptobot.controller';

@Module({
  imports: [PrismaModule, FinancialOrchestrationModule],
  controllers: [CryptoBotController],
  providers: [
    CryptoBotClient,
    CryptoBotSignatureService,
    CryptoBotReconciliationService,
    CryptoBotProvider,
    ProviderEventService,
  ],
  exports: [
    CryptoBotClient,
    CryptoBotSignatureService,
    CryptoBotReconciliationService,
    CryptoBotProvider,
  ],
})
export class CryptoBotModule {}
