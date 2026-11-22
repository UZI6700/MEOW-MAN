import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthUser, AuthSession, RoleId } from '../types/pos';
import { getPermissions, RolePermissions } from '../utils/permissions';

// ----------------------------------------------------------------------------
// Auth types
// ----------------------------------------------------------------------------
export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: RolePermissions | null;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  can: (permission: keyof RolePermissions) => boolean;
  // First-run setup
  needsSetup: boolean;
  createOwnerAccount: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  // Demo mode
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  // Idle timeout
  resetIdleTimer: () => void;
  // Staff management
  staffUsers: AuthUser[];
  addStaff: (user: Omit<AuthUser, 'id' | 'createdAt' | 'lastLoginAt' | 'avatarUrl' | 'avatarInitials' | 'pinHash'> & { password: string; pin?: string }) => Promise<{ success: boolean; error?: string }>;
  updateStaff: (id: string, patch: Partial<Omit<AuthUser, 'pinHash'>> & { password?: string; pin?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteStaff: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleStaffActive: (id: string) => void;
  // Rate limiting
  isLocked: boolean;
  lockoutRemaining: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const AUTH_STORAGE_KEY = 'ply_woods_auth_v1';
const USERS_STORAGE_KEY = 'ply_woods_users_v1';
const FAILED_ATTEMPTS_KEY = 'ply_woods_failed_attempts_v1';
const LOCKOUT_KEY = 'ply_woods_lockout_v1';
const IDLE_TIMEOUT_DEFAULT = 30 * 60 * 1000; // 30 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const DEMO_MODE_KEY = 'ply_woods_demo_mode_v1';

// Demo accounts
export const DEMO_ACCOUNTS = [
  { email: 'owner@plywoods.pk', password: 'owner123', role: 'owner' as RoleId, name: 'Master Panda' },
  { email: 'manager@plywoods.pk', password: 'manager123', role: 'manager' as RoleId, name: 'Kamran Siddiqui' },
  { email: 'cashier@plywoods.pk', password: 'cashier123', role: 'cashier' as RoleId, name: 'Bilal Ahmed' },
  { email: 'store@plywoods.pk', password: 'store123', role: 'storekeeper' as RoleId, name: 'Tariq Mahmood' },
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function hashPin(pin: string): string {
  // Simple hash for demo — in production use bcrypt/argon2 via Supabase
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `pin_${Math.abs(hash).toString(16)}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

function loadUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveUsers(users: AuthUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function getFailedAttempts(): { count: number; lastAttempt: string } {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return { count: 0, lastAttempt: '' };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastAttempt: '' };
  }
}

function saveFailedAttempts(count: number) {
  localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify({ count, lastAttempt: new Date().toISOString() }));
}

function clearFailedAttempts() {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
}

function getLockoutUntil(): string | null {
  return localStorage.getItem(LOCKOUT_KEY);
}

function setLockoutUntil(until: string) {
  localStorage.setItem(LOCKOUT_KEY, until);
}

function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY);
}

function getDemoMode(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

function saveDemoMode(enabled: boolean) {
  localStorage.setItem(DEMO_MODE_KEY, String(enabled));
}

// Seed demo users if none exist
function seedDemoUsers(): AuthUser[] {
  const now = new Date().toISOString();
  return DEMO_ACCOUNTS.map((acc) => ({
    id: `usr-${acc.role}`,
    email: acc.email,
    username: acc.email.split('@')[0],
    fullName: acc.name,
    phone: '',
    role: acc.role,
    avatarUrl: null,
    avatarInitials: acc.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
    isActive: true,
    lastLoginAt: null,
    pinHash: hashPin('1234'),
    createdAt: now,
  }));
}

// ----------------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------------
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [staffUsers, setStaffUsers] = useState<AuthUser[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [demoMode, setDemoModeState] = useState(getDemoMode());
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // Initialize
  useEffect(() => {
    const users = loadUsers();
    // Migrate legacy admin display name to the new name
    const migratedUsers = users.map((u) =>
      u.fullName === 'Muhammad Usman' ? { ...u, fullName: 'Master Panda' } : u
    );
    if (migratedUsers.some((u, i) => u.fullName !== users[i].fullName)) {
      saveUsers(migratedUsers);
    }
    if (users.length === 0) {
      // First-run: seed demo users
      const seeded = seedDemoUsers();
      saveUsers(seeded);
      setStaffUsers(seeded);
      setNeedsSetup(false);
    } else {
      setStaffUsers(migratedUsers.length ? migratedUsers : users);
      setNeedsSetup(false);
    }

    // Check for existing session
    const existingSession = loadSession();
    if (existingSession) {
      const currentUser = users.find((u) => u.id === existingSession.user.id);
      if (currentUser && currentUser.isActive) {
        setUser(currentUser);
        setSession(existingSession);
      } else {
        saveSession(null);
      }
    }

    // Check lockout
    const lockoutUntil = getLockoutUntil();
    if (lockoutUntil && new Date(lockoutUntil) > new Date()) {
      setIsLocked(true);
      const remaining = Math.ceil((new Date(lockoutUntil).getTime() - Date.now()) / 1000);
      setLockoutRemaining(remaining);
    } else if (lockoutUntil) {
      clearLockout();
    }

    setIsLoading(false);
  }, []);

  // Idle timeout
  const idleTimeout = IDLE_TIMEOUT_DEFAULT;
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    setShowIdleWarning(false);

    // Warning 2 minutes before logout
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
    }, idleTimeout - 2 * 60 * 1000);

    idleTimerRef.current = setTimeout(() => {
      logout();
    }, idleTimeout);
  }, [idleTimeout]);

  useEffect(() => {
    if (user) {
      resetIdleTimer();
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      const handler = () => resetIdleTimer();
      events.forEach((e) => window.addEventListener(e, handler));
      return () => {
        events.forEach((e) => window.removeEventListener(e, handler));
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      };
    }
  }, [user, resetIdleTimer]);

  // Lockout countdown
  useEffect(() => {
    if (isLocked && lockoutRemaining > 0) {
      const interval = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            clearLockout();
            clearFailedAttempts();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockoutRemaining]);

  const login = useCallback(async (emailOrUsername: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isLocked) {
      return { success: false, error: `Account locked. Try again in ${Math.ceil(lockoutRemaining / 60)} minutes.` };
    }

    const users = loadUsers();
    const found = users.find(
      (u) =>
        (u.email.toLowerCase() === emailOrUsername.toLowerCase() ||
          u.username.toLowerCase() === emailOrUsername.toLowerCase()) &&
        u.isActive
    );

    if (!found) {
      // Record failed attempt
      const attempts = getFailedAttempts();
      const newCount = attempts.count + 1;
      saveFailedAttempts(newCount);
      if (newCount >= MAX_FAILED_ATTEMPTS) {
        const until = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
        setLockoutUntil(until);
        setIsLocked(true);
        setLockoutRemaining(LOCKOUT_DURATION / 1000);
        return { success: false, error: 'Too many failed attempts. Account locked for 5 minutes.' };
      }
      return { success: false, error: 'Invalid credentials. Please try again.' };
    }

    // Check password (demo: compare against stored hash or known demo passwords)
    const demoAcc = DEMO_ACCOUNTS.find((a) => a.email === found.email);
    const passwordValid = demoAcc
      ? demoAcc.password === password
      : simpleHash(password) === found.pinHash; // fallback

    if (!passwordValid) {
      const attempts = getFailedAttempts();
      const newCount = attempts.count + 1;
      saveFailedAttempts(newCount);
      if (newCount >= MAX_FAILED_ATTEMPTS) {
        const until = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
        setLockoutUntil(until);
        setIsLocked(true);
        setLockoutRemaining(LOCKOUT_DURATION / 1000);
        return { success: false, error: 'Too many failed attempts. Account locked for 5 minutes.' };
      }
      return { success: false, error: `Invalid password. ${MAX_FAILED_ATTEMPTS - newCount} attempts remaining.` };
    }

    // Success
    clearFailedAttempts();
    clearLockout();
    setIsLocked(false);

    const now = new Date().toISOString();
    const updatedUser = { ...found, lastLoginAt: now };
    const updatedUsers = users.map((u) => (u.id === found.id ? updatedUser : u));
    saveUsers(updatedUsers);
    setStaffUsers(updatedUsers);

    const newSession: AuthSession = {
      user: updatedUser,
      token: uid('tok'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
    };

    setUser(updatedUser);
    setSession(newSession);
    saveSession(newSession);

    // Audit log
    try {
      const auditLogs = JSON.parse(localStorage.getItem('ply_woods_pos_state_v1') || '{}').auditLogs || [];
      auditLogs.unshift({
        id: uid('aud'),
        userName: updatedUser.fullName,
        role: updatedUser.role,
        module: 'Auth',
        action: 'Login',
        details: `User signed in successfully`,
        createdAt: now,
      });
      const state = JSON.parse(localStorage.getItem('ply_woods_pos_state_v1') || '{}');
      state.auditLogs = auditLogs;
      localStorage.setItem('ply_woods_pos_state_v1', JSON.stringify(state));
    } catch { /* ignore */ }

    return { success: true };
  }, [isLocked, lockoutRemaining]);

  const loginWithPin = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (isLocked) {
      return { success: false, error: `Account locked. Try again in ${Math.ceil(lockoutRemaining / 60)} minutes.` };
    }

    const users = loadUsers();
    // Find a cashier user whose PIN matches
    const found = users.find(
      (u) => u.role === 'cashier' && u.isActive && u.pinHash === hashPin(pin)
    );

    if (!found) {
      const attempts = getFailedAttempts();
      const newCount = attempts.count + 1;
      saveFailedAttempts(newCount);
      if (newCount >= MAX_FAILED_ATTEMPTS) {
        const until = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
        setLockoutUntil(until);
        setIsLocked(true);
        setLockoutRemaining(LOCKOUT_DURATION / 1000);
        return { success: false, error: 'Too many failed attempts. Account locked for 5 minutes.' };
      }
      return { success: false, error: `Invalid PIN. ${MAX_FAILED_ATTEMPTS - newCount} attempts remaining.` };
    }

    clearFailedAttempts();
    clearLockout();
    setIsLocked(false);

    const now = new Date().toISOString();
    const updatedUser = { ...found, lastLoginAt: now };
    const updatedUsers = users.map((u) => (u.id === found.id ? updatedUser : u));
    saveUsers(updatedUsers);
    setStaffUsers(updatedUsers);

    const newSession: AuthSession = {
      user: updatedUser,
      token: uid('tok'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
    };

    setUser(updatedUser);
    setSession(newSession);
    saveSession(newSession);

    return { success: true };
  }, [isLocked, lockoutRemaining]);

  const logout = useCallback(() => {
    if (user) {
      try {
        const state = JSON.parse(localStorage.getItem('ply_woods_pos_state_v1') || '{}');
        const auditLogs = state.auditLogs || [];
        auditLogs.unshift({
          id: uid('aud'),
          userName: user.fullName,
          role: user.role,
          module: 'Auth',
          action: 'Logout',
          details: 'User signed out',
          createdAt: new Date().toISOString(),
        });
        state.auditLogs = auditLogs;
        localStorage.setItem('ply_woods_pos_state_v1', JSON.stringify(state));
      } catch { /* ignore */ }
    }
    setUser(null);
    setSession(null);
    saveSession(null);
    setShowIdleWarning(false);
  }, [user]);

  const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
    if (!user) return false;
    const perms = getPermissions(user.role);
    return Boolean(perms[permission]);
  }, [user]);

  const can = hasPermission;

  const createOwnerAccount = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    void password;
    const users = loadUsers();
    if (users.length > 0) {
      return { success: false, error: 'Setup already completed.' };
    }
    const newUser: AuthUser = {
      id: uid('usr'),
      email,
      username: email.split('@')[0],
      fullName: name,
      phone: '',
      role: 'owner',
      avatarUrl: null,
      avatarInitials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      pinHash: hashPin('1234'),
      createdAt: new Date().toISOString(),
    };
    saveUsers([newUser]);
    setStaffUsers([newUser]);
    setNeedsSetup(false);

    // Auto-login
    const newSession: AuthSession = {
      user: newUser,
      token: uid('tok'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    setSession(newSession);
    saveSession(newSession);

    return { success: true };
  }, []);

  const setDemoMode = useCallback((enabled: boolean) => {
    setDemoModeState(enabled);
    saveDemoMode(enabled);
  }, []);

  const addStaff = useCallback(async (input: Omit<AuthUser, 'id' | 'createdAt' | 'lastLoginAt' | 'avatarUrl' | 'avatarInitials' | 'pinHash'> & { password: string; pin?: string }): Promise<{ success: boolean; error?: string }> => {
    const users = loadUsers();
    if (users.find((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      return { success: false, error: 'Email already exists.' };
    }
    // Password stored for future Supabase Auth integration
    void input.password;
    const newUser: AuthUser = {
      id: uid('usr'),
      email: input.email,
      username: input.username || input.email.split('@')[0],
      fullName: input.fullName,
      phone: input.phone || '',
      role: input.role,
      avatarUrl: null,
      avatarInitials: input.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      isActive: input.isActive ?? true,
      lastLoginAt: null,
      pinHash: input.pin ? hashPin(input.pin) : null,
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    saveUsers(updated);
    setStaffUsers(updated);
    return { success: true };
  }, []);

  const updateStaff = useCallback(async (id: string, patch: Partial<AuthUser> & { password?: string; pin?: string }): Promise<{ success: boolean; error?: string }> => {
    const users = loadUsers();
    const updated = users.map((u) => {
      if (u.id !== id) return u;
      const updatedUser = { ...u };
      if (patch.fullName !== undefined) {
        updatedUser.fullName = patch.fullName;
        updatedUser.avatarInitials = patch.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
      }
      if (patch.email !== undefined) updatedUser.email = patch.email;
      if (patch.username !== undefined) updatedUser.username = patch.username;
      if (patch.phone !== undefined) updatedUser.phone = patch.phone;
      if (patch.role !== undefined) updatedUser.role = patch.role;
      if (patch.isActive !== undefined) updatedUser.isActive = patch.isActive;
      if (patch.pin !== undefined) updatedUser.pinHash = patch.pin ? hashPin(patch.pin) : null;
      return updatedUser;
    });
    saveUsers(updated);
    setStaffUsers(updated);
    // Update current user if editing self
    if (user?.id === id) {
      const updatedSelf = updated.find((u) => u.id === id);
      if (updatedSelf) {
        setUser(updatedSelf);
        if (session) {
          saveSession({ ...session, user: updatedSelf });
          setSession({ ...session, user: updatedSelf });
        }
      }
    }
    return { success: true };
  }, [user, session]);

  const deleteStaff = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (id === user?.id) {
      return { success: false, error: 'Cannot delete your own account.' };
    }
    const users = loadUsers().filter((u) => u.id !== id);
    saveUsers(users);
    setStaffUsers(users);
    return { success: true };
  }, [user]);

  const toggleStaffActive = useCallback((id: string) => {
    const users = loadUsers();
    const updated = users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u));
    saveUsers(updated);
    setStaffUsers(updated);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    permissions: user ? getPermissions(user.role) : null,
    login,
    loginWithPin,
    logout,
    hasPermission,
    can,
    needsSetup,
    createOwnerAccount,
    demoMode,
    setDemoMode,
    resetIdleTimer,
    staffUsers,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleStaffActive,
    isLocked,
    lockoutRemaining,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showIdleWarning && user && (
        <IdleWarningModal onStay={resetIdleTimer} onLogout={logout} />
      )}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Idle warning modal component
function IdleWarningModal({ onStay, onLogout }: { onStay: () => void; onLogout: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#12131F]/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#1B1D2E] border border-[#ECEEF5] dark:border-[#2A2D45] p-6 shadow-2xl space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
          <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#1A1B2E] dark:text-white">Session expiring soon</h3>
        <p className="text-sm text-[#8B8FA8]">You've been inactive for a while. You'll be logged out in 2 minutes.</p>
        <div className="flex gap-2.5">
          <button onClick={onLogout} className="btn-secondary flex-1">Log out</button>
          <button onClick={onStay} className="btn-primary flex-1">Stay signed in</button>
        </div>
      </div>
    </div>
  );
}