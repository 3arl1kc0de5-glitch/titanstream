import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { MiningController } from './mining.controller';
import { MiningService } from './mining.service';

@Module({
  imports: [PrismaModule, FinancialOrchestrationModule],
  controllers: [MiningController],
  providers: [MiningService],
  exports: [MiningService],
})
export class MiningModule {}
