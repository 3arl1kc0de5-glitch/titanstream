import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TelegramUserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const telegramUserId = request.user?.telegramUserId ?? request.user?.sub;
  return telegramUserId !== undefined ? BigInt(telegramUserId) : undefined;
});
