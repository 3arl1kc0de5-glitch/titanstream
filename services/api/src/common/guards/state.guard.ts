import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { STATE_RESTRICTIONS, UserState } from '../interfaces/user-state.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class StateGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new UnauthorizedException();

    const requiredStates = this.reflector.getAllAndOverride<UserState[]>('states', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredStates || requiredStates.length === 0) return true;

    const userState = user.state as UserState;
    const restrictions = STATE_RESTRICTIONS[userState];
    if (!restrictions) return false;

    return requiredStates.includes(userState);
  }
}