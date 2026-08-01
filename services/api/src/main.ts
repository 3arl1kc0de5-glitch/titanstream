import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { isProduction } from './common/config/env.util';

const REQUIRED_CONFIG: { name: string; purpose: string }[] = [
  { name: 'DATABASE_URL', purpose: 'PostgreSQL connection' },
  { name: 'JWT_SECRET', purpose: 'access-token signing' },
  { name: 'JWT_REFRESH_SECRET', purpose: 'refresh-token signing' },
  { name: 'TELEGRAM_BOT_TOKEN', purpose: 'Telegram bot authentication' },
];

function validateProductionConfig() {
  if (!isProduction()) return;
  const missing = REQUIRED_CONFIG.filter((c) => !process.env[c.name] || !process.env[c.name]!.trim());
  if (missing.length === 0) return;
  console.error(
    '[Config] FATAL: Production boot aborted. Missing required environment variables:\n' +
      missing.map((c) => `  - ${c.name} (${c.purpose})`).join('\n'),
  );
  process.exit(1);
}

async function bootstrap() {
  validateProductionConfig();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'crypto-pay-api-signature'],
  });

  const config = new DocumentBuilder()
    .setTitle('TitanStream API')
    .setDescription('Telegram-native financial application backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`TitanStream API running on port ${port} [v1.0.1]`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('[TitanStream API] Fatal error during bootstrap:', err);
  process.exit(1);
});