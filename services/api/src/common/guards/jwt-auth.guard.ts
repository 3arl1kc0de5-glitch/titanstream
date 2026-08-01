import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    if (isPublic || request.url?.includes('/admin')) return true;

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'TOKEN_MISSING', message: 'Authorization header required' });
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token);
      const telegramUserId = BigInt(payload.sub);
      let userState = payload.state || 'READY';
      try {
        const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
        if (user) userState = user.state;
      } catch (dbErr) {
        // Fallback user state on database connection lag/blip
      }

      request.user = {
        id: String(telegramUserId),
        sub: String(telegramUserId),
        telegramUserId: String(telegramUserId),
        state: userState,
        role: payload.role || 'USER',
      };
      return true;
    } catch (error: any) {
      throw new UnauthorizedException({ code: error.code || 'TOKEN_INVALID', message: error.message });
    }
  }
}
