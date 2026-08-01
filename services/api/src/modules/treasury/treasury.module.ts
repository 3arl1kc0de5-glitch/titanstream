import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { PaymentOrderModule } from '../payment-order/payment-order.module';
import { AuditModule } from '../audit/audit.module';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { PublicTreasuryController } from './public-treasury.controller';
import { TreasuryOperatorService } from './treasury-operator.service';
import { TreasuryOperatorController } from './treasury-operator.controller';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    PaymentOrderModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [TreasuryController, PublicTreasuryController, TreasuryOperatorController],
  providers: [TreasuryService, TreasuryOperatorService],
  exports: [TreasuryService, TreasuryOperatorService],
})
export class TreasuryModule {}
