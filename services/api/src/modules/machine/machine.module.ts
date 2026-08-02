import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { FinancialModule } from '../financial/financial.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { PaymentOrderModule } from '../payment-order/payment-order.module';
import { MiningModule } from '../mining/mining.module';
import { MachineController } from './machine.controller';
import { MachineService } from './machine.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationModule,
    FinancialModule,
    FinancialOrchestrationModule,
    forwardRef(() => PaymentOrderModule),
    forwardRef(() => MiningModule),
  ],
  controllers: [MachineController],
  providers: [MachineService],
  exports: [MachineService],
})
export class MachineModule {}

