import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { FraudGuardMiddleware } from './fraud-guard.middleware';
import { FraudDetectionService } from './fraud-detection.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [FraudDetectionService],
  exports: [FraudDetectionService],
})
export class FraudModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FraudGuardMiddleware).forRoutes('*');
  }
}
