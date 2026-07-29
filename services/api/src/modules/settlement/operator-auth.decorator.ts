import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OperatorId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.headers['x-operator-id'];
});
