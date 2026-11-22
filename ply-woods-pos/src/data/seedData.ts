import {
  Account,
  AccountTransaction,
  AuditLog,
  BusinessSettings,
  CashSession,
  Customer,
  CustomerLedgerEntry,
  Expense,
  HeldCart,
  Location,
  OffcutItem,
  ProductVariant,
  PurchaseOrder,
  Quotation,
  Sale,
  StaffUser,
  StockMovement,
  Supplier,
  SupplierLedgerEntry,
} from '../types/pos';

function daysBeforeIso(days: number, hour = 11, minute = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 'loc-shop',
    name: 'PLY Woods – Main Shop',
    shortName: 'Main Shop',
    type: 'shop',
    address: 'Plot 14, Timber Market, Sector I-10/3, Islamabad',
  },
  {
    id: 'loc-godown',
    name: 'PLY Woods – I-10 Godown',
    shortName: 'Godown',
    type: 'godown',
    address: 'Warehouse #7, Industrial Area I-10/4, Islamabad',
  },
];

export const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'usr-owner',
    name: 'Master Panda',
    email: 'usman@plywoods.pk',
    role: 'owner',
    avatarInitials: 'MP',
  },
  {
    id: 'usr-manager',
    name: 'Kamran Siddiqui',
    email: 'kamran@plywoods.pk',
    role: 'manager',
    avatarInitials: 'KS',
  },
  {
    id: 'usr-cashier',
    name: 'Bilal Ahmed',
    email: 'bilal@plywoods.pk',
    role: 'cashier',
    avatarInitials: 'BA',
  },
  {
    id: 'usr-storekeeper',
    name: 'Tariq Mahmood',
    email: 'tariq@plywoods.pk',
    role: 'storekeeper',
    avatarInitials: 'TM',
  },
];

export const INITIAL_SETTINGS: BusinessSettings = {
  businessName: 'PLY Woods',
  tagline: 'Plywood, MDF, Laminates & Timber Boards',
  address: 'Plot 14, Timber Market, Sector I-10/3, Islamabad',
  phone: '0300-5148890',
  ntn: '42101-8894321-7',
  invoicePrefix: 'PW-',
  nextInvoiceNumber: 1031,
  receiptFooter: 'Thank you for shopping at PLY Woods! Custom cut sheets are non-returnable.',
  paperSize: '80mm',
  urduReceiptLabels: true,
  rtlInvoice: false,
  gstEnabledDefault: false,
  gstRate: 18,
  defaultLowStock: 12,
  managerPin: '1234',
  blockOverCreditLimit: false,
  darkMode: false,
};

const makeProduct = (
  idx: number,
  name: string,
  sku: string,
  category: ProductVariant['category'],
  brand: string,
  unit: ProductVariant['unit'],
  thicknessMm: number | undefined,
  sizeLabel: string,
  lengthFt: number,
  widthFt: number,
  grade: string,
  finish: string,
  purchaseCost: number,
  retailPrice: number,
  wholesalePrice: number,
  lowStockAlert: number,
  rackLocation: string,
  shopStock: number,
  godownStock: number
): ProductVariant => {
  const sqftPerUnit = lengthFt > 0 && widthFt > 0 ? Number((lengthFt * widthFt).toFixed(2)) : 1;
  const perSqFtPrice =
    unit === 'sheet' && sqftPerUnit > 0 ? Math.round(retailPrice / sqftPerUnit) : retailPrice;
  return {
    id: `var-${String(idx).padStart(2, '0')}`,
    productId: `prod-${String(idx).padStart(2, '0')}`,
    name,
    sku,
    barcode: `89640010${String(1000 + idx)}`,
    category,
    brand,
    unit,
    thicknessMm,
    sizeLabel,
    lengthFt,
    widthFt,
    sqftPerUnit,
    grade,
    finish,
    purchaseCost,
    retailPrice,
    wholesalePrice,
    perSqFtPrice,
    lowStockAlert,
    rackLocation,
    stock: {
      'loc-shop': shopStock,
      'loc-godown': godownStock,
    },
    createdAt: daysBeforeIso(180),
  };
};

