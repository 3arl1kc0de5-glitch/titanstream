import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AdminRole } from '@prisma/client';

export interface AdminAccountRecord {
  id: string;
  telegramUserId: string;
  name: string;
  role: AdminRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  permissions: string[];
  lastLoginAt: string;
  createdAt: string;
}

@Injectable()
export class AdminManagementService {
  private readonly admins = new Map<string, AdminAccountRecord>();

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultAdmins();
  }

  private seedDefaultAdmins() {
    const superAdmin: AdminAccountRecord = {
      id: 'admin_super_1',
      telegramUserId: '88102931',
      name: 'Lead Super Admin',
      role: AdminRole.SUPER_ADMIN,
      status: 'ACTIVE',
      permissions: ['ALL'],
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const treasuryManager: AdminAccountRecord = {
      id: 'admin_treasury_mgr',
      telegramUserId: '99201823',
      name: 'Treasury Manager',
      role: AdminRole.FINANCE_ADMIN,
      status: 'ACTIVE',
      permissions: ['treasury.*', 'settlement.*'],
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.admins.set(superAdmin.id, superAdmin);
    this.admins.set(treasuryManager.id, treasuryManager);
  }

  getAdminAccounts(): AdminAccountRecord[] {
    return Array.from(this.admins.values());
  }

  inviteAdmin(dto: { telegramUserId: string; name: string; role: AdminRole }): AdminAccountRecord {
    const id = `admin_${Date.now()}`;
    const newAdmin: AdminAccountRecord = {
      id,
      telegramUserId: dto.telegramUserId,
      name: dto.name,
      role: dto.role || AdminRole.OPERATIONS_ADMIN,
      status: 'ACTIVE',
      permissions: [dto.role],
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.admins.set(id, newAdmin);
    return newAdmin;
  }

  updateAdminRole(id: string, role: AdminRole): AdminAccountRecord {
    const admin = this.admins.get(id);
    if (!admin) throw new NotFoundException('ADMIN_NOT_FOUND');
    admin.role = role;
    this.admins.set(id, admin);
    return admin;
  }

  toggleAdminStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'): AdminAccountRecord {
    const admin = this.admins.get(id);
    if (!admin) throw new NotFoundException('ADMIN_NOT_FOUND');
    admin.status = status;
    this.admins.set(id, admin);
    return admin;
  }
}
