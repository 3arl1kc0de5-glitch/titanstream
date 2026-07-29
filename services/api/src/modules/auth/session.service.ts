import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateAccessToken(token: string): Promise<{ telegramUserId: bigint; role: string; state: string }> {
    const payload = this.jwtService.verify(token);
    const telegramUserId = BigInt(payload.sub);
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });

    if (!user) {
      throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return { telegramUserId, role: payload.role || 'USER', state: user.state };
  }
}
