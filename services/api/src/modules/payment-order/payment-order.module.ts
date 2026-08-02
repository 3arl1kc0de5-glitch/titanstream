import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { MachineModule } from '../machine/machine.module';
import { PaymentOrderController } from './payment-order.controller';
import { PaymentOrderService } from './payment-order.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationModule,
    FinancialOrchestrationModule,
    forwardRef(() => MachineModule),
  ],
  controllers: [PaymentOrderController],
  providers: [PaymentOrderService],
  exports: [PaymentOrderService],
})
export class PaymentOrderModule {}

