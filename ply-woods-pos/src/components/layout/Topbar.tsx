import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  Menu,
  Wifi,
  WifiOff,
  RefreshCw,
  Moon,
  Sun,
  Shield,
  Building2,
  Warehouse,
  LogOut,
} from 'lucide-react';
import { PageId, RoleId } from '../../types/pos';
import { usePos } from '../../store/PosContext';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_PERMISSIONS } from '../../utils/permissions';

interface TopbarProps {
  onOpenMobileNav: () => void;
  onQuickNewSale: () => void;
  onNavigate: (page: PageId) => void;
  user?: { fullName: string; role: string; avatarInitials?: string } | null;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileNav,
  onQuickNewSale,
  onNavigate,
  user,
  onLogout,
}) => {
  const {
    state,
    locations,
    currentUser,
    permissions,
    isOffline,
    setActiveLocation,
    switchUserByRole,
    toggleOfflineMode,
    syncOfflineSales,
    updateSettings,
  } = usePos();

  const { demoMode } = useAuth();

  const [locOpen, setLocOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const activeLoc = locations.find((l) => l.id === state.activeLocationId) || locations[0];
  const unsyncedCount = state.sales.filter((s) => !s.synced).length;

  const displayName = user?.fullName || currentUser.name;
  const displayRole = user?.role || currentUser.role;
  const displayInitials = user?.avatarInitials || currentUser.avatarInitials;
  const displayPermissions = user ? ROLE_PERMISSIONS[user.role as RoleId] : permissions;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) setLocOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="flex items-center justify-between gap-3 px-5 sm:px-8 py-4 border-b border-[#F1F2F8] dark:border-[#24273D] bg-white dark:bg-[#171928]">
      {/* Left: Hamburger + Business/Branch Selector + Round Purple '+' Quick Sale */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden rounded-xl p-2 text-[#525672] hover:bg-[#F3F4FA] dark:hover:bg-[#24273D]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Branch Selector */}
        <div className="relative" ref={locRef}>
          <button
            onClick={() => setLocOpen((o) => !o)}
            className="flex items-center gap-3 rounded-2xl py-1 pr-2.5 pl-1 hover:bg-[#F6F7FC] dark:hover:bg-[#22253A] transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E1F2E] dark:bg-[#7C5CFC] text-white font-extrabold text-sm shadow-sm">
              {activeLoc.type === 'shop' ? 'PW' : 'GD'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-bold tracking-wide text-[#1A1B2E] dark:text-white uppercase">
                  {activeLoc.shortName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#8B8FA8]" />
              </div>
              <span className="block text-[11px] text-[#8B8FA8] leading-none">
                {activeLoc.type === 'shop' ? 'Main Retail & Wholesale' : 'I-10 Bulk Warehouse'}
              </span>
            </div>
          </button>

          {locOpen && (
            <div className="absolute left-0 top-12 z-40 w-64 rounded-2xl border border-[#ECEEF5] dark:border-[#2A2D45] bg-white dark:bg-[#1B1D2E] p-2 shadow-xl">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8B8FA8]">
                Active Location
              </p>
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => {
                    setActiveLocation(loc.id);
                    setLocOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    loc.id === activeLoc.id
                      ? 'bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC]'
                      : 'hover:bg-[#F6F7FC] dark:hover:bg-[#24273D] text-[#2D2F45] dark:text-[#E2E4F5]'
                  }`}
                >
                  {loc.type === 'shop' ? (
                    <Building2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <Warehouse className="h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{loc.name}</div>
                    <div className="text-[11px] text-[#8B8FA8] truncate">{loc.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Round Purple '+' button for instant New Sale */}
        <button
          onClick={onQuickNewSale}
          title="Quick New Sale (POS)"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C5CFC] hover:bg-[#6A48F5] text-white shadow-md shadow-[#7C5CFC]/30 transition hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[2.6]" />
        </button>
      </div>

      {/* Right: Offline PWA Queue + Theme + User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline / Sync Pill */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleOfflineMode}
            title="Click to simulate offline POS mode"
            className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isOffline
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            }`}
          >
            {isOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
            <span>{isOffline ? 'Offline Queue' : 'Online'}</span>
          </button>

          {unsyncedCount > 0 && (
            <button
              onClick={syncOfflineSales}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7C5CFC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6A48F5] transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync ({unsyncedCount})</span>
            </button>
          )}
        </div>

        {/* Dark / Light Toggle */}
        <button
          onClick={() => updateSettings({ darkMode: !state.settings.darkMode })}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5F6FB] dark:bg-[#22253A] text-[#5C607B] dark:text-[#C5C8DF] hover:text-[#7C5CFC] transition"
          title="Toggle Dark / Light Theme"
        >
          {state.settings.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 hover:bg-[#F6F7FC] dark:hover:bg-[#22253A] transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2C2E45] to-[#7C5CFC] text-xs font-bold text-white shadow-sm">
              {displayInitials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[13px] font-semibold text-[#1A1B2E] dark:text-white leading-tight">
                {displayName}
              </div>
              <div className="text-[11px] font-medium text-[#7C5CFC] leading-tight">
                {displayPermissions.label}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-[#8B8FA8] hidden sm:block" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-[#ECEEF5] dark:border-[#2A2D45] bg-white dark:bg-[#1B1D2E] p-2 shadow-xl">
              <div className="px-3 py-2 border-b border-[#F1F2F8] dark:border-[#2A2D45]">
                <p className="text-xs font-bold text-[#1A1B2E] dark:text-white">{displayName}</p>
                <p className="text-[11px] text-[#8B8FA8]">{user?.role || ''}</p>
              </div>
              <div className="py-1 space-y-0.5">
                {demoMode && (
                  <div className="px-3 py-2 rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] mb-1">
                    <p className="text-[10px] font-semibold text-[#8B8FA8] uppercase tracking-wider mb-1.5">Demo Mode Active</p>
                    <div className="space-y-0.5">
                      {(['owner', 'manager', 'cashier', 'storekeeper'] as RoleId[]).map((role) => {
                        const p = ROLE_PERMISSIONS[role];
                        const active = displayRole === role;
                        return (
                          <button
                            key={role}
                            onClick={() => {
                              switchUserByRole(role);
                              setUserOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-xs transition ${
                              active
                                ? 'bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC] font-semibold'
                                : 'hover:bg-[#F6F7FC] dark:hover:bg-[#24273D] text-[#32354D] dark:text-[#D5D8EB]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5" />
                              {p.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setUserOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-[#525672] dark:text-[#A3A7C2] hover:bg-[#F6F7FC] dark:hover:bg-[#24273D]"
                >
                  Business Settings
                </button>
                {user?.role === 'owner' && (
                  <button
                    onClick={() => {
                      onNavigate('staff');
                      setUserOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-[#525672] dark:text-[#A3A7C2] hover:bg-[#F6F7FC] dark:hover:bg-[#24273D]"
                  >
                    Staff &amp; Roles
                  </button>
                )}
              </div>
              <div className="border-t border-[#F1F2F8] dark:border-[#2A2D45] pt-1">
                <button
                  onClick={() => {
                    onLogout?.();
                    setUserOpen(false);
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};