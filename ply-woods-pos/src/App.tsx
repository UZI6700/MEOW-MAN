import React, { useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { PageId, RoleId, Sale } from './types/pos';
import { PosProvider, usePos } from './store/PosContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { ReceiptModal } from './components/print/ReceiptModal';
import { OverviewPage } from './pages/OverviewPage';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SalesPage } from './pages/SalesPage';
import { ExpensesCashPage } from './pages/ExpensesCashPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
// Permission check done via useAuth in components

// Role-based default landing page
function getDefaultPage(role: RoleId): PageId {
  switch (role) {
    case 'owner':
    case 'manager':
      return 'overview';
    case 'cashier':
      return 'pos';
    case 'storekeeper':
      return 'inventory';
    default:
      return 'overview';
  }
}

// Pages accessible by role
const ROLE_PAGE_ACCESS: Record<RoleId, PageId[]> = {
  owner: ['overview', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'sales', 'expenses', 'reports', 'held', 'settings', 'staff'],
  manager: ['overview', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'sales', 'expenses', 'reports', 'held', 'settings'],
  cashier: ['pos', 'customers', 'held', 'sales'],
  storekeeper: ['inventory', 'products', 'held'],
};

const AppShell: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pos = usePos();
  const { switchUserByRole } = pos;

  // Sync auth user role with PosContext
  React.useEffect(() => {
    if (user) {
      switchUserByRole(user.role as any);
    }
  }, [user, switchUserByRole]);

  const [activePage, setActivePage] = useState<PageId>(() => {
    if (user) return getDefaultPage(user.role);
    return 'overview';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // Update active page when user changes
  React.useEffect(() => {
    if (user) {
      setActivePage(getDefaultPage(user.role));
    }
  }, [user]);

  // Guard page access
  const handleSetPage = (page: PageId) => {
    if (user && !ROLE_PAGE_ACCESS[user.role].includes(page)) {
      setShowAccessDenied(true);
      return;
    }
    setActivePage(page);
    setShowAccessDenied(false);
  };

  const renderPage = () => {
    if (showAccessDenied) return <AccessDeniedPage />;
    switch (activePage) {
      case 'overview':
        return <OverviewPage onNavigate={handleSetPage} onPrintSale={setReceiptSale} />;
      case 'pos':
        return <PosPage onSaleCompleted={setReceiptSale} />;
      case 'products':
        return <ProductsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'customers':
        return <CustomersPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'sales':
        return (
          <SalesPage
            key="sales-invoices"
            initialTab="invoices"
            onPrintSale={setReceiptSale}
            onNavigate={handleSetPage}
          />
        );
      case 'held':
        return (
          <SalesPage
            key="sales-held"
            initialTab="held"
            onPrintSale={setReceiptSale}
            onNavigate={handleSetPage}
          />
        );
      case 'expenses':
        return <ExpensesCashPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'staff':
        return <StaffManagementPage />;
      default:
        return <OverviewPage onNavigate={handleSetPage} onPrintSale={setReceiptSale} />;
    }
  };

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
    return null; // Handled by App component
  }

  return (
    <div className="min-h-screen bg-[#F3F4FA] dark:bg-[#12131F] p-0 sm:p-4 lg:p-6 flex justify-center">
      {/* Large Rounded White Container matching Concured Reference */}
      <div className="flex w-full max-w-[1480px] min-h-[calc(100vh-3rem)] rounded-none sm:rounded-[28px] bg-white dark:bg-[#171928] shadow-shell border border-[#ECEEF5] dark:border-[#24273D] overflow-hidden">
        <Sidebar
          activePage={activePage}
          onSelectPage={handleSetPage}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onOpenHelp={() => setShowHelp(true)}
          onOpenRoleModal={() => {}}
          user={user}
          onLogout={logout}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#171928]">
          <Topbar
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onQuickNewSale={() => handleSetPage('pos')}
            onNavigate={handleSetPage}
            user={user}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">{renderPage()}</main>
        </div>
      </div>

      {/* Receipt / A4 Invoice Modal */}
      <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />

      {/* Help & Keyboard Shortcuts Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-[#7C5CFC]" /> POS Shortcuts &amp; Quick Guide
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] px-3.5 py-2.5">
                <span>Focus Product / Barcode Search</span>
                <kbd className="rounded bg-white dark:bg-[#171827] px-2 py-0.5 font-bold text-[#7C5CFC]">F2</kbd>
              </div>
              <div className="flex justify-between rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] px-3.5 py-2.5">
                <span>Open Checkout / Split Payment</span>
                <kbd className="rounded bg-white dark:bg-[#171827] px-2 py-0.5 font-bold text-[#7C5CFC]">F4</kbd>
              </div>
              <div className="flex justify-between rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] px-3.5 py-2.5">
                <span>Hold Current Cart</span>
                <kbd className="rounded bg-white dark:bg-[#171827] px-2 py-0.5 font-bold text-[#7C5CFC]">F8</kbd>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowHelp(false)} className="btn-primary py-2 text-xs">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <PosProvider>
        <AppRouter />
      </PosProvider>
    </AuthProvider>
  );
}

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, needsSetup } = useAuth();
  const [currentPage, setCurrentPage] = useState<'login' | 'setup' | 'app'>('login');

  React.useEffect(() => {
    if (isLoading) return;
    if (needsSetup) {
      setCurrentPage('setup');
    } else if (isAuthenticated) {
      setCurrentPage('app');
    } else {
      setCurrentPage('login');
    }
  }, [isLoading, needsSetup, isAuthenticated]);

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

  if (currentPage === 'setup') return <SetupPage />;
  if (currentPage === 'login') return <LoginPage />;
  return <AppShell />;
}

export default App;