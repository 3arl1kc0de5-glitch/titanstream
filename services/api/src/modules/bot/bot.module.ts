import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { FinancialModule } from '../financial/financial.module';
import { GrowthModule } from '../growth/growth.module';
import { AdminModule } from '../admin/admin.module';
import { FinancialOrchestrationModule } from '../financial-orchestration/financial-orchestration.module';
import { AuthModule } from '../auth/auth.module';
import { TelegramClientService } from './telegram-client.service';
import { BotGateService } from './bot-gate.service';
import { BotCommandService } from './bot-command.service';
import { BotAssistantService } from './bot-assistant.service';
import { BotAdminService } from './bot-admin.service';
import { BotNotificationService } from './bot-notification.service';
import { BotBroadcastService } from './bot-broadcast.service';
import { BotAnalyticsService } from './bot-analytics.service';
import { BotPaymentService } from './bot-payment.service';
import { BotWithdrawalService } from './bot-withdrawal.service';
import { BotMonetizationService } from './bot-monetization.service';
import { BotDispatcherService } from './bot-dispatcher.service';
import { BotController } from './bot.controller';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    FinancialModule,
    GrowthModule,
    AdminModule,
    FinancialOrchestrationModule,
    AuthModule,
  ],
  controllers: [BotController],
  providers: [
    TelegramClientService,
    BotGateService,
    BotCommandService,
    BotAssistantService,
    BotAdminService,
    BotNotificationService,
    BotBroadcastService,
    BotAnalyticsService,
    BotPaymentService,
    BotWithdrawalService,
    BotMonetizationService,
    BotDispatcherService,
  ],
  exports: [
    TelegramClientService,
    BotGateService,
    BotCommandService,
    BotAssistantService,
    BotAdminService,
    BotNotificationService,
    BotBroadcastService,
    BotAnalyticsService,
    BotPaymentService,
    BotWithdrawalService,
    BotMonetizationService,
    BotDispatcherService,
  ],
})
export class BotModule {}
