import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { RolePermissions } from '../utils/permissions';

export function usePermission() {
  const { hasPermission, can, permissions } = useAuth();
  return { hasPermission, can, permissions: permissions as RolePermissions };
}

export function Can({ permission, children, fallback }: { permission: keyof RolePermissions; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (hasPermission(permission)) return <>{children}</>;
  return fallback ? <>{fallback}</> : null;
}