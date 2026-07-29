import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { RbacGuard } from './rbac.guard';
import { AdminPermission } from '../interfaces/admin-permissions.enum';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RbacGuard(reflector);
  });

  const createMockContext = (adminRole: AdminRole) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        admin: { id: 'admin_1', role: adminRole },
      }),
    }),
  });

  it('allows access if no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(AdminRole.SUPPORT_AGENT) as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows SUPER_ADMIN to execute any permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AdminPermission.SETTLEMENT_OVERRIDE]);
    const context = createMockContext(AdminRole.SUPER_ADMIN) as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks SUPPORT_AGENT from performing settlement overrides', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AdminPermission.SETTLEMENT_OVERRIDE]);
    const context = createMockContext(AdminRole.SUPPORT_AGENT) as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows RISK_OPERATOR to manage risk and freeze users', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AdminPermission.RISK_MANAGE, AdminPermission.USER_FREEZE]);
    const context = createMockContext(AdminRole.RISK_OPERATOR) as any;

    expect(guard.canActivate(context)).toBe(true);
  });
});
