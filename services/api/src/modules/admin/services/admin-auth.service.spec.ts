import { UnauthorizedException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  const prisma = {
    adminUser: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    adminSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { logAction: jest.fn() };

  let service: AdminAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminAuthService(prisma as any, audit as any);
  });

  it('authenticates valid admin user and returns session token', async () => {
    const passwordHash = (service as any).hashPassword('admin_super_secret_123');
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin_1',
      username: 'superadmin',
      email: 'superadmin@titanstream.io',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });

    prisma.adminSession.create.mockResolvedValue({
      tokenHash: 'adm_sess_1234567890',
      expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await service.login({ username: 'superadmin', password: 'admin_super_secret_123' });

    expect(res.token).toBe('adm_sess_1234567890');
    expect(res.admin.role).toBe(AdminRole.SUPER_ADMIN);
    expect(audit.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_LOGIN' }));
  });

  it('rejects invalid password with UnauthorizedException', async () => {
    const passwordHash = (service as any).hashPassword('real_password');
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin_1',
      username: 'superadmin',
      passwordHash,
      isActive: true,
    });

    await expect(service.login({ username: 'superadmin', password: 'wrong_password' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
