import { Module, MiddlewareConsumer, NestModule, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { GrowthModule } from '../growth/growth.module';
import { UserModule } from '../user/user.module';
import { FraudGuardMiddleware } from './fraud-guard.middleware';
import { FraudDetectionService } from './fraud-detection.service';

@Module({
  imports: [PrismaModule, UserModule, forwardRef(() => GrowthModule)],
  providers: [FraudDetectionService],
  exports: [FraudDetectionService],
})
export class FraudModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FraudGuardMiddleware).forRoutes('*');
  }
}