// 20 Realistic Pakistani Plywood / MDF / Laminate / Hardware Products
export const INITIAL_PRODUCTS: ProductVariant[] = [
  makeProduct(1, 'Commercial Plywood 18mm (8x4)', 'PW-CP18-84', 'Commercial Plywood', 'Al-Noor', 'sheet', 18, '8x4 ft', 8, 4, 'A / Premium', 'Natural Poplar', 4300, 5200, 4850, 15, 'Rack A-1', 42, 110),
  makeProduct(2, 'Commercial Plywood 12mm (8x4)', 'PW-CP12-84', 'Commercial Plywood', 'Al-Noor', 'sheet', 12, '8x4 ft', 8, 4, 'A / Premium', 'Natural Poplar', 3100, 3850, 3550, 15, 'Rack A-2', 36, 85),
  makeProduct(3, 'Commercial Plywood 6mm (8x4)', 'PW-CP06-84', 'Commercial Plywood', 'Patoki Wood', 'sheet', 6, '8x4 ft', 8, 4, 'B / Standard', 'Raw Sanded', 1750, 2250, 2050, 18, 'Rack A-3', 9, 48),
  makeProduct(4, 'Marine Waterproof Plywood 18mm (8x4)', 'PW-MP18-84', 'Marine Plywood', 'ZRK Group', 'sheet', 18, '8x4 ft', 8, 4, 'A / Marine BWP', 'Phenolic Gurjan', 6400, 7600, 7150, 10, 'Rack B-1', 24, 65),
  makeProduct(5, 'Marine Waterproof Plywood 12mm (8x4)', 'PW-MP12-84', 'Marine Plywood', 'ZRK Group', 'sheet', 12, '8x4 ft', 8, 4, 'A / Marine BWP', 'Phenolic Gurjan', 4650, 5600, 5250, 10, 'Rack B-2', 7, 30),
  makeProduct(6, 'Lasani MDF Plain 16mm (8x4)', 'PW-MDF16-84', 'MDF', 'Lasani Wood', 'sheet', 16, '8x4 ft', 8, 4, 'A / Premium', 'Smooth Raw', 3450, 4200, 3900, 20, 'Rack C-1', 54, 140),
  makeProduct(7, 'Lasani UV Glossy MDF 16mm – Pearl White', 'PW-UV16-WHT', 'MDF', 'Lasani Wood', 'sheet', 16, '8x4 ft', 8, 4, 'A / High Gloss', 'UV Pearl White', 5600, 6800, 6350, 12, 'Rack C-2', 28, 70),
  makeProduct(8, 'ZRK Melamine Laminated MDF 16mm – Walnut', 'PW-MEL16-WLN', 'MDF', 'ZRK Group', 'sheet', 16, '8x4 ft', 8, 4, 'A / Textured', 'Dark Walnut', 4400, 5400, 5000, 15, 'Rack C-3', 31, 90),
  makeProduct(9, 'Lasani MDF Plain 9mm (8x4)', 'PW-MDF09-84', 'MDF', 'Lasani Wood', 'sheet', 9, '8x4 ft', 8, 4, 'A / Premium', 'Smooth Raw', 2150, 2700, 2500, 15, 'Rack C-4', 18, 55),
  makeProduct(10, 'Winboard HDF Laminated 4mm (7x3) Door Skin', 'PW-HDF04-73', 'HDF', 'Winboard', 'sheet', 4, '7x3 ft', 7, 3, 'A / Moulded', 'Ash Teak', 1450, 1950, 1780, 15, 'Rack D-1', 6, 40),
  makeProduct(11, 'HDF High Density Backing Sheet 3mm (8x4)', 'PW-HDF03-84', 'HDF', 'Lasani Wood', 'sheet', 3, '8x4 ft', 8, 4, 'B / Standard', 'White Back', 980, 1350, 1220, 25, 'Rack D-2', 64, 150),
  makeProduct(12, 'Burma Teak Fancy Veneer Sheet 4mm (8x4)', 'PW-VN04-BTK', 'Veneer Sheets', 'Al-Noor', 'sheet', 4, '8x4 ft', 8, 4, 'A / Premium', 'Crown Burma Teak', 2950, 3800, 3500, 12, 'Rack E-1', 19, 45),
  makeProduct(13, 'American Oak Veneer Sheet 4mm (8x4)', 'PW-VN04-AOK', 'Veneer Sheets', 'Al-Noor', 'sheet', 4, '8x4 ft', 8, 4, 'A / Premium', 'Quarter Cut Oak', 2700, 3450, 3180, 10, 'Rack E-2', 5, 22),
  makeProduct(14, 'Formite Sunmica Laminate 0.8mm – Matte Charcoal', 'PW-LM08-CHR', 'Laminates (Sunmica)', 'Formite', 'sheet', 1, '8x4 ft', 8, 4, 'A / Scratch Guard', 'Matte Charcoal', 1650, 2200, 2000, 20, 'Rack F-1', 45, 110),
  makeProduct(15, 'Formite Sunmica Laminate 0.8mm – Carrara Marble', 'PW-LM08-MRB', 'Laminates (Sunmica)', 'Formite', 'sheet', 1, '8x4 ft', 8, 4, 'A / Gloss', 'Carrara Marble', 1800, 2400, 2180, 15, 'Rack F-2', 32, 75),
  makeProduct(16, 'Pine Core Block Board 18mm (8x4)', 'PW-BB18-84', 'Block Board', 'ZRK Group', 'sheet', 18, '8x4 ft', 8, 4, 'A / Seasoned', 'Pine Stave Core', 4750, 5750, 5350, 12, 'Rack G-1', 21, 60),
  makeProduct(17, 'Heavy Block Board 25mm (6x4) Door Core', 'PW-BB25-64', 'Block Board', 'Patoki Wood', 'sheet', 25, '6x4 ft', 6, 4, 'A / Solid Core', 'Commercial Face', 5200, 6300, 5900, 8, 'Rack G-2', 4, 18),
  makeProduct(18, 'Tempered Hardboard 3mm (8x4)', 'PW-HB03-84', 'Hardboard', 'Patoki Wood', 'sheet', 3, '8x4 ft', 8, 4, 'B / Standard', 'Dark Brown Oil', 780, 1080, 960, 20, 'Rack H-1', 48, 95),
  makeProduct(19, 'PVC Edge Banding Tape 22mm × 1mm – Walnut', 'PW-EB22-WLN', 'Edge Banding', 'Formite', 'rft', 1, 'Running ft', 1, 1, 'A / Matching', 'Walnut Textured', 14, 25, 20, 150, 'Counter B-2', 620, 1500),
  makeProduct(20, 'German PVA Wood Glue (White) – 4 kg Bucket', 'PW-GL04-GRM', 'Hardware & Adhesives', 'Super Bond', 'piece', undefined, '4 kg Bucket', 1, 1, 'D3 Waterproof', 'Industrial White', 1650, 2250, 2050, 12, 'Counter A-1', 16, 42),
];

