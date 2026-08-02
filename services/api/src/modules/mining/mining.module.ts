import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { MachineModule } from '../machine/machine.module';
import { MiningController } from './mining.controller';
import { MiningService } from './mining.service';

@Module({
  imports: [PrismaModule, FinancialOrchestrationModule, forwardRef(() => MachineModule)],
  controllers: [MiningController],
  providers: [MiningService],
  exports: [MiningService],
})
export class MiningModule {}

