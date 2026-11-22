import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Account,
  AccountTransaction,
  AuditLog,
  BusinessSettings,
  CartItem,
  CashSession,
  Customer,
  CustomerLedgerEntry,
  Expense,
  ExpenseCategory,
  HeldCart,
  Location,
  LocationId,
  OffcutItem,
  PaymentMethod,
  ProductVariant,
  PurchaseOrder,
  Quotation,
  RoleId,
  Sale,
  SalePayment,
  StaffUser,
  StockMovement,
  Supplier,
  SupplierLedgerEntry,
} from '../types/pos';
import {
  INITIAL_ACCOUNTS,
  INITIAL_ACCOUNT_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CASH_SESSIONS,
  INITIAL_CUSTOMERS,
  INITIAL_CUSTOMER_LEDGER,
  INITIAL_EXPENSES,
  INITIAL_HELD_CARTS,
  INITIAL_LOCATIONS,
  INITIAL_OFFCUTS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_QUOTATIONS,
  INITIAL_SALES,
  INITIAL_SETTINGS,
  INITIAL_STAFF,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIERS,
  INITIAL_SUPPLIER_LEDGER,
} from '../data/seedData';
import { getPermissions, RolePermissions } from '../utils/permissions';

const STORAGE_KEY = 'ply_woods_pos_state_v1';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info' | 'warning';
}

interface PersistedState {
  currentUserId: string;
  activeLocationId: LocationId;
  products: ProductVariant[];
  offcuts: OffcutItem[];
  stockMovements: StockMovement[];
  customers: Customer[];
  customerLedger: CustomerLedgerEntry[];
  suppliers: Supplier[];
  supplierLedger: SupplierLedgerEntry[];
  sales: Sale[];
  heldCarts: HeldCart[];
  quotations: Quotation[];
  purchases: PurchaseOrder[];
  expenses: Expense[];
  accounts: Account[];
  accountTransactions: AccountTransaction[];
  cashSessions: CashSession[];
  auditLogs: AuditLog[];
  settings: BusinessSettings;
}

function getDefaultState(): PersistedState {
  return {
    currentUserId: INITIAL_STAFF[0].id,
    activeLocationId: 'loc-shop',
    products: INITIAL_PRODUCTS,
    offcuts: INITIAL_OFFCUTS,
    stockMovements: INITIAL_STOCK_MOVEMENTS,
    customers: INITIAL_CUSTOMERS,
    customerLedger: INITIAL_CUSTOMER_LEDGER,
    suppliers: INITIAL_SUPPLIERS,
    supplierLedger: INITIAL_SUPPLIER_LEDGER,
    sales: INITIAL_SALES,
    heldCarts: INITIAL_HELD_CARTS,
    quotations: INITIAL_QUOTATIONS,
    purchases: INITIAL_PURCHASES,
    expenses: INITIAL_EXPENSES,
    accounts: INITIAL_ACCOUNTS,
    accountTransactions: INITIAL_ACCOUNT_TRANSACTIONS,
    cashSessions: INITIAL_CASH_SESSIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    settings: INITIAL_SETTINGS,
  };
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return { ...getDefaultState(), ...parsed };
  } catch {
    return getDefaultState();
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface CompleteSaleInput {
  customerId: string;
  locationId: LocationId;
  priceTier: 'retail' | 'wholesale';
  items: CartItem[];
  discountAmount: number;
  cuttingCharge: number;
  deliveryCharge: number;
  deliveryVehicle?: Sale['deliveryVehicle'];
  taxEnabled: boolean;
  taxRate: number;
  payments: { method: PaymentMethod; amount: number; referenceNo?: string }[];
  notes?: string;
}

interface PosContextValue {
  state: PersistedState;
  locations: Location[];
  staffUsers: StaffUser[];
  currentUser: StaffUser;
  permissions: RolePermissions;
  isOffline: boolean;
  toasts: ToastMessage[];
  activeCartRestore: HeldCart | null;
  clearActiveCartRestore: () => void;
  notify: (title: string, description?: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id: string) => void;
  switchUserByRole: (role: RoleId) => void;
  setActiveLocation: (locId: LocationId) => void;
  toggleOfflineMode: () => void;
  syncOfflineSales: () => void;
  // Products & Inventory
  addProduct: (product: Omit<ProductVariant, 'id' | 'productId' | 'createdAt' | 'perSqFtPrice' | 'sqftPerUnit'>) => void;
  updateProduct: (id: string, patch: Partial<ProductVariant>) => void;
  importProductsCSV: (products: Omit<ProductVariant, 'id' | 'productId' | 'createdAt' | 'perSqFtPrice' | 'sqftPerUnit'>[]) => void;
  transferStock: (variantId: string, fromLoc: LocationId, toLoc: LocationId, qty: number, notes: string) => boolean;
  adjustStock: (variantId: string, locationId: LocationId, delta: number, reason: string) => boolean;
  addOffcut: (offcut: Omit<OffcutItem, 'id' | 'areaSqFt' | 'createdAt'>) => void;
  deleteOffcut: (id: string) => void;
  // POS, Sales, Quotations & Held
  completeSale: (input: CompleteSaleInput) => Sale;
  returnSale: (saleId: string, reason: string, refundMode: 'cash' | 'credit_note') => boolean;
  holdCart: (cart: Omit<HeldCart, 'id' | 'heldAt'>) => void;
  resumeHeldCart: (heldId: string) => HeldCart | undefined;
  deleteHeldCart: (heldId: string) => void;
  saveQuotation: (input: Omit<CompleteSaleInput, 'payments'>) => Quotation;
  convertQuotationToSale: (quotationId: string, payments: { method: PaymentMethod; amount: number }[]) => Sale | null;
  // Customers
  addCustomer: (c: Omit<Customer, 'id' | 'currentBalance' | 'createdAt'>) => Customer;
  receiveCustomerPayment: (
    customerId: string,
    amount: number,
    method: Exclude<PaymentMethod, 'credit'>,
    notes: string,
    invoiceNo?: string
  ) => void;
  // Suppliers & Purchases
  addSupplier: (s: Omit<Supplier, 'id' | 'currentBalance' | 'createdAt'>) => Supplier;
  paySupplier: (supplierId: string, amount: number, accountId: string, notes: string) => void;
  createPurchaseOrder: (input: {
    supplierId: string;
    locationId: LocationId;
    items: { variantId: string; orderedQty: number; unitCost: number }[];
    freightCost: number;
    unloadingCost: number;
  }) => void;
  receivePurchaseGRN: (
    poId: string,
    receivedItems: { variantId: string; qty: number }[],
    extraLandedCost: number
  ) => void;
  // Expenses, Cash & Accounts
  addExpense: (input: { category: ExpenseCategory; accountId: string; amount: number; description: string; date: string }) => void;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, description: string) => void;
  openCashSession: (openingCash: number) => void;
  recordCashDrawerAdjustment: (type: 'in' | 'out', amount: number, reason: string) => void;
  closeCashSession: (countedCash: number) => void;
  // Settings & Data
  updateSettings: (patch: Partial<BusinessSettings>) => void;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonStr: string) => boolean;
  resetDemoData: () => void;
}

const PosContext = createContext<PosContextValue | null>(null);

