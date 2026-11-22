export type RoleId = 'owner' | 'manager' | 'cashier' | 'storekeeper';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  avatarInitials: string;
}

export type UnitType = 'sheet' | 'sqft' | 'rft' | 'piece';

export type LocationId = 'loc-shop' | 'loc-godown';

export interface Location {
  id: LocationId;
  name: string;
  shortName: string;
  type: 'shop' | 'godown';
  address: string;
}

export type ProductCategory =
  | 'Commercial Plywood'
  | 'Marine Plywood'
  | 'MDF'
  | 'HDF'
  | 'Veneer Sheets'
  | 'Laminates (Sunmica)'
  | 'Block Board'
  | 'Hardboard'
  | 'Edge Banding'
  | 'Hardware & Adhesives';

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  brand: string;
  unit: UnitType;
  thicknessMm?: number;
  sizeLabel: string; // e.g., "8x4 ft", "7x3 ft", "6x4 ft", "Roll 50m", "1 kg"
  lengthFt: number;
  widthFt: number;
  sqftPerUnit: number;
  grade: string; // A / Premium, B / Standard, etc.
  finish: string;
  purchaseCost: number; // weighted average cost in PKR
  retailPrice: number;
  wholesalePrice: number;
  perSqFtPrice: number;
  lowStockAlert: number;
  rackLocation: string;
  stock: Record<LocationId, number>;
  createdAt: string;
  deletedAt?: string;
}

export type StockMovementType =
  | 'opening'
  | 'sale'
  | 'sale_return'
  | 'purchase'
  | 'purchase_return'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment';

export interface StockMovement {
  id: string;
  variantId: string;
  variantName: string;
  locationId: LocationId;
  type: StockMovementType;
  quantityDelta: number;
  unitCost?: number;
  referenceNo?: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface OffcutItem {
  id: string;
  variantId: string;
  productName: string;
  category: ProductCategory;
  thicknessMm?: number;
  locationId: LocationId;
  lengthFt: number;
  widthFt: number;
  areaSqFt: number;
  quantity: number;
  discountedPrice: number; // per piece
  sourceInvoiceNo?: string;
  notes?: string;
  createdAt: string;
}

export type CustomerType = 'retail' | 'contractor' | 'wholesale';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: CustomerType;
  creditLimit: number;
  openingBalance: number;
  currentBalance: number; // positive = customer owes us (Udhaar)
  createdAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  type: 'opening' | 'invoice' | 'payment' | 'return' | 'credit_note';
  referenceNo: string;
  debit: number; // increases receivable
  credit: number; // reduces receivable
  runningBalance: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  openingBalance: number;
  currentBalance: number; // positive = we owe supplier
  createdAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  type: 'opening' | 'purchase' | 'payment' | 'return';
  referenceNo: string;
  debit: number; // reduces payable (payment/return)
  credit: number; // increases payable (purchase)
  runningBalance: number;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'bank' | 'jazzcash' | 'easypaisa' | 'cheque' | 'credit';

export interface SalePayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  accountId?: string;
  referenceNo?: string;
  createdAt: string;
}

export interface CustomCutSpec {
  cutLengthFt: number;
  cutWidthFt: number;
  pieceCount: number;
  totalSqFt: number;
  sheetsConsumed: number;
  createOffcut: boolean;
  offcutLengthFt: number;
  offcutWidthFt: number;
  offcutPrice: number;
}

export interface CartItem {
  id: string;
  variantId?: string;
  offcutId?: string;
  name: string;
  sku: string;
  category: ProductCategory;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineDiscount: number; // PKR amount
  customCut?: CustomCutSpec;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  locationId: LocationId;
  priceTier: 'retail' | 'wholesale';
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  cuttingCharge: number;
  deliveryCharge: number;
  deliveryVehicle?: 'None' | 'Rickshaw' | 'Suzuki Loader' | 'Mazda Truck';
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  payments: SalePayment[];
  status: 'paid' | 'partial' | 'unpaid' | 'returned' | 'void';
  notes?: string;
  createdBy: string;
  createdAt: string;
  synced: boolean; // false when queued offline
  returnedAt?: string;
  returnReason?: string;
}

export interface HeldCart {
  id: string;
  label: string;
  customerId: string;
  priceTier: 'retail' | 'wholesale';
  items: CartItem[];
  discountValue: number;
  discountType: 'amount' | 'percent';
  cuttingCharge: number;
  deliveryCharge: number;
  deliveryVehicle: 'None' | 'Rickshaw' | 'Suzuki Loader' | 'Mazda Truck';
  taxEnabled: boolean;
  notes: string;
  heldAt: string;
}

export interface Quotation {
  id: string;
  quoteNo: string;
  customerId: string;
  customerName: string;
  locationId: LocationId;
  priceTier: 'retail' | 'wholesale';
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  cuttingCharge: number;
  deliveryCharge: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  status: 'open' | 'converted' | 'expired';
  convertedInvoiceNo?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  variantId: string;
  variantName: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  supplierId: string;
  supplierName: string;
  locationId: LocationId;
  status: 'ordered' | 'partial' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  freightCost: number;
  unloadingCost: number;
  subtotal: number;
  grandTotal: number;
  paidAmount: number;
  grnHistory: {
    grnNo: string;
    receivedAt: string;
    extraLandedCost: number;
    items: { variantId: string; variantName: string; qty: number }[];
    receivedBy: string;
  }[];
  createdAt: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Salaries'
  | 'Electricity'
  | 'Loader Charges'
  | 'Tea & Refreshments'
  | 'Fuel & Transport'
  | 'Shop Maintenance'
  | 'Misc';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'jazzcash' | 'easypaisa';
  balance: number;
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  accountName: string;
  type: 'in' | 'out' | 'transfer_in' | 'transfer_out';
  amount: number;
  referenceNo?: string;
  description: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  locationId: LocationId;
  openedBy: string;
  closedBy?: string;
  openingCash: number;
  cashSales: number;
  cashPaymentsReceived: number;
  cashInManual: number;
  cashOutManual: number;
  cashExpenses: number;
  cashRefunds: number;
  expectedCash: number;
  countedCash?: number;
  variance?: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
}

export interface AuditLog {
  id: string;
  userName: string;
  role: RoleId;
  module: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  ntn: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  receiptFooter: string;
  paperSize: '80mm' | 'A4';
  urduReceiptLabels: boolean;
  rtlInvoice: boolean;
  gstEnabledDefault: boolean;
  gstRate: number;
  defaultLowStock: number;
  managerPin: string;
  blockOverCreditLimit: boolean;
  darkMode: boolean;
}

export type PageId =
  | 'overview'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'sales'
  | 'expenses'
  | 'reports'
  | 'held'
  | 'settings'
  | 'staff';

// Auth & User types
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone: string;
  role: RoleId;
  avatarUrl: string | null;
  avatarInitials: string;
  isActive: boolean;
  lastLoginAt: string | null;
  pinHash: string | null;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  userId: string | null;
  emailOrUsername: string;
  success: boolean;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
  createdAt: string;
}
