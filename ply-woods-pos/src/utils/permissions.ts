import { RoleId } from '../types/pos';

export interface RolePermissions {
  label: string;
  badgeColor: string;
  canViewCostAndProfit: boolean;
  canEditPrices: boolean;
  canDeleteOrReturnSales: boolean;
  canAdjustStock: boolean;
  canManageUsersAndSettings: boolean;
  canManagePurchases: boolean;
  canManageExpenses: boolean;
  maxDiscountPercent: number;
}

export const ROLE_PERMISSIONS: Record<RoleId, RolePermissions> = {
  owner: {
    label: 'Owner / Admin',
    badgeColor: 'bg-[#EFEBFD] text-[#7C5CFC]',
    canViewCostAndProfit: true,
    canEditPrices: true,
    canDeleteOrReturnSales: true,
    canAdjustStock: true,
    canManageUsersAndSettings: true,
    canManagePurchases: true,
    canManageExpenses: true,
    maxDiscountPercent: 100,
  },
  manager: {
    label: 'Manager',
    badgeColor: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-300',
    canViewCostAndProfit: true,
    canEditPrices: true,
    canDeleteOrReturnSales: true,
    canAdjustStock: true,
    canManageUsersAndSettings: false,
    canManagePurchases: true,
    canManageExpenses: true,
    maxDiscountPercent: 15,
  },
  cashier: {
    label: 'Cashier',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    canViewCostAndProfit: false, // STRICT: Cashier CANNOT see cost price or profit anywhere
    canEditPrices: false,
    canDeleteOrReturnSales: false,
    canAdjustStock: false,
    canManageUsersAndSettings: false,
    canManagePurchases: false,
    canManageExpenses: false,
    maxDiscountPercent: 5,
  },
  storekeeper: {
    label: 'Storekeeper',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    canViewCostAndProfit: false,
    canEditPrices: false,
    canDeleteOrReturnSales: false,
    canAdjustStock: true,
    canManageUsersAndSettings: false,
    canManagePurchases: true,
    canManageExpenses: false,
    maxDiscountPercent: 0,
  },
};

export function getPermissions(role: RoleId): RolePermissions {
  return ROLE_PERMISSIONS[role];
}