// 10 Realistic Customers (Walk-in, Carpenters on Udhaar, Wholesale Dealers)
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-walkin',
    name: 'Walk-in Customer',
    phone: '',
    address: 'Cash Counter',
    type: 'retail',
    creditLimit: 0,
    openingBalance: 0,
    currentBalance: 0,
    createdAt: daysBeforeIso(200),
  },
  {
    id: 'cust-01',
    name: 'Ustad Tariq Carpenter',
    phone: '0301-5523190',
    address: 'G-9 Markaz Workshop, Islamabad',
    type: 'contractor',
    creditLimit: 150000,
    openingBalance: 18000,
    currentBalance: 46500,
    createdAt: daysBeforeIso(170),
  },
  {
    id: 'cust-02',
    name: 'Bilal Woodworks & Interiors',
    phone: '0333-5112084',
    address: 'Bahria Town Phase 4, Rawalpindi',
    type: 'contractor',
    creditLimit: 250000,
    openingBalance: 0,
    currentBalance: 82400,
    createdAt: daysBeforeIso(160),
  },
  {
    id: 'cust-03',
    name: 'Mian Furniture House',
    phone: '0300-8542910',
    address: 'Murree Road, Faizabad, Rawalpindi',
    type: 'wholesale',
    creditLimit: 500000,
    openingBalance: 45000,
    currentBalance: 124000,
    createdAt: daysBeforeIso(150),
  },
  {
    id: 'cust-04',
    name: 'Al-Madina Timber Traders',
    phone: '0321-5009123',
    address: 'Chaklala Scheme III, Rawalpindi',
    type: 'wholesale',
    creditLimit: 600000,
    openingBalance: 0,
    currentBalance: 96000,
    createdAt: daysBeforeIso(145),
  },
  {
    id: 'cust-05',
    name: 'Pak Kitchen Studio',
    phone: '0345-5893211',
    address: 'Blue Area, Jinnah Avenue, Islamabad',
    type: 'contractor',
    creditLimit: 300000,
    openingBalance: 0,
    currentBalance: 38200,
    createdAt: daysBeforeIso(120),
  },
  {
    id: 'cust-06',
    name: 'Ch. Zubair Builders',
    phone: '0302-5987654',
    address: 'DHA Phase 2, Islamabad',
    type: 'contractor',
    creditLimit: 350000,
    openingBalance: 25000,
    currentBalance: 65000,
    createdAt: daysBeforeIso(110),
  },
  {
    id: 'cust-07',
    name: 'Imran Doors & Frames',
    phone: '0313-5441122',
    address: 'Saddar Timber Gali, Rawalpindi',
    type: 'wholesale',
    creditLimit: 200000,
    openingBalance: 0,
    currentBalance: 19500,
    createdAt: daysBeforeIso(95),
  },
  {
    id: 'cust-08',
    name: 'Hamza Architectural Wood',
    phone: '0334-9012345',
    address: 'F-10 Markaz, Islamabad',
    type: 'contractor',
    creditLimit: 180000,
    openingBalance: 0,
    currentBalance: 0,
    createdAt: daysBeforeIso(80),
  },
  {
    id: 'cust-09',
    name: 'Sajjad Home Renovation',
    phone: '0306-4455678',
    address: 'Sector G-11/2, Islamabad',
    type: 'retail',
    creditLimit: 50000,
    openingBalance: 0,
    currentBalance: 12000,
    createdAt: daysBeforeIso(45),
  },
];

// 5 Realistic Suppliers
export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-01',
    name: 'Lasani Wood Industries (Pvt) Ltd',
    contactPerson: 'Asadullah Khan',
    phone: '042-35812900',
    address: 'Sheikhupura Road, Lahore',
    openingBalance: 0,
    currentBalance: 245000,
    createdAt: daysBeforeIso(200),
  },
  {
    id: 'sup-02',
    name: 'ZRK Group Wood Panels',
    contactPerson: 'Fawad Afridi',
    phone: '091-5891122',
    address: 'Hayatabad Industrial Estate, Peshawar',
    openingBalance: 0,
    currentBalance: 185000,
    createdAt: daysBeforeIso(195),
  },
  {
    id: 'sup-03',
    name: 'Al-Noor Veneer & Plywood Mills',
    contactPerson: 'Haji Riaz',
    phone: '041-8712340',
    address: 'Jhang Road, Faisalabad',
    openingBalance: 0,
    currentBalance: 92000,
    createdAt: daysBeforeIso(180),
  },
  {
    id: 'sup-04',
    name: 'Formite Laminates Pakistan',
    contactPerson: 'Salman Butt',
    phone: '042-37509911',
    address: 'Sundar Industrial Estate, Lahore',
    openingBalance: 0,
    currentBalance: 64000,
    createdAt: daysBeforeIso(160),
  },
  {
    id: 'sup-05',
    name: 'Pak Hardware & Adhesives Co.',
    contactPerson: 'Nadeem Qureshi',
    phone: '051-4432198',
    address: 'Raja Bazaar, Rawalpindi',
    openingBalance: 0,
    currentBalance: 28000,
    createdAt: daysBeforeIso(150),
  },
];

export const INITIAL_OFFCUTS: OffcutItem[] = [
  {
    id: 'off-01',
    variantId: 'var-01',
    productName: 'Commercial Plywood 18mm (8x4)',
    category: 'Commercial Plywood',
    thicknessMm: 18,
    locationId: 'loc-shop',
    lengthFt: 6,
    widthFt: 4,
    areaSqFt: 24,
    quantity: 3,
    discountedPrice: 2800,
    sourceInvoiceNo: 'PW-1024',
    notes: 'Clean straight factory-saw cut',
    createdAt: daysBeforeIso(5),
  },
  {
    id: 'off-02',
    variantId: 'var-07',
    productName: 'Lasani UV Glossy MDF 16mm – Pearl White',
    category: 'MDF',
    thicknessMm: 16,
    locationId: 'loc-shop',
    lengthFt: 4,
    widthFt: 3,
    areaSqFt: 12,
    quantity: 4,
    discountedPrice: 1750,
    sourceInvoiceNo: 'PW-1026',
    notes: 'Protective film intact',
    createdAt: daysBeforeIso(3),
  },
  {
    id: 'off-03',
    variantId: 'var-04',
    productName: 'Marine Waterproof Plywood 18mm (8x4)',
    category: 'Marine Plywood',
    thicknessMm: 18,
    locationId: 'loc-shop',
    lengthFt: 5,
    widthFt: 2,
    areaSqFt: 10,
    quantity: 2,
    discountedPrice: 1650,
    sourceInvoiceNo: 'PW-1028',
    notes: 'Great for kitchen sink cabinets',
    createdAt: daysBeforeIso(1),
  },
  {
    id: 'off-04',
    variantId: 'var-08',
    productName: 'ZRK Melamine Laminated MDF 16mm – Walnut',
    category: 'MDF',
    thicknessMm: 16,
    locationId: 'loc-godown',
    lengthFt: 6,
    widthFt: 2,
    areaSqFt: 12,
    quantity: 5,
    discountedPrice: 1450,
    sourceInvoiceNo: 'PW-1021',
    notes: 'Shelf strips',
    createdAt: daysBeforeIso(9),
  },
];

