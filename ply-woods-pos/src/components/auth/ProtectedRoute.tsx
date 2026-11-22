import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { RoleId } from '../../types/pos';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleId[];
  requiredPermission?: keyof import('../../utils/permissions').RolePermissions;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requiredPermission }) => {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4FA] dark:bg-[#12131F]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-[#7C5CFC]/30 border-t-[#7C5CFC] animate-spin" />
          <span className="text-sm font-medium text-[#8B8FA8]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // App router handles redirect
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null; // Access denied handled by App router
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  return <>{children}</>;
};