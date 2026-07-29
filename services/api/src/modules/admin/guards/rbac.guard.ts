import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AdminPermission, ROLE_PERMISSIONS_MAP } from '../interfaces/admin-permissions.enum';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.admin;

    if (!admin || !admin.role) {
      throw new ForbiddenException('ADMIN_ROLE_NOT_FOUND');
    }

    const grantedPermissions = ROLE_PERMISSIONS_MAP[admin.role as keyof typeof ROLE_PERMISSIONS_MAP] || [];
    const hasAllPermissions = requiredPermissions.every((perm) => grantedPermissions.includes(perm));

    if (!hasAllPermissions) {
      throw new ForbiddenException(`INSUFFICIENT_ADMIN_PERMISSIONS: Required [${requiredPermissions.join(', ')}]`);
    }

    return true;
  }
}