// Build 30 realistic sales across the past 6 months (including 4 sales today!)
function buildSeedSales(): Sale[] {
  const specs: {
    daysAgo: number;
    hour: number;
    custIdx: number;
    tier: 'retail' | 'wholesale';
    items: { prodIdx: number; qty: number; disc?: number }[];
    cutting?: number;
    delivery?: number;
    vehicle?: Sale['deliveryVehicle'];
    payMethod: 'cash' | 'bank' | 'jazzcash' | 'easypaisa' | 'credit' | 'partial';
    paidRatio?: number;
  }[] = [
    // Month -5 (~150-165 days ago)
    { daysAgo: 162, hour: 10, custIdx: 3, tier: 'wholesale', items: [{ prodIdx: 0, qty: 24 }, { prodIdx: 5, qty: 20 }], delivery: 2500, vehicle: 'Mazda Truck', payMethod: 'bank' },
    { daysAgo: 155, hour: 14, custIdx: 1, tier: 'retail', items: [{ prodIdx: 3, qty: 8 }, { prodIdx: 13, qty: 10 }], cutting: 600, payMethod: 'cash' },
    { daysAgo: 148, hour: 12, custIdx: 4, tier: 'wholesale', items: [{ prodIdx: 7, qty: 30 }, { prodIdx: 15, qty: 12 }], delivery: 3000, vehicle: 'Mazda Truck', payMethod: 'bank' },
    { daysAgo: 140, hour: 16, custIdx: 0, tier: 'retail', items: [{ prodIdx: 1, qty: 6 }, { prodIdx: 19, qty: 3 }], payMethod: 'jazzcash' },
    // Month -4 (~115-135 days ago)
    { daysAgo: 132, hour: 11, custIdx: 2, tier: 'retail', items: [{ prodIdx: 6, qty: 15 }, { prodIdx: 18, qty: 120 }], cutting: 1200, delivery: 1500, vehicle: 'Suzuki Loader', payMethod: 'bank' },
    { daysAgo: 124, hour: 15, custIdx: 5, tier: 'retail', items: [{ prodIdx: 6, qty: 10 }, { prodIdx: 3, qty: 6 }, { prodIdx: 14, qty: 8 }], cutting: 900, payMethod: 'jazzcash' },
    { daysAgo: 118, hour: 10, custIdx: 0, tier: 'retail', items: [{ prodIdx: 11, qty: 8 }, { prodIdx: 19, qty: 2 }], payMethod: 'cash' },
    { daysAgo: 112, hour: 13, custIdx: 6, tier: 'retail', items: [{ prodIdx: 15, qty: 14 }, { prodIdx: 0, qty: 12 }], delivery: 2000, vehicle: 'Suzuki Loader', payMethod: 'partial', paidRatio: 0.7 },
    // Month -3 (~82-105 days ago)
    { daysAgo: 102, hour: 11, custIdx: 4, tier: 'wholesale', items: [{ prodIdx: 5, qty: 35 }, { prodIdx: 8, qty: 25 }, { prodIdx: 10, qty: 30 }], delivery: 3500, vehicle: 'Mazda Truck', payMethod: 'bank' },
    { daysAgo: 95, hour: 16, custIdx: 7, tier: 'wholesale', items: [{ prodIdx: 9, qty: 22 }, { prodIdx: 16, qty: 10 }], delivery: 1800, vehicle: 'Suzuki Loader', payMethod: 'cash' },
    { daysAgo: 89, hour: 12, custIdx: 3, tier: 'wholesale', items: [{ prodIdx: 0, qty: 30 }, { prodIdx: 13, qty: 24 }], delivery: 3000, vehicle: 'Mazda Truck', payMethod: 'partial', paidRatio: 0.65 },
    { daysAgo: 83, hour: 14, custIdx: 8, tier: 'retail', items: [{ prodIdx: 11, qty: 12 }, { prodIdx: 12, qty: 10 }, { prodIdx: 19, qty: 4 }], cutting: 800, payMethod: 'easypaisa' },
    // Month -2 (~52-76 days ago)
    { daysAgo: 74, hour: 10, custIdx: 2, tier: 'retail', items: [{ prodIdx: 6, qty: 18 }, { prodIdx: 7, qty: 16 }, { prodIdx: 18, qty: 200 }], cutting: 1500, delivery: 1800, vehicle: 'Suzuki Loader', payMethod: 'partial', paidRatio: 0.6 },
    { daysAgo: 68, hour: 15, custIdx: 1, tier: 'retail', items: [{ prodIdx: 1, qty: 12 }, { prodIdx: 13, qty: 10 }], cutting: 600, delivery: 800, vehicle: 'Rickshaw', payMethod: 'partial', paidRatio: 0.55 },
    { daysAgo: 61, hour: 11, custIdx: 0, tier: 'retail', items: [{ prodIdx: 17, qty: 15 }, { prodIdx: 2, qty: 8 }], payMethod: 'cash' },
    { daysAgo: 55, hour: 13, custIdx: 5, tier: 'retail', items: [{ prodIdx: 3, qty: 12 }, { prodIdx: 14, qty: 14 }], cutting: 1000, delivery: 1200, vehicle: 'Suzuki Loader', payMethod: 'bank' },
    { daysAgo: 49, hour: 17, custIdx: 3, tier: 'wholesale', items: [{ prodIdx: 5, qty: 40 }, { prodIdx: 15, qty: 18 }], delivery: 3200, vehicle: 'Mazda Truck', payMethod: 'bank' },
    // Month -1 (~18-44 days ago)
    { daysAgo: 42, hour: 10, custIdx: 4, tier: 'wholesale', items: [{ prodIdx: 0, qty: 28 }, { prodIdx: 3, qty: 15 }], delivery: 2800, vehicle: 'Mazda Truck', payMethod: 'partial', paidRatio: 0.72 },
    { daysAgo: 35, hour: 14, custIdx: 6, tier: 'retail', items: [{ prodIdx: 15, qty: 10 }, { prodIdx: 16, qty: 8 }, { prodIdx: 19, qty: 5 }], delivery: 1500, vehicle: 'Suzuki Loader', payMethod: 'partial', paidRatio: 0.65 },
    { daysAgo: 28, hour: 12, custIdx: 9, tier: 'retail', items: [{ prodIdx: 7, qty: 6 }, { prodIdx: 14, qty: 6 }], cutting: 500, delivery: 700, vehicle: 'Rickshaw', payMethod: 'partial', paidRatio: 0.75 },
    { daysAgo: 22, hour: 16, custIdx: 2, tier: 'retail', items: [{ prodIdx: 6, qty: 14 }, { prodIdx: 11, qty: 10 }, { prodIdx: 18, qty: 150 }], cutting: 1100, payMethod: 'jazzcash' },
    { daysAgo: 16, hour: 11, custIdx: 0, tier: 'retail', items: [{ prodIdx: 1, qty: 5 }, { prodIdx: 10, qty: 10 }, { prodIdx: 19, qty: 2 }], payMethod: 'cash' },
    // Recent week (~1-12 days ago)
    { daysAgo: 11, hour: 13, custIdx: 7, tier: 'wholesale', items: [{ prodIdx: 9, qty: 18 }, { prodIdx: 16, qty: 8 }], delivery: 1500, vehicle: 'Suzuki Loader', payMethod: 'partial', paidRatio: 0.78 },
    { daysAgo: 8, hour: 10, custIdx: 5, tier: 'retail', items: [{ prodIdx: 6, qty: 12 }, { prodIdx: 3, qty: 8 }], cutting: 950, delivery: 1200, vehicle: 'Suzuki Loader', payMethod: 'partial', paidRatio: 0.7 },
    { daysAgo: 5, hour: 15, custIdx: 1, tier: 'retail', items: [{ prodIdx: 0, qty: 8 }, { prodIdx: 13, qty: 8 }], cutting: 500, payMethod: 'credit' },
    { daysAgo: 2, hour: 12, custIdx: 3, tier: 'wholesale', items: [{ prodIdx: 5, qty: 25 }, { prodIdx: 7, qty: 20 }], delivery: 2500, vehicle: 'Mazda Truck', payMethod: 'bank' },
    // TODAY (4 sales today for rich Today KPI + Cash Drawer reconciliation!)
    { daysAgo: 0, hour: 9, custIdx: 0, tier: 'retail', items: [{ prodIdx: 0, qty: 6 }, { prodIdx: 19, qty: 2 }], cutting: 400, payMethod: 'cash' },
    { daysAgo: 0, hour: 10, custIdx: 2, tier: 'retail', items: [{ prodIdx: 6, qty: 8 }, { prodIdx: 14, qty: 6 }, { prodIdx: 18, qty: 100 }], cutting: 700, delivery: 1200, vehicle: 'Suzuki Loader', payMethod: 'jazzcash' },
    { daysAgo: 0, hour: 11, custIdx: 1, tier: 'retail', items: [{ prodIdx: 3, qty: 5 }, { prodIdx: 11, qty: 4 }], cutting: 500, delivery: 800, vehicle: 'Rickshaw', payMethod: 'partial', paidRatio: 0.6 },
    { daysAgo: 0, hour: 13, custIdx: 8, tier: 'retail', items: [{ prodIdx: 15, qty: 6 }, { prodIdx: 13, qty: 5 }], delivery: 1000, vehicle: 'Suzuki Loader', payMethod: 'cash' },
  ];

  return specs.map((s, idx) => {
    const cust = INITIAL_CUSTOMERS[s.custIdx];
    const items = s.items.map((it, j) => {
      const p = INITIAL_PRODUCTS[it.prodIdx];
      const unitPrice = s.tier === 'wholesale' ? p.wholesalePrice : p.retailPrice;
      return {
        id: `si-${idx}-${j}`,
        variantId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unit: p.unit,
        quantity: it.qty,
        unitPrice,
        unitCost: p.purchaseCost,
        lineDiscount: it.disc || 0,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice - i.lineDiscount, 0);
    const cuttingCharge = s.cutting || 0;
    const deliveryCharge = s.delivery || 0;
    const grandTotal = subtotal + cuttingCharge + deliveryCharge;
    const createdAt = daysBeforeIso(s.daysAgo, s.hour, 15 + (idx % 40));

    let paidAmount = grandTotal;
    let payments: Sale['payments'] = [];
    let status: Sale['status'] = 'paid';

    if (s.payMethod === 'credit') {
      paidAmount = 0;
      status = 'unpaid';
      payments = [{ id: `sp-${idx}`, method: 'credit', amount: grandTotal, createdAt }];
    } else if (s.payMethod === 'partial') {
      paidAmount = Math.round((grandTotal * (s.paidRatio || 0.6)) / 100) * 100;
      status = 'partial';
      payments = [
        { id: `sp-${idx}-1`, method: 'cash', amount: paidAmount, accountId: 'acc-cash', createdAt },
        { id: `sp-${idx}-2`, method: 'credit', amount: grandTotal - paidAmount, createdAt },
      ];
    } else {
      const accountMap: Record<string, string> = {
        cash: 'acc-cash',
        bank: 'acc-hbl',
        jazzcash: 'acc-jc',
        easypaisa: 'acc-ep',
      };
      payments = [
        {
          id: `sp-${idx}`,
          method: s.payMethod,
          amount: grandTotal,
          accountId: accountMap[s.payMethod],
          createdAt,
        },
      ];
    }

    return {
      id: `sale-${String(idx + 1).padStart(3, '0')}`,
      invoiceNo: `PW-${1001 + idx}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      locationId: 'loc-shop',
      priceTier: s.tier,
      items,
      subtotal,
      discountAmount: 0,
      cuttingCharge,
      deliveryCharge,
      deliveryVehicle: s.vehicle || 'None',
      taxEnabled: false,
      taxRate: 18,
      taxAmount: 0,
      grandTotal,
      paidAmount,
      dueAmount: grandTotal - paidAmount,
      payments,
      status,
      createdBy: idx % 3 === 0 ? 'Master Panda' : 'Bilal Ahmed',
      createdAt,
      synced: true,
    };
  });
}

export const INITIAL_SALES: Sale[] = buildSeedSales();

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'qt-01',
    quoteNo: 'QT-501',
    customerId: 'cust-05',
    customerName: 'Pak Kitchen Studio',
    locationId: 'loc-shop',
    priceTier: 'retail',
    items: [
      {
        id: 'qi-1',
        variantId: 'var-07',
        name: 'Lasani UV Glossy MDF 16mm – Pearl White',
        sku: 'PW-UV16-WHT',
        category: 'MDF',
        unit: 'sheet',
        quantity: 12,
        unitPrice: 6800,
        unitCost: 5600,
        lineDiscount: 0,
      },
      {
        id: 'qi-2',
        variantId: 'var-04',
        name: 'Marine Waterproof Plywood 18mm (8x4)',
        sku: 'PW-MP18-84',
        category: 'Marine Plywood',
        unit: 'sheet',
        quantity: 6,
        unitPrice: 7600,
        unitCost: 6400,
        lineDiscount: 0,
      },
    ],
    subtotal: 127200,
    discountAmount: 2200,
    cuttingCharge: 1800,
    deliveryCharge: 1500,
    taxAmount: 0,
    grandTotal: 128300,
    notes: 'Modular kitchen project Sector F-7 — valid 7 days',
    status: 'open',
    createdAt: daysBeforeIso(2, 15, 0),
  },
];

export const INITIAL_HELD_CARTS: HeldCart[] = [
  {
    id: 'held-01',
    label: 'Ustad Tariq — Waiting for Truck',
    customerId: 'cust-01',
    priceTier: 'retail',
    items: [
      {
        id: 'hc-1',
        variantId: 'var-01',
        name: 'Commercial Plywood 18mm (8x4)',
        sku: 'PW-CP18-84',
        category: 'Commercial Plywood',
        unit: 'sheet',
        quantity: 5,
        unitPrice: 5200,
        unitCost: 4300,
        lineDiscount: 0,
      },
      {
        id: 'hc-2',
        variantId: 'var-14',
        name: 'Formite Sunmica Laminate 0.8mm – Matte Charcoal',
        sku: 'PW-LM08-CHR',
        category: 'Laminates (Sunmica)',
        unit: 'sheet',
        quantity: 6,
        unitPrice: 2200,
        unitCost: 1650,
        lineDiscount: 0,
      },
    ],
    discountValue: 0,
    discountType: 'amount',
    cuttingCharge: 500,
    deliveryCharge: 1000,
    deliveryVehicle: 'Suzuki Loader',
    taxEnabled: false,
    notes: 'Will confirm sheet count by 4 PM',
    heldAt: daysBeforeIso(0, 11, 45),
  },
];

export const INITIAL_PURCHASES: PurchaseOrder[] = [
  {
    id: 'po-01',
    poNo: 'PO-2001',
    supplierId: 'sup-01',
    supplierName: 'Lasani Wood Industries (Pvt) Ltd',
    locationId: 'loc-godown',
    status: 'received',
    items: [
      { variantId: 'var-06', variantName: 'Lasani MDF Plain 16mm (8x4)', orderedQty: 80, receivedQty: 80, unitCost: 3450 },
      { variantId: 'var-07', variantName: 'Lasani UV Glossy MDF 16mm – Pearl White', orderedQty: 40, receivedQty: 40, unitCost: 5600 },
    ],
    freightCost: 18000,
    unloadingCost: 4500,
    subtotal: 500000,
    grandTotal: 522500,
    paidAmount: 277500,
    grnHistory: [
      {
        grnNo: 'GRN-3001',
        receivedAt: daysBeforeIso(14, 10, 0),
        extraLandedCost: 22500,
        items: [
          { variantId: 'var-06', variantName: 'Lasani MDF Plain 16mm (8x4)', qty: 80 },
          { variantId: 'var-07', variantName: 'Lasani UV Glossy MDF 16mm – Pearl White', qty: 40 },
        ],
        receivedBy: 'Tariq Mahmood',
      },
    ],
    createdAt: daysBeforeIso(18, 9, 30),
  },
  {
    id: 'po-02',
    poNo: 'PO-2002',
    supplierId: 'sup-02',
    supplierName: 'ZRK Group Wood Panels',
    locationId: 'loc-godown',
    status: 'partial',
    items: [
      { variantId: 'var-04', variantName: 'Marine Waterproof Plywood 18mm (8x4)', orderedQty: 50, receivedQty: 30, unitCost: 6400 },
      { variantId: 'var-08', variantName: 'ZRK Melamine Laminated MDF 16mm – Walnut', orderedQty: 60, receivedQty: 35, unitCost: 4400 },
    ],
    freightCost: 14000,
    unloadingCost: 3500,
    subtotal: 584000,
    grandTotal: 601500,
    paidAmount: 300000,
    grnHistory: [
      {
        grnNo: 'GRN-3002',
        receivedAt: daysBeforeIso(4, 15, 20),
        extraLandedCost: 9000,
        items: [
          { variantId: 'var-04', variantName: 'Marine Waterproof Plywood 18mm (8x4)', qty: 30 },
          { variantId: 'var-08', variantName: 'ZRK Melamine Laminated MDF 16mm – Walnut', qty: 35 },
        ],
        receivedBy: 'Tariq Mahmood',
      },
    ],
    createdAt: daysBeforeIso(6, 11, 0),
  },
  {
    id: 'po-03',
    poNo: 'PO-2003',
    supplierId: 'sup-03',
    supplierName: 'Al-Noor Veneer & Plywood Mills',
    locationId: 'loc-shop',
    status: 'ordered',
    items: [
      { variantId: 'var-03', variantName: 'Commercial Plywood 6mm (8x4)', orderedQty: 40, receivedQty: 0, unitCost: 1750 },
      { variantId: 'var-13', variantName: 'American Oak Veneer Sheet 4mm (8x4)', orderedQty: 30, receivedQty: 0, unitCost: 2700 },
    ],
    freightCost: 6500,
    unloadingCost: 1500,
    subtotal: 151000,
    grandTotal: 159000,
    paidAmount: 0,
    grnHistory: [],
    createdAt: daysBeforeIso(1, 14, 0),
  },
];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-cash', name: 'Shop Cash Drawer', type: 'cash', balance: 214500 },
  { id: 'acc-hbl', name: 'HBL Business Current', type: 'bank', balance: 1485000 },
  { id: 'acc-jc', name: 'JazzCash Business', type: 'jazzcash', balance: 162400 },
  { id: 'acc-ep', name: 'Easypaisa Merchant', type: 'easypaisa', balance: 94800 },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-01',
    category: 'Rent',
    accountId: 'acc-hbl',
    accountName: 'HBL Business Current',
    amount: 145000,
    description: 'Monthly shop & godown rent (I-10)',
    date: daysBeforeIso(15).slice(0, 10),
    createdBy: 'Master Panda',
    createdAt: daysBeforeIso(15, 11, 0),
  },
  {
    id: 'exp-02',
    category: 'Electricity',
    accountId: 'acc-hbl',
    accountName: 'HBL Business Current',
    amount: 34200,
    description: 'IESCO commercial meter + panel saw motor',
    date: daysBeforeIso(9).slice(0, 10),
    createdBy: 'Kamran Siddiqui',
    createdAt: daysBeforeIso(9, 13, 0),
  },
  {
    id: 'exp-03',
    category: 'Loader Charges',
    accountId: 'acc-cash',
    accountName: 'Shop Cash Drawer',
    amount: 4500,
    description: 'Godown-to-shop sheet transfer labour',
    date: daysBeforeIso(3).slice(0, 10),
    createdBy: 'Tariq Mahmood',
    createdAt: daysBeforeIso(3, 16, 0),
  },
  {
    id: 'exp-04',
    category: 'Tea & Refreshments',
    accountId: 'acc-cash',
    accountName: 'Shop Cash Drawer',
    amount: 1850,
    description: 'Staff & carpenter guests tea/lunch today',
    date: daysBeforeIso(0).slice(0, 10),
    createdBy: 'Bilal Ahmed',
    createdAt: daysBeforeIso(0, 12, 15),
  },
  {
    id: 'exp-05',
    category: 'Fuel & Transport',
    accountId: 'acc-cash',
    accountName: 'Shop Cash Drawer',
    amount: 3200,
    description: 'Generator diesel for cutting saw backup',
    date: daysBeforeIso(0).slice(0, 10),
    createdBy: 'Kamran Siddiqui',
    createdAt: daysBeforeIso(0, 10, 40),
  },
];

// Compute today's cash inflows/outflows so active cash session starts accurately reconciled!
const todayCashSales = INITIAL_SALES.filter((s) => s.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
  .flatMap((s) => s.payments)
  .filter((p) => p.method === 'cash')
  .reduce((sum, p) => sum + p.amount, 0);

const todayCashExpenses = INITIAL_EXPENSES.filter(
  (e) => e.accountId === 'acc-cash' && e.date === new Date().toISOString().slice(0, 10)
).reduce((sum, e) => sum + e.amount, 0);

export const INITIAL_CASH_SESSIONS: CashSession[] = [
  {
    id: 'cs-yesterday',
    locationId: 'loc-shop',
    openedBy: 'Bilal Ahmed',
    closedBy: 'Kamran Siddiqui',
    openingCash: 45000,
    cashSales: 142500,
    cashPaymentsReceived: 35000,
    cashInManual: 0,
    cashOutManual: 100000,
    cashExpenses: 6200,
    cashRefunds: 0,
    expectedCash: 116300,
    countedCash: 116300,
    variance: 0,
    status: 'closed',
    openedAt: daysBeforeIso(1, 8, 45),
    closedAt: daysBeforeIso(1, 20, 30),
  },
  {
    id: 'cs-today',
    locationId: 'loc-shop',
    openedBy: 'Bilal Ahmed',
    openingCash: 50000,
    cashSales: todayCashSales,
    cashPaymentsReceived: 0,
    cashInManual: 0,
    cashOutManual: 0,
    cashExpenses: todayCashExpenses,
    cashRefunds: 0,
    expectedCash: 50000 + todayCashSales - todayCashExpenses,
    status: 'open',
    openedAt: daysBeforeIso(0, 8, 50),
  },
];

export const INITIAL_CUSTOMER_LEDGER: CustomerLedgerEntry[] = [
  { id: 'cl-1', customerId: 'cust-01', type: 'opening', referenceNo: 'OPENING', debit: 18000, credit: 0, runningBalance: 18000, notes: 'Opening Udhaar balance', createdAt: daysBeforeIso(170) },
  { id: 'cl-2', customerId: 'cust-01', type: 'invoice', referenceNo: 'PW-1025', debit: 59700, credit: 0, runningBalance: 77700, notes: 'Credit sale — 8× 18mm ply + laminates', createdAt: daysBeforeIso(5) },
  { id: 'cl-3', customerId: 'cust-01', type: 'payment', referenceNo: 'RCP-401', debit: 0, credit: 50000, runningBalance: 27700, paymentMethod: 'cash', notes: 'Cash received on account', createdAt: daysBeforeIso(2) },
  { id: 'cl-4', customerId: 'cust-01', type: 'invoice', referenceNo: 'PW-1029', debit: 18800, credit: 0, runningBalance: 46500, notes: 'Partial balance due on PW-1029', createdAt: daysBeforeIso(0, 11, 20) },
  { id: 'cl-5', customerId: 'cust-02', type: 'invoice', referenceNo: 'PW-1013', debit: 82400, credit: 0, runningBalance: 82400, notes: 'Remaining balance from Bahria project', createdAt: daysBeforeIso(74) },
  { id: 'cl-6', customerId: 'cust-03', type: 'opening', referenceNo: 'OPENING', debit: 45000, credit: 0, runningBalance: 45000, notes: 'Opening wholesale account', createdAt: daysBeforeIso(150) },
  { id: 'cl-7', customerId: 'cust-03', type: 'invoice', referenceNo: 'PW-1011', debit: 79000, credit: 0, runningBalance: 124000, notes: 'Wholesale plywood batch due', createdAt: daysBeforeIso(42) },
  { id: 'cl-8', customerId: 'cust-04', type: 'invoice', referenceNo: 'PW-1018', debit: 96000, credit: 0, runningBalance: 96000, notes: 'Balance due on wholesale order', createdAt: daysBeforeIso(42) },
  { id: 'cl-9', customerId: 'cust-05', type: 'invoice', referenceNo: 'PW-1024', debit: 38200, credit: 0, runningBalance: 38200, notes: 'Partial invoice balance', createdAt: daysBeforeIso(8) },
  { id: 'cl-10', customerId: 'cust-06', type: 'invoice', referenceNo: 'PW-1019', debit: 65000, credit: 0, runningBalance: 65000, notes: 'DHA Phase 2 site supply', createdAt: daysBeforeIso(35) },
  { id: 'cl-11', customerId: 'cust-07', type: 'invoice', referenceNo: 'PW-1023', debit: 19500, credit: 0, runningBalance: 19500, notes: 'Door core balance', createdAt: daysBeforeIso(11) },
  { id: 'cl-12', customerId: 'cust-09', type: 'invoice', referenceNo: 'PW-1020', debit: 12000, credit: 0, runningBalance: 12000, notes: 'Home renovation partial due', createdAt: daysBeforeIso(28) },
];

export const INITIAL_SUPPLIER_LEDGER: SupplierLedgerEntry[] = [
  { id: 'sl-1', supplierId: 'sup-01', type: 'purchase', referenceNo: 'PO-2001', debit: 0, credit: 522500, runningBalance: 522500, notes: 'MDF & UV Glossy container load', createdAt: daysBeforeIso(14) },
  { id: 'sl-2', supplierId: 'sup-01', type: 'payment', referenceNo: 'PAY-901', debit: 277500, credit: 0, runningBalance: 245000, notes: 'HBL IBFT transfer', createdAt: daysBeforeIso(10) },
  { id: 'sl-3', supplierId: 'sup-02', type: 'purchase', referenceNo: 'PO-2002', debit: 0, credit: 485000, runningBalance: 485000, notes: 'Partial GRN-3002 received', createdAt: daysBeforeIso(4) },
  { id: 'sl-4', supplierId: 'sup-02', type: 'payment', referenceNo: 'PAY-902', debit: 300000, credit: 0, runningBalance: 185000, notes: 'Advance HBL cheque', createdAt: daysBeforeIso(3) },
  { id: 'sl-5', supplierId: 'sup-03', type: 'opening', referenceNo: 'OPENING', debit: 0, credit: 92000, runningBalance: 92000, notes: 'Opening balance payable', createdAt: daysBeforeIso(40) },
  { id: 'sl-6', supplierId: 'sup-04', type: 'opening', referenceNo: 'OPENING', debit: 0, credit: 64000, runningBalance: 64000, notes: 'Laminate stock invoice payable', createdAt: daysBeforeIso(25) },
  { id: 'sl-7', supplierId: 'sup-05', type: 'opening', referenceNo: 'OPENING', debit: 0, credit: 28000, runningBalance: 28000, notes: 'Adhesive drums payable', createdAt: daysBeforeIso(19) },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'sm-1', variantId: 'var-06', variantName: 'Lasani MDF Plain 16mm (8x4)', locationId: 'loc-godown', type: 'purchase', quantityDelta: 80, unitCost: 3450, referenceNo: 'GRN-3001', reason: 'Goods received from Lasani Wood', createdBy: 'Tariq Mahmood', createdAt: daysBeforeIso(14, 10, 0) },
  { id: 'sm-2', variantId: 'var-06', variantName: 'Lasani MDF Plain 16mm (8x4)', locationId: 'loc-godown', type: 'transfer_out', quantityDelta: -25, referenceNo: 'TRF-101', reason: 'Transferred to Main Shop', createdBy: 'Tariq Mahmood', createdAt: daysBeforeIso(7, 9, 30) },
  { id: 'sm-3', variantId: 'var-06', variantName: 'Lasani MDF Plain 16mm (8x4)', locationId: 'loc-shop', type: 'transfer_in', quantityDelta: 25, referenceNo: 'TRF-101', reason: 'Received from I-10 Godown', createdBy: 'Tariq Mahmood', createdAt: daysBeforeIso(7, 9, 30) },
  { id: 'sm-4', variantId: 'var-04', variantName: 'Marine Waterproof Plywood 18mm (8x4)', locationId: 'loc-godown', type: 'purchase', quantityDelta: 30, unitCost: 6400, referenceNo: 'GRN-3002', reason: 'Partial GRN from ZRK Group', createdBy: 'Tariq Mahmood', createdAt: daysBeforeIso(4, 15, 20) },
  { id: 'sm-5', variantId: 'var-01', variantName: 'Commercial Plywood 18mm (8x4)', locationId: 'loc-shop', type: 'sale', quantityDelta: -6, referenceNo: 'PW-1027', reason: 'POS Sale PW-1027', createdBy: 'Bilal Ahmed', createdAt: daysBeforeIso(0, 9, 15) },
  { id: 'sm-6', variantId: 'var-07', variantName: 'Lasani UV Glossy MDF 16mm – Pearl White', locationId: 'loc-shop', type: 'sale', quantityDelta: -8, referenceNo: 'PW-1028', reason: 'POS Sale PW-1028', createdBy: 'Bilal Ahmed', createdAt: daysBeforeIso(0, 10, 20) },
  { id: 'sm-7', variantId: 'var-03', variantName: 'Commercial Plywood 6mm (8x4)', locationId: 'loc-shop', type: 'adjustment', quantityDelta: -2, referenceNo: 'ADJ-204', reason: 'Corner water damage during rain', createdBy: 'Master Panda', createdAt: daysBeforeIso(2, 17, 10) },
];

export const INITIAL_ACCOUNT_TRANSACTIONS: AccountTransaction[] = [
  { id: 'at-1', accountId: 'acc-cash', accountName: 'Shop Cash Drawer', type: 'in', amount: 36100, referenceNo: 'PW-1027', description: 'Cash Sale PW-1027', createdAt: daysBeforeIso(0, 9, 15) },
  { id: 'at-2', accountId: 'acc-jc', accountName: 'JazzCash Business', type: 'in', amount: 73200, referenceNo: 'PW-1028', description: 'JazzCash Sale PW-1028', createdAt: daysBeforeIso(0, 10, 20) },
  { id: 'at-3', accountId: 'acc-cash', accountName: 'Shop Cash Drawer', type: 'out', amount: 3200, referenceNo: 'EXP', description: 'Generator diesel for cutting saw', createdAt: daysBeforeIso(0, 10, 40) },
  { id: 'at-4', accountId: 'acc-cash', accountName: 'Shop Cash Drawer', type: 'out', amount: 1850, referenceNo: 'EXP', description: 'Staff & carpenter guests tea/lunch', createdAt: daysBeforeIso(0, 12, 15) },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', userName: 'Master Panda', role: 'owner', module: 'Inventory', action: 'Stock Adjustment', details: 'Commercial Plywood 6mm (-2 sheets): Corner water damage', createdAt: daysBeforeIso(2, 17, 10) },
  { id: 'aud-2', userName: 'Tariq Mahmood', role: 'storekeeper', module: 'Purchases', action: 'GRN Received', details: 'GRN-3002 for PO-2002 (65 sheets received into Godown)', createdAt: daysBeforeIso(4, 15, 20) },
  { id: 'aud-3', userName: 'Bilal Ahmed', role: 'cashier', module: 'Cash Session', action: 'Opened Shift', details: 'Opened Shop Cash Drawer with Rs. 50,000', createdAt: daysBeforeIso(0, 8, 50) },
  { id: 'aud-4', userName: 'Bilal Ahmed', role: 'cashier', module: 'POS', action: 'Invoice Created', details: 'Sale PW-1030 — Walk-in / Hamza Architectural Wood', createdAt: daysBeforeIso(0, 13, 25) },
];
