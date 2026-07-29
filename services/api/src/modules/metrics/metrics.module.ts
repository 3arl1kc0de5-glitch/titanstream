import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MetricsController, MonitoringController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
