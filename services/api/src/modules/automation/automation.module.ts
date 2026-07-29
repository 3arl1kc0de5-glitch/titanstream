import { Global, Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { AdminModule } from '../admin/admin.module';
import { EventBusService } from './event-bus.service';
import { AutomationService } from './automation.service';
import { DecisionEngineService } from './decision-engine.service';
import { AutomationController } from './automation.controller';

@Global()
@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [AutomationController],
  providers: [EventBusService, AutomationService, DecisionEngineService],
  exports: [EventBusService, AutomationService, DecisionEngineService],
})
export class AutomationModule {}
