import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../interfaces/admin-permissions.enum';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: AdminPermission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
