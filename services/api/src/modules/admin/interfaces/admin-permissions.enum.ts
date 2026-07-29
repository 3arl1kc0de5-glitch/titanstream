import { AdminRole } from '@prisma/client';

export enum AdminPermission {
  SETTLEMENT_VIEW = 'settlement.view',
  SETTLEMENT_REVIEW = 'settlement.review',
  SETTLEMENT_OVERRIDE = 'settlement.override',
  MERCHANT_CREATE = 'merchant.create',
  MERCHANT_VIEW = 'merchant.view',
  MERCHANT_SUSPEND = 'merchant.suspend',
  USER_VIEW = 'user.view',
  USER_FREEZE = 'user.freeze',
  RISK_MANAGE = 'risk.manage',
  FINANCIAL_VIEW = 'financial.view',
  SUPPORT_MANAGE = 'support.manage',
  METRICS_VIEW = 'metrics.view',
}

export const ROLE_PERMISSIONS_MAP: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(AdminPermission),
  [AdminRole.OPERATIONS_ADMIN]: [
    AdminPermission.SETTLEMENT_VIEW,
    AdminPermission.SETTLEMENT_REVIEW,
    AdminPermission.SETTLEMENT_OVERRIDE,
    AdminPermission.MERCHANT_CREATE,
    AdminPermission.MERCHANT_VIEW,
    AdminPermission.MERCHANT_SUSPEND,
    AdminPermission.USER_VIEW,
    AdminPermission.SUPPORT_MANAGE,
  ],
  [AdminRole.FINANCE_ADMIN]: [
    AdminPermission.FINANCIAL_VIEW,
    AdminPermission.SETTLEMENT_VIEW,
    AdminPermission.MERCHANT_VIEW,
  ],
  [AdminRole.RISK_OPERATOR]: [
    AdminPermission.RISK_MANAGE,
    AdminPermission.USER_VIEW,
    AdminPermission.USER_FREEZE,
    AdminPermission.SETTLEMENT_VIEW,
  ],
  [AdminRole.MERCHANT_MANAGER]: [
    AdminPermission.MERCHANT_CREATE,
    AdminPermission.MERCHANT_VIEW,
    AdminPermission.MERCHANT_SUSPEND,
  ],
  [AdminRole.SUPPORT_AGENT]: [
    AdminPermission.USER_VIEW,
    AdminPermission.SUPPORT_MANAGE,
    AdminPermission.SETTLEMENT_VIEW,
  ],
};
