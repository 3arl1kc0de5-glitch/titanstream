import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TelegramAuthService } from './strategies/telegram-auth.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      signOptions: { expiresIn: '15m' },
    }),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: TelegramAuthService,
      useFactory: () => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
        return new TelegramAuthService(botToken);
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}