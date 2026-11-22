import React from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Truck,
  ClipboardList,
  Receipt,
  Wallet,
  BarChart3,
  Bookmark,
  Settings,
  HelpCircle,
  LogOut,
  X,
} from 'lucide-react';
import { PageId } from '../../types/pos';
import { usePos } from '../../store/PosContext';
// Permissions handled by useAuth in parent

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenHelp: () => void;
  onOpenRoleModal: () => void;
  user?: { fullName: string; role: string; avatarInitials?: string } | null;
  onLogout?: () => void;
}

const NAV_ITEMS: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }>; roles?: string[] }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'pos', label: 'POS (New Sale)', icon: ShoppingCart },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: Warehouse },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'purchases', label: 'Purchases', icon: ClipboardList },
  { id: 'sales', label: 'Sales', icon: Receipt },
  { id: 'expenses', label: 'Expenses & Cash', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'held', label: 'Held Bills', icon: Bookmark },
  { id: 'staff', label: 'Staff & Roles', icon: Users, roles: ['owner'] },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  mobileOpen,
  onCloseMobile,
  onOpenHelp,
  onOpenRoleModal,
  user,
  onLogout,
}) => {
  void onOpenRoleModal;
  const { state } = usePos();

  const ROLE_PAGE_ACCESS: Record<string, string[]> = {
    owner: ['overview', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'sales', 'expenses', 'reports', 'held', 'settings', 'staff'],
    manager: ['overview', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'sales', 'expenses', 'reports', 'held', 'settings'],
    cashier: ['pos', 'customers', 'held', 'sales'],
    storekeeper: ['inventory', 'products', 'held'],
  };

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.roles && user && !item.roles.includes(user.role)) return false;
    if (user && !ROLE_PAGE_ACCESS[user.role]?.includes(item.id)) return false;
    return true;
  });

  const handleNav = (id: PageId) => {
    onSelectPage(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <aside className="flex h-full w-[220px] flex-col bg-[#F9F9FD] dark:bg-[#151726] border-r border-[#ECEEF5] dark:border-[#24273D] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-6">
        <button
          onClick={() => handleNav('overview')}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full hero-gradient shadow-hero transition-transform group-hover:scale-105">
            <div className="h-4 w-4 rounded-full border-[2.5px] border-white" />
            <span className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 rounded-full bg-white" />
          </div>
          <div className="text-left">
            <span className="block text-[17px] font-bold tracking-tight text-[#1A1B2E] dark:text-white leading-tight">
              {state.settings.businessName}
            </span>
            <span className="block text-[10px] font-medium text-[#8B8FA8]">POS &amp; Timber ERP</span>
          </div>
        </button>
        <button
          onClick={onCloseMobile}
          className="lg:hidden rounded-lg p-1.5 text-[#7C809B] hover:bg-white dark:hover:bg-[#24273D]"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-[#1B1D2E] border border-[#ECEEF5] dark:border-[#2A2D45] px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC] text-xs font-bold shrink-0">
              {user.avatarInitials || user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#1A1B2E] dark:text-white truncate">{user.fullName}</div>
              <div className="text-[10px] text-[#8B8FA8] capitalize">{user.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13.5px] font-medium transition-all ${
                active
                  ? 'bg-[#EFEBFD] dark:bg-[#7C5CFC]/15 text-[#7C5CFC] font-semibold'
                  : 'text-[#525672] dark:text-[#A3A7C2] hover:bg-white/80 dark:hover:bg-[#1E2136] hover:text-[#1A1B2E] dark:hover:text-white'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-full bg-[#7C5CFC]" />
              )}
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  active ? 'text-[#7C5CFC]' : 'text-[#5C607B] dark:text-[#888DA8]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Utility Links */}
      <div className="mt-auto border-t border-[#ECEEF5] dark:border-[#24273D] px-3 py-4 space-y-0.5">
        <button
          onClick={() => handleNav('settings')}
          className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13.5px] font-medium transition-all ${
            activePage === 'settings'
              ? 'bg-[#EFEBFD] dark:bg-[#7C5CFC]/15 text-[#7C5CFC] font-semibold'
              : 'text-[#525672] dark:text-[#A3A7C2] hover:bg-white/80 dark:hover:bg-[#1E2136]'
          }`}
        >
          {activePage === 'settings' && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-full bg-[#7C5CFC]" />
          )}
          <Settings className="h-[18px] w-[18px]" />
          <span>Settings</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13.5px] font-medium text-[#525672] dark:text-[#A3A7C2] hover:bg-white/80 dark:hover:bg-[#1E2136] transition-all"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          <span>Help</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13.5px] font-medium text-[#525672] dark:text-[#A3A7C2] hover:bg-red-50 hover:text-[#EF4444] dark:hover:bg-red-950/30 transition-all"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Log out</span>
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">{sidebarContent}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#12131F]/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};