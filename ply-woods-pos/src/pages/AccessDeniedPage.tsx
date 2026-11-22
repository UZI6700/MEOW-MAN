import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';

export const AccessDeniedPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4FA] dark:bg-[#12131F] p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <ShieldX className="h-12 w-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-[#1A1B2E] dark:text-white tracking-tight">
            Access Denied
          </h1>
          <p className="text-sm text-[#8B8FA8] max-w-sm mx-auto">
            {user ? (
              <>
                <strong>{user.fullName}</strong> ({user.role}) does not have permission to access this page.
              </>
            ) : (
              'You do not have permission to access this page.'
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
        </div>
        <button
          onClick={logout}
          className="text-xs font-medium text-[#8B8FA8] hover:text-[#EF4444] transition"
        >
          Sign out and switch account
        </button>
      </div>
    </div>
  );
};