function methodToAccountId(method: PaymentMethod): string | undefined {
  if (method === 'cash') return 'acc-cash';
  if (method === 'bank' || method === 'cheque') return 'acc-hbl';
  if (method === 'jazzcash') return 'acc-jc';
  if (method === 'easypaisa') return 'acc-ep';
  return undefined;
}

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedState>(loadState);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeCartRestore, setActiveCartRestore] = useState<HeldCart | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  useEffect(() => {
    if (state.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.settings.darkMode]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const currentUser =
    INITIAL_STAFF.find((u) => u.id === state.currentUserId) || INITIAL_STAFF[0];
  const permissions = getPermissions(currentUser.role);

  const notify = useCallback(
    (title: string, description?: string, variant: ToastMessage['variant'] = 'success') => {
      const id = uid('toast');
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const makeAudit = useCallback(
    (module: string, action: string, details: string): AuditLog => ({
      id: uid('aud'),
      userName: currentUser.name,
      role: currentUser.role,
      module,
      action,
      details,
      createdAt: new Date().toISOString(),
    }),
    [currentUser]
  );

  const switchUserByRole = useCallback(
    (role: RoleId) => {
      const found = INITIAL_STAFF.find((u) => u.role === role);
      if (found) {
        setState((prev) => ({ ...prev, currentUserId: found.id }));
        notify(`Switched role to ${getPermissions(role).label}`, `Logged in as ${found.name}`, 'info');
      }
    },
    [notify]
  );

  const setActiveLocation = useCallback((locId: LocationId) => {
    setState((prev) => ({ ...prev, activeLocationId: locId }));
  }, []);

  const toggleOfflineMode = useCallback(() => {
    setIsOffline((prev) => {
      const next = !prev;
      notify(
        next ? 'Offline Mode Active' : 'Back Online',
        next
          ? 'POS sales will queue locally and sync automatically when reconnected.'
          : 'Connection restored. You can sync queued invoices.',
        next ? 'warning' : 'success'
      );
      return next;
    });
  }, [notify]);

  const syncOfflineSales = useCallback(() => {
    const unsyncedCount = state.sales.filter((s) => !s.synced).length;
    if (unsyncedCount === 0) {
      notify('All sales are already synced', undefined, 'info');
      return;
    }
    setState((prev) => ({
      ...prev,
      sales: prev.sales.map((s) => (s.synced ? s : { ...s, synced: true })),
      auditLogs: [
        makeAudit('Sync', 'Offline Queue Synced', `Synced ${unsyncedCount} queued offline sale(s)`),
        ...prev.auditLogs,
      ],
    }));
    notify(`Synced ${unsyncedCount} offline sale(s)`, 'Inventory and ledgers are up to date.', 'success');
  }, [state.sales, makeAudit, notify]);

  // ---------------- PRODUCTS & INVENTORY ----------------
  const addProduct: PosContextValue['addProduct'] = useCallback(
    (input) => {
      const sqftPerUnit =
        input.lengthFt > 0 && input.widthFt > 0
          ? Number((input.lengthFt * input.widthFt).toFixed(2))
          : 1;
      const perSqFtPrice =
        input.unit === 'sheet' && sqftPerUnit > 0
          ? Math.round(input.retailPrice / sqftPerUnit)
          : input.retailPrice;

      const newProd: ProductVariant = {
        ...input,
        id: uid('var'),
        productId: uid('prod'),
        sqftPerUnit,
        perSqFtPrice,
        createdAt: new Date().toISOString(),
      };

      const initialMovements: StockMovement[] = [];
      (['loc-shop', 'loc-godown'] as LocationId[]).forEach((locId) => {
        if (newProd.stock[locId] > 0) {
          initialMovements.push({
            id: uid('sm'),
            variantId: newProd.id,
            variantName: newProd.name,
            locationId: locId,
            type: 'opening',
            quantityDelta: newProd.stock[locId],
            unitCost: newProd.purchaseCost,
            referenceNo: 'OPENING',
            reason: 'Initial product opening stock',
            createdBy: currentUser.name,
            createdAt: new Date().toISOString(),
          });
        }
      });

      setState((prev) => ({
        ...prev,
        products: [newProd, ...prev.products],
        stockMovements: [...initialMovements, ...prev.stockMovements],
        auditLogs: [
          makeAudit('Products', 'Product Created', `${newProd.name} (${newProd.sku})`),
          ...prev.auditLogs,
        ],
      }));
      notify('Product added', `${newProd.name} is now available in POS.`);
    },
    [currentUser.name, makeAudit, notify]
  );

  const updateProduct: PosContextValue['updateProduct'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          if (p.id !== id) return p;
          const merged = { ...p, ...patch };
          const sqftPerUnit =
            merged.lengthFt > 0 && merged.widthFt > 0
              ? Number((merged.lengthFt * merged.widthFt).toFixed(2))
              : 1;
          const perSqFtPrice =
            merged.unit === 'sheet' && sqftPerUnit > 0
              ? Math.round(merged.retailPrice / sqftPerUnit)
              : merged.retailPrice;
          return { ...merged, sqftPerUnit, perSqFtPrice };
        }),
        auditLogs: [
          makeAudit('Products', 'Product Updated', `Updated variant ${id}`),
          ...prev.auditLogs,
        ],
      }));
      notify('Product updated');
    },
    [makeAudit, notify]
  );

  const importProductsCSV: PosContextValue['importProductsCSV'] = useCallback(
    (items) => {
      const now = new Date().toISOString();
      const created: ProductVariant[] = items.map((input) => {
        const sqftPerUnit =
          input.lengthFt > 0 && input.widthFt > 0
            ? Number((input.lengthFt * input.widthFt).toFixed(2))
            : 1;
        return {
          ...input,
          id: uid('var'),
          productId: uid('prod'),
          sqftPerUnit,
          perSqFtPrice:
            input.unit === 'sheet' && sqftPerUnit > 0
              ? Math.round(input.retailPrice / sqftPerUnit)
              : input.retailPrice,
          createdAt: now,
        };
      });
      setState((prev) => ({
        ...prev,
        products: [...created, ...prev.products],
        auditLogs: [
          makeAudit('Products', 'Bulk CSV Import', `Imported ${created.length} products`),
          ...prev.auditLogs,
        ],
      }));
      notify(`Imported ${created.length} products from CSV`);
    },
    [makeAudit, notify]
  );

  const transferStock: PosContextValue['transferStock'] = useCallback(
    (variantId, fromLoc, toLoc, qty, notes) => {
      if (fromLoc === toLoc || qty <= 0) return false;
      const prod = state.products.find((p) => p.id === variantId);
      if (!prod || prod.stock[fromLoc] < qty) {
        notify('Insufficient stock at source location', undefined, 'error');
        return false;
      }
      const refNo = `TRF-${Math.floor(100 + Math.random() * 900)}`;
      const now = new Date().toISOString();
      const mvOut: StockMovement = {
        id: uid('sm'),
        variantId,
        variantName: prod.name,
        locationId: fromLoc,
        type: 'transfer_out',
        quantityDelta: -qty,
        referenceNo: refNo,
        reason: notes || `Transferred to ${toLoc === 'loc-shop' ? 'Main Shop' : 'Godown'}`,
        createdBy: currentUser.name,
        createdAt: now,
      };
      const mvIn: StockMovement = {
        id: uid('sm'),
        variantId,
        variantName: prod.name,
        locationId: toLoc,
        type: 'transfer_in',
        quantityDelta: qty,
        referenceNo: refNo,
        reason: notes || `Received from ${fromLoc === 'loc-shop' ? 'Main Shop' : 'Godown'}`,
        createdBy: currentUser.name,
        createdAt: now,
      };

      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === variantId
            ? {
                ...p,
                stock: {
                  ...p.stock,
                  [fromLoc]: p.stock[fromLoc] - qty,
                  [toLoc]: p.stock[toLoc] + qty,
                },
              }
            : p
        ),
        stockMovements: [mvIn, mvOut, ...prev.stockMovements],
        auditLogs: [
          makeAudit(
            'Inventory',
            'Stock Transfer',
            `${refNo}: Moved ${qty} × ${prod.name} (${fromLoc === 'loc-shop' ? 'Shop → Godown' : 'Godown → Shop'})`
          ),
          ...prev.auditLogs,
        ],
      }));
      notify('Stock transferred', `${qty} units moved (${refNo})`);
      return true;
    },
    [state.products, currentUser.name, makeAudit, notify]
  );

  const adjustStock: PosContextValue['adjustStock'] = useCallback(
    (variantId, locationId, delta, reason) => {
      if (!permissions.canAdjustStock) {
        notify('Permission denied', 'Your role cannot adjust stock.', 'error');
        return false;
      }
      const prod = state.products.find((p) => p.id === variantId);
      if (!prod || delta === 0) return false;
      if (prod.stock[locationId] + delta < 0) {
        notify('Stock cannot go negative', undefined, 'error');
        return false;
      }
      const refNo = `ADJ-${Math.floor(100 + Math.random() * 900)}`;
      const mv: StockMovement = {
        id: uid('sm'),
        variantId,
        variantName: prod.name,
        locationId,
        type: 'adjustment',
        quantityDelta: delta,
        referenceNo: refNo,
        reason: reason || 'Manual stock correction',
        createdBy: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === variantId
            ? { ...p, stock: { ...p.stock, [locationId]: p.stock[locationId] + delta } }
            : p
        ),
        stockMovements: [mv, ...prev.stockMovements],
        auditLogs: [
          makeAudit('Inventory', 'Stock Adjustment', `${prod.name} (${delta > 0 ? '+' : ''}${delta}): ${reason}`),
          ...prev.auditLogs,
        ],
      }));
      notify('Stock adjusted', `${prod.name} updated by ${delta > 0 ? '+' : ''}${delta}`);
      return true;
    },
    [permissions.canAdjustStock, state.products, currentUser.name, makeAudit, notify]
  );

  const addOffcut: PosContextValue['addOffcut'] = useCallback(
    (offcut) => {
      const areaSqFt = Number((offcut.lengthFt * offcut.widthFt).toFixed(2));
      const created: OffcutItem = {
        ...offcut,
        id: uid('off'),
        areaSqFt,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        offcuts: [created, ...prev.offcuts],
        auditLogs: [
          makeAudit(
            'Inventory',
            'Offcut Added',
            `${created.productName} ${created.lengthFt}×${created.widthFt}ft (qty ${created.quantity})`
          ),
          ...prev.auditLogs,
        ],
      }));
      notify('Offcut added to remnant stock');
    },
    [makeAudit, notify]
  );

  const deleteOffcut = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        offcuts: prev.offcuts.filter((o) => o.id !== id),
      }));
      notify('Offcut removed', undefined, 'info');
    },
    [notify]
  );

  // ---------------- SALES TRANSACTION ENGINE ----------------
  const completeSale: PosContextValue['completeSale'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const invoiceNo = `${state.settings.invoicePrefix}${state.settings.nextInvoiceNumber}`;
      const customer =
        state.customers.find((c) => c.id === input.customerId) || state.customers[0];

      const subtotal = input.items.reduce(
        (sum, it) => sum + it.quantity * it.unitPrice - it.lineDiscount,
        0
      );
      const taxableBase = Math.max(0, subtotal - input.discountAmount);
      const taxAmount = input.taxEnabled ? Math.round((taxableBase * input.taxRate) / 100) : 0;
      const grandTotal = Math.max(
        0,
        taxableBase + input.cuttingCharge + input.deliveryCharge + taxAmount
      );

      const salePayments: SalePayment[] = input.payments
        .filter((p) => p.amount > 0)
        .map((p) => ({
          id: uid('sp'),
          method: p.method,
          amount: p.amount,
          accountId: methodToAccountId(p.method),
          referenceNo: p.referenceNo,
          createdAt: now,
        }));

      const paidAmount = salePayments
        .filter((p) => p.method !== 'credit')
        .reduce((sum, p) => sum + p.amount, 0);
      const dueAmount = Math.max(0, grandTotal - paidAmount);

      const status: Sale['status'] =
        dueAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

      const newSale: Sale = {
        id: uid('sale'),
        invoiceNo,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        locationId: input.locationId,
        priceTier: input.priceTier,
        items: input.items,
        subtotal,
        discountAmount: input.discountAmount,
        cuttingCharge: input.cuttingCharge,
        deliveryCharge: input.deliveryCharge,
        deliveryVehicle: input.deliveryVehicle || 'None',
        taxEnabled: input.taxEnabled,
        taxRate: input.taxRate,
        taxAmount,
        grandTotal,
        paidAmount,
        dueAmount,
        payments: salePayments,
        status,
        notes: input.notes,
        createdBy: currentUser.name,
        createdAt: now,
        synced: !isOffline,
      };

      setState((prev) => {
        // 1. Deduct stock through stockMovements & create offcuts for custom cuts
        const newMovements: StockMovement[] = [];
        const newOffcuts: OffcutItem[] = [];
        const productDeltas: Record<string, number> = {};
        const offcutDeltas: Record<string, number> = {};

        input.items.forEach((it) => {
          if (it.offcutId) {
            offcutDeltas[it.offcutId] = (offcutDeltas[it.offcutId] || 0) + it.quantity;
          } else if (it.variantId) {
            const prod = prev.products.find((p) => p.id === it.variantId);
            let stockToDeduct = it.quantity;
            let reason = `POS Sale ${invoiceNo}`;
            if (it.customCut) {
              stockToDeduct = it.customCut.sheetsConsumed;
              reason = `Custom cut ${it.customCut.cutLengthFt}×${it.customCut.cutWidthFt}ft (×${it.customCut.pieceCount}) on ${invoiceNo}`;
              if (it.customCut.createOffcut && prod) {
                newOffcuts.push({
                  id: uid('off'),
                  variantId: prod.id,
                  productName: prod.name,
                  category: prod.category,
                  thicknessMm: prod.thicknessMm,
                  locationId: input.locationId,
                  lengthFt: it.customCut.offcutLengthFt,
                  widthFt: it.customCut.offcutWidthFt,
                  areaSqFt: Number(
                    (it.customCut.offcutLengthFt * it.customCut.offcutWidthFt).toFixed(2)
                  ),
                  quantity: 1,
                  discountedPrice: it.customCut.offcutPrice,
                  sourceInvoiceNo: invoiceNo,
                  notes: `Leftover from ${it.customCut.cutLengthFt}×${it.customCut.cutWidthFt}ft cut`,
                  createdAt: now,
                });
              }
            } else if (it.unit === 'sqft' && prod && prod.unit === 'sheet' && prod.sqftPerUnit > 0) {
              stockToDeduct = Number((it.quantity / prod.sqftPerUnit).toFixed(2));
            }
            productDeltas[it.variantId] = (productDeltas[it.variantId] || 0) + stockToDeduct;
            newMovements.push({
              id: uid('sm'),
              variantId: it.variantId,
              variantName: it.name,
              locationId: input.locationId,
              type: 'sale',
              quantityDelta: -stockToDeduct,
              unitCost: it.unitCost,
              referenceNo: invoiceNo,
              reason,
              createdBy: currentUser.name,
              createdAt: now,
            });
          }
        });

        const updatedProducts = prev.products.map((p) =>
          productDeltas[p.id]
            ? {
                ...p,
                stock: {
                  ...p.stock,
                  [input.locationId]: Math.max(
                    0,
                    Number((p.stock[input.locationId] - productDeltas[p.id]).toFixed(2))
                  ),
                },
              }
            : p
        );

        const updatedOffcuts = [
          ...newOffcuts,
          ...prev.offcuts
            .map((o) =>
              offcutDeltas[o.id] ? { ...o, quantity: o.quantity - offcutDeltas[o.id] } : o
            )
            .filter((o) => o.quantity > 0),
        ];

        // 2. Customer Udhaar ledger update if due > 0
        let updatedCustomers = prev.customers;
        let updatedCustLedger = prev.customerLedger;
        if (dueAmount > 0 && customer.id !== 'cust-walkin') {
          const newBal = customer.currentBalance + dueAmount;
          updatedCustomers = prev.customers.map((c) =>
            c.id === customer.id ? { ...c, currentBalance: newBal } : c
          );
          updatedCustLedger = [
            {
              id: uid('cl'),
              customerId: customer.id,
              type: 'invoice',
              referenceNo: invoiceNo,
              debit: dueAmount,
              credit: 0,
              runningBalance: newBal,
              notes:
                paidAmount > 0
                  ? `Partial sale (${invoiceNo}) — Paid Rs. ${paidAmount.toLocaleString()}, Udhaar Rs. ${dueAmount.toLocaleString()}`
                  : `Credit sale (${invoiceNo})`,
              createdAt: now,
            },
            ...prev.customerLedger,
          ];
        }

        // 3. Accounts & Cash Session update
        const accountAdds: Record<string, number> = {};
        const newAccTxs: AccountTransaction[] = [];
        let cashPaidNow = 0;

        salePayments.forEach((sp) => {
          if (sp.accountId && sp.method !== 'credit') {
            accountAdds[sp.accountId] = (accountAdds[sp.accountId] || 0) + sp.amount;
            const accName = prev.accounts.find((a) => a.id === sp.accountId)?.name || sp.method;
            newAccTxs.push({
              id: uid('at'),
              accountId: sp.accountId,
              accountName: accName,
              type: 'in',
              amount: sp.amount,
              referenceNo: invoiceNo,
              description: `POS Sale ${invoiceNo} (${sp.method})`,
              createdAt: now,
            });
            if (sp.method === 'cash') cashPaidNow += sp.amount;
          }
        });

        const updatedAccounts = prev.accounts.map((a) =>
          accountAdds[a.id] ? { ...a, balance: a.balance + accountAdds[a.id] } : a
        );

        const updatedCashSessions = prev.cashSessions.map((cs) => {
          if (cs.status !== 'open' || cashPaidNow === 0) return cs;
          const cashSales = cs.cashSales + cashPaidNow;
          return {
            ...cs,
            cashSales,
            expectedCash: cs.expectedCash + cashPaidNow,
          };
        });

        return {
          ...prev,
          products: updatedProducts,
          offcuts: updatedOffcuts,
          stockMovements: [...newMovements, ...prev.stockMovements],
          customers: updatedCustomers,
          customerLedger: updatedCustLedger,
          accounts: updatedAccounts,
          accountTransactions: [...newAccTxs, ...prev.accountTransactions],
          cashSessions: updatedCashSessions,
          sales: [newSale, ...prev.sales],
          settings: {
            ...prev.settings,
            nextInvoiceNumber: prev.settings.nextInvoiceNumber + 1,
          },
          auditLogs: [
            makeAudit(
              'POS',
              isOffline ? 'Offline Sale Queued' : 'Sale Completed',
              `${invoiceNo} — ${customer.name} — Rs. ${grandTotal.toLocaleString()} (${status})`
            ),
            ...prev.auditLogs,
          ],
        };
      });

      notify(
        isOffline ? `Invoice ${invoiceNo} queued offline` : `Invoice ${invoiceNo} completed`,
        dueAmount > 0
          ? `Paid Rs. ${paidAmount.toLocaleString()} | Udhaar Rs. ${dueAmount.toLocaleString()}`
          : `Total Rs. ${grandTotal.toLocaleString()} paid in full`,
        isOffline ? 'warning' : 'success'
      );

      return newSale;
    },
    [state.settings, state.customers, currentUser.name, isOffline, makeAudit, notify]
  );

  const returnSale: PosContextValue['returnSale'] = useCallback(
    (saleId, reason, refundMode) => {
      if (!permissions.canDeleteOrReturnSales) {
        notify('Permission denied', 'Only Owner/Manager can process returns.', 'error');
        return false;
      }
      const sale = state.sales.find((s) => s.id === saleId);
      if (!sale || sale.status === 'returned' || sale.status === 'void') return false;

      const now = new Date().toISOString();
      const returnNo = `RET-${sale.invoiceNo}`;

      setState((prev) => {
        // 1. Reverse stock via stock_movements
        const revMovements: StockMovement[] = [];
        const productAdds: Record<string, number> = {};

        sale.items.forEach((it) => {
          if (it.variantId) {
            const prod = prev.products.find((p) => p.id === it.variantId);
            let qtyToRestore = it.quantity;
            if (it.customCut) {
              qtyToRestore = it.customCut.sheetsConsumed;
            } else if (it.unit === 'sqft' && prod && prod.unit === 'sheet' && prod.sqftPerUnit > 0) {
              qtyToRestore = Number((it.quantity / prod.sqftPerUnit).toFixed(2));
            }
            productAdds[it.variantId] = (productAdds[it.variantId] || 0) + qtyToRestore;
            revMovements.push({
              id: uid('sm'),
              variantId: it.variantId,
              variantName: it.name,
              locationId: sale.locationId,
              type: 'sale_return',
              quantityDelta: qtyToRestore,
              referenceNo: returnNo,
              reason: `Sale Return (${sale.invoiceNo}): ${reason}`,
              createdBy: currentUser.name,
              createdAt: now,
            });
          }
        });

        const updatedProducts = prev.products.map((p) =>
          productAdds[p.id]
            ? {
                ...p,
                stock: {
                  ...p.stock,
                  [sale.locationId]: Number((p.stock[sale.locationId] + productAdds[p.id]).toFixed(2)),
                },
              }
            : p
        );

        // 2. Reverse customer Udhaar / issue credit note
        let updatedCustomers = prev.customers;
        let updatedCustLedger = prev.customerLedger;
        const cust = prev.customers.find((c) => c.id === sale.customerId);
        if (cust && cust.id !== 'cust-walkin') {
          const creditAmount = refundMode === 'credit_note' ? sale.grandTotal : sale.dueAmount;
          if (creditAmount > 0) {
            const newBal = cust.currentBalance - creditAmount;
            updatedCustomers = prev.customers.map((c) =>
              c.id === cust.id ? { ...c, currentBalance: newBal } : c
            );
            updatedCustLedger = [
              {
                id: uid('cl'),
                customerId: cust.id,
                type: refundMode === 'credit_note' ? 'credit_note' : 'return',
                referenceNo: returnNo,
                debit: 0,
                credit: creditAmount,
                runningBalance: newBal,
                notes: `Return of ${sale.invoiceNo}: ${reason}`,
                createdAt: now,
              },
              ...prev.customerLedger,
            ];
          }
        }

        // 3. Cash refund deducts from Shop Cash Drawer & active CashSession
        let updatedAccounts = prev.accounts;
        let updatedAccTxs = prev.accountTransactions;
        let updatedCashSessions = prev.cashSessions;
        const cashRefundAmt = refundMode === 'cash' ? sale.paidAmount : 0;

        if (cashRefundAmt > 0) {
          updatedAccounts = prev.accounts.map((a) =>
            a.id === 'acc-cash' ? { ...a, balance: a.balance - cashRefundAmt } : a
          );
          updatedAccTxs = [
            {
              id: uid('at'),
              accountId: 'acc-cash',
              accountName: 'Shop Cash Drawer',
              type: 'out',
              amount: cashRefundAmt,
              referenceNo: returnNo,
              description: `Cash refund for ${sale.invoiceNo}`,
              createdAt: now,
            },
            ...prev.accountTransactions,
          ];
          updatedCashSessions = prev.cashSessions.map((cs) =>
            cs.status === 'open'
              ? {
                  ...cs,
                  cashRefunds: cs.cashRefunds + cashRefundAmt,
                  expectedCash: cs.expectedCash - cashRefundAmt,
                }
              : cs
          );
        }

        return {
          ...prev,
          products: updatedProducts,
          stockMovements: [...revMovements, ...prev.stockMovements],
          customers: updatedCustomers,
          customerLedger: updatedCustLedger,
          accounts: updatedAccounts,
          accountTransactions: updatedAccTxs,
          cashSessions: updatedCashSessions,
          sales: prev.sales.map((s) =>
            s.id === saleId
              ? { ...s, status: 'returned', returnedAt: now, returnReason: reason, dueAmount: 0 }
              : s
          ),
          auditLogs: [
            makeAudit(
              'Sales',
              'Sale Returned',
              `${sale.invoiceNo} returned (${refundMode}): stock & ledger reversed. Reason: ${reason}`
            ),
            ...prev.auditLogs,
          ],
        };
      });

      notify(`Sale ${sale.invoiceNo} returned`, 'Stock and customer ledger have been reversed.', 'info');
      return true;
    },
    [permissions.canDeleteOrReturnSales, state.sales, currentUser.name, makeAudit, notify]
  );

  const holdCart: PosContextValue['holdCart'] = useCallback(
    (cart) => {
      const held: HeldCart = {
        ...cart,
        id: uid('held'),
        heldAt: new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, heldCarts: [held, ...prev.heldCarts] }));
      notify('Bill held', `"${held.label}" saved to Held Bills.`, 'info');
    },
    [notify]
  );

  const resumeHeldCart = useCallback(
    (heldId: string) => {
      const found = state.heldCarts.find((h) => h.id === heldId);
      if (found) {
        setState((prev) => ({
          ...prev,
          heldCarts: prev.heldCarts.filter((h) => h.id !== heldId),
        }));
        setActiveCartRestore(found);
        notify('Held bill resumed in POS', found.label, 'info');
      }
      return found;
    },
    [state.heldCarts, notify]
  );

  const deleteHeldCart = useCallback((heldId: string) => {
    setState((prev) => ({
      ...prev,
      heldCarts: prev.heldCarts.filter((h) => h.id !== heldId),
    }));
  }, []);

  const saveQuotation: PosContextValue['saveQuotation'] = useCallback(
    (input) => {
      const customer =
        state.customers.find((c) => c.id === input.customerId) || state.customers[0];
      const subtotal = input.items.reduce(
        (sum, it) => sum + it.quantity * it.unitPrice - it.lineDiscount,
        0
      );
      const taxableBase = Math.max(0, subtotal - input.discountAmount);
      const taxAmount = input.taxEnabled ? Math.round((taxableBase * input.taxRate) / 100) : 0;
      const grandTotal = taxableBase + input.cuttingCharge + input.deliveryCharge + taxAmount;
      const quote: Quotation = {
        id: uid('qt'),
        quoteNo: `QT-${501 + state.quotations.length}`,
        customerId: customer.id,
        customerName: customer.name,
        locationId: input.locationId,
        priceTier: input.priceTier,
        items: input.items,
        subtotal,
        discountAmount: input.discountAmount,
        cuttingCharge: input.cuttingCharge,
        deliveryCharge: input.deliveryCharge,
        taxAmount,
        grandTotal,
        notes: input.notes,
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        quotations: [quote, ...prev.quotations],
        auditLogs: [
          makeAudit('Quotations', 'Quotation Created', `${quote.quoteNo} for ${customer.name}`),
          ...prev.auditLogs,
        ],
      }));
      notify(`Quotation ${quote.quoteNo} saved`, 'Convert to invoice anytime from Sales > Quotations.');
      return quote;
    },
    [state.customers, state.quotations.length, makeAudit, notify]
  );

  const convertQuotationToSale: PosContextValue['convertQuotationToSale'] = useCallback(
    (quotationId, payments) => {
      const qt = state.quotations.find((q) => q.id === quotationId);
      if (!qt || qt.status !== 'open') return null;
      const sale = completeSale({
        customerId: qt.customerId,
        locationId: qt.locationId,
        priceTier: qt.priceTier,
        items: qt.items,
        discountAmount: qt.discountAmount,
        cuttingCharge: qt.cuttingCharge,
        deliveryCharge: qt.deliveryCharge,
        taxEnabled: qt.taxAmount > 0,
        taxRate: state.settings.gstRate,
        payments,
        notes: `Converted from ${qt.quoteNo}`,
      });
      setState((prev) => ({
        ...prev,
        quotations: prev.quotations.map((q) =>
          q.id === quotationId
            ? { ...q, status: 'converted', convertedInvoiceNo: sale.invoiceNo }
            : q
        ),
      }));
      return sale;
    },
    [state.quotations, state.settings.gstRate, completeSale]
  );

  // ---------------- CUSTOMERS ----------------
  const addCustomer: PosContextValue['addCustomer'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const created: Customer = {
        ...input,
        id: uid('cust'),
        currentBalance: input.openingBalance,
        createdAt: now,
      };
      setState((prev) => ({
        ...prev,
        customers: [created, ...prev.customers],
        customerLedger:
          created.openingBalance > 0
            ? [
                {
                  id: uid('cl'),
                  customerId: created.id,
                  type: 'opening',
                  referenceNo: 'OPENING',
                  debit: created.openingBalance,
                  credit: 0,
                  runningBalance: created.openingBalance,
                  notes: 'Opening balance',
                  createdAt: now,
                },
                ...prev.customerLedger,
              ]
            : prev.customerLedger,
        auditLogs: [
          makeAudit('Customers', 'Customer Added', `${created.name} (${created.type})`),
          ...prev.auditLogs,
        ],
      }));
      notify('Customer added', created.name);
      return created;
    },
    [makeAudit, notify]
  );

  const receiveCustomerPayment: PosContextValue['receiveCustomerPayment'] = useCallback(
    (customerId, amount, method, notes, invoiceNo) => {
      if (amount <= 0) return;
      const cust = state.customers.find((c) => c.id === customerId);
      if (!cust) return;
      const now = new Date().toISOString();
      const rcpNo = `RCP-${Math.floor(410 + Math.random() * 580)}`;
      const accId = methodToAccountId(method) || 'acc-cash';

      setState((prev) => {
        const newBal = cust.currentBalance - amount;
        const accName = prev.accounts.find((a) => a.id === accId)?.name || method;

        return {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === customerId ? { ...c, currentBalance: newBal } : c
          ),
          customerLedger: [
            {
              id: uid('cl'),
              customerId,
              type: 'payment',
              referenceNo: invoiceNo ? `${rcpNo} (${invoiceNo})` : rcpNo,
              debit: 0,
              credit: amount,
              runningBalance: newBal,
              paymentMethod: method,
              notes: notes || `Payment received via ${method}`,
              createdAt: now,
            },
            ...prev.customerLedger,
          ],
          sales: invoiceNo
            ? prev.sales.map((s) => {
                if (s.invoiceNo !== invoiceNo) return s;
                const newPaid = s.paidAmount + amount;
                const newDue = Math.max(0, s.grandTotal - newPaid);
                return {
                  ...s,
                  paidAmount: newPaid,
                  dueAmount: newDue,
                  status: newDue === 0 ? 'paid' : 'partial',
                };
              })
            : prev.sales,
          accounts: prev.accounts.map((a) =>
            a.id === accId ? { ...a, balance: a.balance + amount } : a
          ),
          accountTransactions: [
            {
              id: uid('at'),
              accountId: accId,
              accountName: accName,
              type: 'in',
              amount,
              referenceNo: rcpNo,
              description: `Udhaar recovery from ${cust.name}`,
              createdAt: now,
            },
            ...prev.accountTransactions,
          ],
          cashSessions:
            method === 'cash'
              ? prev.cashSessions.map((cs) =>
                  cs.status === 'open'
                    ? {
                        ...cs,
                        cashPaymentsReceived: cs.cashPaymentsReceived + amount,
                        expectedCash: cs.expectedCash + amount,
                      }
                    : cs
                )
              : prev.cashSessions,
          auditLogs: [
            makeAudit(
              'Customers',
              'Payment Received',
              `${rcpNo}: Rs. ${amount.toLocaleString()} from ${cust.name} (${method})`
            ),
            ...prev.auditLogs,
          ],
        };
      });
      notify('Payment recorded', `Rs. ${amount.toLocaleString()} received from ${cust.name}`);
    },
    [state.customers, makeAudit, notify]
  );

  // ---------------- SUPPLIERS & PURCHASES ----------------
  const addSupplier: PosContextValue['addSupplier'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const created: Supplier = {
        ...input,
        id: uid('sup'),
        currentBalance: input.openingBalance,
        createdAt: now,
      };
      setState((prev) => ({
        ...prev,
        suppliers: [created, ...prev.suppliers],
        supplierLedger:
          created.openingBalance > 0
            ? [
                {
                  id: uid('sl'),
                  supplierId: created.id,
                  type: 'opening',
                  referenceNo: 'OPENING',
                  debit: 0,
                  credit: created.openingBalance,
                  runningBalance: created.openingBalance,
                  notes: 'Opening payable',
                  createdAt: now,
                },
                ...prev.supplierLedger,
              ]
            : prev.supplierLedger,
        auditLogs: [
          makeAudit('Suppliers', 'Supplier Added', created.name),
          ...prev.auditLogs,
        ],
      }));
      notify('Supplier added', created.name);
      return created;
    },
    [makeAudit, notify]
  );

  const paySupplier: PosContextValue['paySupplier'] = useCallback(
    (supplierId, amount, accountId, notes) => {
      if (amount <= 0) return;
      const sup = state.suppliers.find((s) => s.id === supplierId);
      if (!sup) return;
      const now = new Date().toISOString();
      const payNo = `PAY-${Math.floor(910 + Math.random() * 90)}`;
      setState((prev) => {
        const newBal = sup.currentBalance - amount;
        const accName = prev.accounts.find((a) => a.id === accountId)?.name || 'Account';
        return {
          ...prev,
          suppliers: prev.suppliers.map((s) =>
            s.id === supplierId ? { ...s, currentBalance: newBal } : s
          ),
          supplierLedger: [
            {
              id: uid('sl'),
              supplierId,
              type: 'payment',
              referenceNo: payNo,
              debit: amount,
              credit: 0,
              runningBalance: newBal,
              notes: notes || `Paid via ${accName}`,
              createdAt: now,
            },
            ...prev.supplierLedger,
          ],
          accounts: prev.accounts.map((a) =>
            a.id === accountId ? { ...a, balance: a.balance - amount } : a
          ),
          accountTransactions: [
            {
              id: uid('at'),
              accountId,
              accountName: accName,
              type: 'out',
              amount,
              referenceNo: payNo,
              description: `Supplier payment to ${sup.name}`,
              createdAt: now,
            },
            ...prev.accountTransactions,
          ],
          cashSessions:
            accountId === 'acc-cash'
              ? prev.cashSessions.map((cs) =>
                  cs.status === 'open'
                    ? {
                        ...cs,
                        cashOutManual: cs.cashOutManual + amount,
                        expectedCash: cs.expectedCash - amount,
                      }
                    : cs
                )
              : prev.cashSessions,
          auditLogs: [
            makeAudit('Suppliers', 'Supplier Payment', `${payNo}: Rs. ${amount.toLocaleString()} to ${sup.name}`),
            ...prev.auditLogs,
          ],
        };
      });
      notify('Supplier payment recorded', `Rs. ${amount.toLocaleString()} paid to ${sup.name}`);
    },
    [state.suppliers, makeAudit, notify]
  );

  const createPurchaseOrder: PosContextValue['createPurchaseOrder'] = useCallback(
    (input) => {
      const sup = state.suppliers.find((s) => s.id === input.supplierId);
      if (!sup) return;
      const items = input.items.map((it) => {
        const prod = state.products.find((p) => p.id === it.variantId);
        return {
          variantId: it.variantId,
          variantName: prod?.name || it.variantId,
          orderedQty: it.orderedQty,
          receivedQty: 0,
          unitCost: it.unitCost,
        };
      });
      const subtotal = items.reduce((s, i) => s + i.orderedQty * i.unitCost, 0);
      const po: PurchaseOrder = {
        id: uid('po'),
        poNo: `PO-${2001 + state.purchases.length}`,
        supplierId: sup.id,
        supplierName: sup.name,
        locationId: input.locationId,
        status: 'ordered',
        items,
        freightCost: input.freightCost,
        unloadingCost: input.unloadingCost,
        subtotal,
        grandTotal: subtotal + input.freightCost + input.unloadingCost,
        paidAmount: 0,
        grnHistory: [],
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        purchases: [po, ...prev.purchases],
        auditLogs: [
          makeAudit('Purchases', 'PO Created', `${po.poNo} for ${sup.name} — Rs. ${po.grandTotal.toLocaleString()}`),
          ...prev.auditLogs,
        ],
      }));
      notify(`Purchase Order ${po.poNo} created`, 'Receive goods via GRN when stock arrives.');
    },
    [state.suppliers, state.products, state.purchases.length, makeAudit, notify]
  );

  const receivePurchaseGRN: PosContextValue['receivePurchaseGRN'] = useCallback(
    (poId, receivedItems, extraLandedCost) => {
      const po = state.purchases.find((p) => p.id === poId);
      if (!po) return;
      const valid = receivedItems.filter((r) => r.qty > 0);
      if (valid.length === 0) return;

      const totalQtyRecv = valid.reduce((s, r) => s + r.qty, 0);
      const landedPerUnit = totalQtyRecv > 0 ? extraLandedCost / totalQtyRecv : 0;
      const now = new Date().toISOString();
      const grnNo = `GRN-${3001 + state.purchases.reduce((s, p) => s + p.grnHistory.length, 0)}`;

      setState((prev) => {
        const movements: StockMovement[] = [];
        let grnValue = extraLandedCost;

        const updatedProducts = prev.products.map((prod) => {
          const rec = valid.find((r) => r.variantId === prod.id);
          if (!rec) return prod;
          const poItem = po.items.find((i) => i.variantId === prod.id);
          const baseUnitCost = poItem ? poItem.unitCost : prod.purchaseCost;
          const landedUnitCost = Math.round(baseUnitCost + landedPerUnit);
          grnValue += rec.qty * baseUnitCost;

          // Weighted-average cost calculation across all locations
          const existingTotalStock = prod.stock['loc-shop'] + prod.stock['loc-godown'];
          const newWeightedCost =
            existingTotalStock + rec.qty > 0
              ? Math.round(
                  (existingTotalStock * prod.purchaseCost + rec.qty * landedUnitCost) /
                    (existingTotalStock + rec.qty)
                )
              : landedUnitCost;

          movements.push({
            id: uid('sm'),
            variantId: prod.id,
            variantName: prod.name,
            locationId: po.locationId,
            type: 'purchase',
            quantityDelta: rec.qty,
            unitCost: landedUnitCost,
            referenceNo: grnNo,
            reason: `GRN for ${po.poNo} (incl. landed cost)`,
            createdBy: currentUser.name,
            createdAt: now,
          });

          return {
            ...prod,
            purchaseCost: newWeightedCost,
            stock: {
              ...prod.stock,
              [po.locationId]: prod.stock[po.locationId] + rec.qty,
            },
          };
        });

        const updatedPOs = prev.purchases.map((p) => {
          if (p.id !== poId) return p;
          const nextItems = p.items.map((it) => {
            const rec = valid.find((r) => r.variantId === it.variantId);
            return rec ? { ...it, receivedQty: it.receivedQty + rec.qty } : it;
          });
          const allReceived = nextItems.every((i) => i.receivedQty >= i.orderedQty);
          return {
            ...p,
            items: nextItems,
            status: allReceived ? ('received' as const) : ('partial' as const),
            grnHistory: [
              {
                grnNo,
                receivedAt: now,
                extraLandedCost,
                items: valid.map((r) => ({
                  variantId: r.variantId,
                  variantName:
                    p.items.find((i) => i.variantId === r.variantId)?.variantName || r.variantId,
                  qty: r.qty,
                })),
                receivedBy: currentUser.name,
              },
              ...p.grnHistory,
            ],
          };
        });

        const sup = prev.suppliers.find((s) => s.id === po.supplierId);
        const newSupBal = (sup?.currentBalance || 0) + grnValue;

        return {
          ...prev,
          products: updatedProducts,
          stockMovements: [...movements, ...prev.stockMovements],
          purchases: updatedPOs,
          suppliers: prev.suppliers.map((s) =>
            s.id === po.supplierId ? { ...s, currentBalance: newSupBal } : s
          ),
          supplierLedger: [
            {
              id: uid('sl'),
              supplierId: po.supplierId,
              type: 'purchase',
              referenceNo: `${grnNo} (${po.poNo})`,
              debit: 0,
              credit: grnValue,
              runningBalance: newSupBal,
              notes: `Goods received (${totalQtyRecv} units) + freight/unloading`,
              createdAt: now,
            },
            ...prev.supplierLedger,
          ],
          auditLogs: [
            makeAudit(
              'Purchases',
              'GRN Received',
              `${grnNo} for ${po.poNo}: +${totalQtyRecv} units, weighted-avg cost updated`
            ),
            ...prev.auditLogs,
          ],
        };
      });

      notify(`${grnNo} received`, `Stock and weighted-average cost updated for ${totalQtyRecv} units.`);
    },
    [state.purchases, currentUser.name, makeAudit, notify]
  );

  // ---------------- EXPENSES, CASH & ACCOUNTS ----------------
  const addExpense: PosContextValue['addExpense'] = useCallback(
    (input) => {
      if (input.amount <= 0) return;
      const now = new Date().toISOString();
      const acc = state.accounts.find((a) => a.id === input.accountId);
      const expense: Expense = {
        id: uid('exp'),
        category: input.category,
        accountId: input.accountId,
        accountName: acc?.name || 'Account',
        amount: input.amount,
        description: input.description,
        date: input.date,
        createdBy: currentUser.name,
        createdAt: now,
      };
      setState((prev) => ({
        ...prev,
        expenses: [expense, ...prev.expenses],
        accounts: prev.accounts.map((a) =>
          a.id === input.accountId ? { ...a, balance: a.balance - input.amount } : a
        ),
        accountTransactions: [
          {
            id: uid('at'),
            accountId: input.accountId,
            accountName: expense.accountName,
            type: 'out',
            amount: input.amount,
            referenceNo: 'EXP',
            description: `${input.category}: ${input.description}`,
            createdAt: now,
          },
          ...prev.accountTransactions,
        ],
        cashSessions:
          input.accountId === 'acc-cash'
            ? prev.cashSessions.map((cs) =>
                cs.status === 'open'
                  ? {
                      ...cs,
                      cashExpenses: cs.cashExpenses + input.amount,
                      expectedCash: cs.expectedCash - input.amount,
                    }
                  : cs
              )
            : prev.cashSessions,
        auditLogs: [
          makeAudit('Expenses', 'Expense Recorded', `${input.category} — Rs. ${input.amount.toLocaleString()}`),
          ...prev.auditLogs,
        ],
      }));
      notify('Expense recorded', `${input.category}: Rs. ${input.amount.toLocaleString()}`);
    },
    [state.accounts, currentUser.name, makeAudit, notify]
  );

  const transferBetweenAccounts: PosContextValue['transferBetweenAccounts'] = useCallback(
    (fromId, toId, amount, description) => {
      if (fromId === toId || amount <= 0) return;
      const fromAcc = state.accounts.find((a) => a.id === fromId);
      const toAcc = state.accounts.find((a) => a.id === toId);
      if (!fromAcc || !toAcc) return;
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) => {
          if (a.id === fromId) return { ...a, balance: a.balance - amount };
          if (a.id === toId) return { ...a, balance: a.balance + amount };
          return a;
        }),
        accountTransactions: [
          {
            id: uid('at'),
            accountId: toId,
            accountName: toAcc.name,
            type: 'transfer_in',
            amount,
            description: description || `Transfer from ${fromAcc.name}`,
            createdAt: now,
          },
          {
            id: uid('at'),
            accountId: fromId,
            accountName: fromAcc.name,
            type: 'transfer_out',
            amount,
            description: description || `Transfer to ${toAcc.name}`,
            createdAt: now,
          },
          ...prev.accountTransactions,
        ],
        cashSessions: prev.cashSessions.map((cs) => {
          if (cs.status !== 'open') return cs;
          if (fromId === 'acc-cash') {
            return { ...cs, cashOutManual: cs.cashOutManual + amount, expectedCash: cs.expectedCash - amount };
          }
          if (toId === 'acc-cash') {
            return { ...cs, cashInManual: cs.cashInManual + amount, expectedCash: cs.expectedCash + amount };
          }
          return cs;
        }),
        auditLogs: [
          makeAudit('Accounts', 'Account Transfer', `Rs. ${amount.toLocaleString()} (${fromAcc.name} → ${toAcc.name})`),
          ...prev.auditLogs,
        ],
      }));
      notify('Transfer completed', `Rs. ${amount.toLocaleString()} moved to ${toAcc.name}`);
    },
    [state.accounts, makeAudit, notify]
  );

  const openCashSession = useCallback(
    (openingCash: number) => {
      if (state.cashSessions.some((cs) => cs.status === 'open')) {
        notify('A cash session is already open', undefined, 'warning');
        return;
      }
      const session: CashSession = {
        id: uid('cs'),
        locationId: state.activeLocationId,
        openedBy: currentUser.name,
        openingCash,
        cashSales: 0,
        cashPaymentsReceived: 0,
        cashInManual: 0,
        cashOutManual: 0,
        cashExpenses: 0,
        cashRefunds: 0,
        expectedCash: openingCash,
        status: 'open',
        openedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        cashSessions: [session, ...prev.cashSessions],
        auditLogs: [
          makeAudit('Cash Session', 'Opened Shift', `Opening cash Rs. ${openingCash.toLocaleString()}`),
          ...prev.auditLogs,
        ],
      }));
      notify('Cash drawer opened', `Opening float: Rs. ${openingCash.toLocaleString()}`);
    },
    [state.cashSessions, state.activeLocationId, currentUser.name, makeAudit, notify]
  );

  const recordCashDrawerAdjustment = useCallback(
    (type: 'in' | 'out', amount: number, reason: string) => {
      if (amount <= 0) return;
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === 'acc-cash' ? { ...a, balance: a.balance + (type === 'in' ? amount : -amount) } : a
        ),
        accountTransactions: [
          {
            id: uid('at'),
            accountId: 'acc-cash',
            accountName: 'Shop Cash Drawer',
            type,
            amount,
            description: `Cash Drawer ${type.toUpperCase()}: ${reason}`,
            createdAt: now,
          },
          ...prev.accountTransactions,
        ],
        cashSessions: prev.cashSessions.map((cs) => {
          if (cs.status !== 'open') return cs;
          return type === 'in'
            ? { ...cs, cashInManual: cs.cashInManual + amount, expectedCash: cs.expectedCash + amount }
            : { ...cs, cashOutManual: cs.cashOutManual + amount, expectedCash: cs.expectedCash - amount };
        }),
        auditLogs: [
          makeAudit('Cash Session', `Cash ${type.toUpperCase()}`, `Rs. ${amount.toLocaleString()} — ${reason}`),
          ...prev.auditLogs,
        ],
      }));
      notify(`Cash ${type} recorded`, `Rs. ${amount.toLocaleString()}`);
    },
    [makeAudit, notify]
  );

  const closeCashSession = useCallback(
    (countedCash: number) => {
      const open = state.cashSessions.find((cs) => cs.status === 'open');
      if (!open) return;
      const variance = countedCash - open.expectedCash;
      setState((prev) => ({
        ...prev,
        cashSessions: prev.cashSessions.map((cs) =>
          cs.id === open.id
            ? {
                ...cs,
                status: 'closed',
                closedBy: currentUser.name,
                countedCash,
                variance,
                closedAt: new Date().toISOString(),
              }
            : cs
        ),
        auditLogs: [
          makeAudit(
            'Cash Session',
            'Day / Shift Closed',
            `Expected Rs. ${open.expectedCash.toLocaleString()} | Counted Rs. ${countedCash.toLocaleString()} | Variance Rs. ${variance.toLocaleString()}`
          ),
          ...prev.auditLogs,
        ],
      }));
      notify(
        'Shift closed',
        variance === 0
          ? 'Cash drawer balanced perfectly (Rs. 0 variance)!'
          : `Variance: ${variance > 0 ? 'Over' : 'Short'} by Rs. ${Math.abs(variance).toLocaleString()}`,
        variance === 0 ? 'success' : 'warning'
      );
    },
    [state.cashSessions, currentUser.name, makeAudit, notify]
  );

  // ---------------- SETTINGS & BACKUP ----------------
  const updateSettings = useCallback(
    (patch: Partial<BusinessSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
        auditLogs: [
          makeAudit('Settings', 'Settings Updated', Object.keys(patch).join(', ')),
          ...prev.auditLogs,
        ],
      }));
    },
    [makeAudit]
  );

  const exportBackupJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ply-woods-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Backup exported', 'Full JSON snapshot downloaded.');
  }, [state, notify]);

  const importBackupJSON = useCallback(
    (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (!parsed.products || !parsed.sales) throw new Error('Invalid backup format');
        setState({ ...getDefaultState(), ...parsed });
        notify('Backup restored successfully');
        return true;
      } catch {
        notify('Invalid backup JSON file', undefined, 'error');
        return false;
      }
    },
    [notify]
  );

  const resetDemoData = useCallback(() => {
    const fresh = getDefaultState();
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    notify('Demo data reset', 'All 20 products, 10 customers, 5 suppliers, and 30 sales restored.', 'info');
  }, [notify]);

  return (
    <PosContext.Provider
      value={{
        state,
        locations: INITIAL_LOCATIONS,
        staffUsers: INITIAL_STAFF,
        currentUser,
        permissions,
        isOffline,
        toasts,
        activeCartRestore,
        clearActiveCartRestore: () => setActiveCartRestore(null),
        notify,
        dismissToast,
        switchUserByRole,
        setActiveLocation,
        toggleOfflineMode,
        syncOfflineSales,
        addProduct,
        updateProduct,
        importProductsCSV,
        transferStock,
        adjustStock,
        addOffcut,
        deleteOffcut,
        completeSale,
        returnSale,
        holdCart,
        resumeHeldCart,
        deleteHeldCart,
        saveQuotation,
        convertQuotationToSale,
        addCustomer,
        receiveCustomerPayment,
        addSupplier,
        paySupplier,
        createPurchaseOrder,
        receivePurchaseGRN,
        addExpense,
        transferBetweenAccounts,
        openCashSession,
        recordCashDrawerAdjustment,
        closeCashSession,
        updateSettings,
        exportBackupJSON,
        importBackupJSON,
        resetDemoData,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export function usePos(): PosContextValue {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used inside PosProvider');
  return ctx;
}
