import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { ROLE_PERMISSIONS_MAP } from '../interfaces/admin-permissions.enum';
import { OperationalAuditService } from './operational-audit.service';

export interface AdminLoginDto {
  username: string;
  password: string;
}

@Injectable()
export class AdminAuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OperationalAuditService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdminAccounts();
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(`tetherstream_salt:${password}`).digest('hex');
  }

  async seedDefaultAdminAccounts() {
    try {
      const defaultAdmins = [
        {
          username: 'superadmin',
          email: 'superadmin@tetherstream.io',
          password: 'admin_super_secret_123',
          role: AdminRole.SUPER_ADMIN,
        },
        {
          username: 'ops_admin',
          email: 'ops@tetherstream.io',
          password: 'ops_secret_pass_123',
          role: AdminRole.OPERATIONS_ADMIN,
        },
        {
          username: 'risk_operator',
          email: 'risk@tetherstream.io',
          password: 'risk_secret_pass_123',
          role: AdminRole.RISK_OPERATOR,
        },
      ];

      for (const adm of defaultAdmins) {
        const existing = await this.prisma.adminUser.findUnique({ where: { username: adm.username } });
        if (!existing) {
          await this.prisma.adminUser.create({
            data: {
              username: adm.username,
              email: adm.email,
              passwordHash: this.hashPassword(adm.password),
              role: adm.role,
              isActive: true,
            },
          });
        }
      }
    } catch (err) {
      // Graceful fallback for mock DB environments
    }
  }

  async login(dto: AdminLoginDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { username: dto.username } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('INVALID_ADMIN_CREDENTIALS');
    }

    const hashedInput = this.hashPassword(dto.password);
    if (user.passwordHash !== hashedInput && user.passwordHash !== dto.password) {
      throw new UnauthorizedException('INVALID_ADMIN_CREDENTIALS');
    }

    const token = `adm_sess_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await this.prisma.adminSession.create({
      data: {
        adminUserId: user.id,
        tokenHash: token,
        expiresAt,
      },
    });

    await this.auditService.logAction({
      actorId: user.id,
      actorRole: user.role,
      action: 'ADMIN_LOGIN',
      entity: 'ADMIN_USER',
      entityId: user.id,
      metadata: { username: user.username },
    });

    return {
      token: session.tokenHash,
      expiresAt: session.expiresAt.toISOString(),
      admin: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: ROLE_PERMISSIONS_MAP[user.role as keyof typeof ROLE_PERMISSIONS_MAP] || [],
      },
    };
  }

  async logout(token: string) {
    const session = await this.prisma.adminSession.findFirst({ where: { tokenHash: token } });
    if (session) {
      await this.prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.auditService.logAction({
        actorId: session.adminUserId,
        actorRole: 'ADMIN',
        action: 'ADMIN_LOGOUT',
        entity: 'ADMIN_USER',
        entityId: session.adminUserId,
      });
    }

    return { status: 'LOGGED_OUT' };
  }

  async getMe(adminId: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!user) throw new UnauthorizedException('ADMIN_NOT_FOUND');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS_MAP[user.role as keyof typeof ROLE_PERMISSIONS_MAP] || [],
    };
  }
}
