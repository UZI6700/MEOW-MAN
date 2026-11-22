-- ============================================================================
-- PLY Woods POS — Complete Supabase Postgres Schema, RLS & Transactional RPCs
-- Currency: PKR | Multi-location (Shop + Godown) | Offcuts | Udhaar Ledger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES & PROFILES
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY CHECK (id IN ('owner', 'manager', 'cashier', 'storekeeper')),
  name TEXT NOT NULL,
  max_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  can_view_cost BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_prices BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete_invoices BOOLEAN NOT NULL DEFAULT FALSE,
  can_adjust_stock BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO roles (id, name, max_discount_pct, can_view_cost, can_edit_prices, can_delete_invoices, can_adjust_stock) VALUES
  ('owner', 'Owner / Admin', 100, TRUE, TRUE, TRUE, TRUE),
  ('manager', 'Manager', 15, TRUE, TRUE, FALSE, TRUE),
  ('cashier', 'Cashier', 5, FALSE, FALSE, FALSE, FALSE),
  ('storekeeper', 'Storekeeper', 0, FALSE, FALSE, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role_id TEXT NOT NULL REFERENCES roles(id) DEFAULT 'cashier',
  default_location_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2. CATALOG & INVENTORY TABLES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#7C5CFC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- sheet, sqft, rft, pcs
  label TEXT NOT NULL,
  urdu_label TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('shop', 'godown')),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  unit_code TEXT NOT NULL DEFAULT 'sheet',
  photo_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  thickness_mm NUMERIC(5,1),
  size_label TEXT NOT NULL DEFAULT '8x4 ft',
  length_ft NUMERIC(6,2) NOT NULL DEFAULT 8,
  width_ft NUMERIC(6,2) NOT NULL DEFAULT 4,
  sqft_per_unit NUMERIC(8,2) GENERATED ALWAYS AS (length_ft * width_ft) STORED,
  grade TEXT DEFAULT 'A / Premium',
  finish TEXT,
  purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  retail_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  per_sqft_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  low_stock_alert NUMERIC(10,2) NOT NULL DEFAULT 10,
  rack_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stock_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(variant_id, location_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale','sale_return','purchase','purchase_return','transfer_in','transfer_out','adjustment','opening')),
  quantity_delta NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2),
  reference_type TEXT,
  reference_id UUID,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offcuts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  length_ft NUMERIC(6,2) NOT NULL,
  width_ft NUMERIC(6,2) NOT NULL,
  area_sqft NUMERIC(8,2) GENERATED ALWAYS AS (length_ft * width_ft) STORED,
  quantity INTEGER NOT NULL DEFAULT 1,
  discounted_price NUMERIC(12,2) NOT NULL,
  source_sale_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. CUSTOMERS & SUPPLIERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('retail','contractor','wholesale')) DEFAULT 'retail',
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customer_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('opening','invoice','payment','return','credit_note')),
  reference_id UUID,
  reference_no TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS supplier_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('opening','purchase','payment','return')),
  reference_id UUID,
  reference_no TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SALES, PAYMENTS, RETURNS & QUOTATIONS
CREATE SEQUENCE IF NOT EXISTS invoice_no_seq START 1001;

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  price_tier TEXT NOT NULL CHECK (price_tier IN ('retail','wholesale')) DEFAULT 'retail',
  subtotal NUMERIC(14,2) NOT NULL,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cutting_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_vehicle TEXT,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('paid','partial','unpaid','returned','void')) DEFAULT 'paid',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  offcut_id UUID REFERENCES offcuts(id),
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  is_custom_cut BOOLEAN NOT NULL DEFAULT FALSE,
  cut_length_ft NUMERIC(6,2),
  cut_width_ft NUMERIC(6,2),
  sheets_consumed NUMERIC(10,2),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL,
  line_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('cash','bank','jazzcash','easypaisa','cheque')),
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sale_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  account_id UUID REFERENCES accounts(id),
  method TEXT NOT NULL CHECK (method IN ('cash','bank','jazzcash','easypaisa','cheque','credit')),
  amount NUMERIC(14,2) NOT NULL,
  reference_no TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_no TEXT NOT NULL UNIQUE,
  sale_id UUID NOT NULL REFERENCES sales(id),
  customer_id UUID REFERENCES customers(id),
  total_refund NUMERIC(14,2) NOT NULL,
  refund_mode TEXT NOT NULL CHECK (refund_mode IN ('cash','credit_note')),
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_no TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  payload JSONB NOT NULL,
  grand_total NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','converted','expired')) DEFAULT 'open',
  converted_sale_id UUID REFERENCES sales(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. PURCHASES & GRN
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_no TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status TEXT NOT NULL CHECK (status IN ('draft','ordered','partial','received','cancelled')) DEFAULT 'ordered',
  freight_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  unloading_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  ordered_qty NUMERIC(12,2) NOT NULL,
  received_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS goods_received (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_no TEXT NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  landed_extra_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  received_by UUID REFERENCES profiles(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EXPENSES, CASH SESSIONS, AUDIT & SETTINGS
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  tx_type TEXT NOT NULL CHECK (tx_type IN ('in','out','transfer_in','transfer_out')),
  amount NUMERIC(14,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id),
  opened_by UUID REFERENCES profiles(id),
  closed_by UUID REFERENCES profiles(id),
  opening_cash NUMERIC(14,2) NOT NULL,
  expected_cash NUMERIC(14,2),
  counted_cash NUMERIC(14,2),
  variance NUMERIC(14,2),
  status TEXT NOT NULL CHECK (status IN ('open','closed')) DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  role_id TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'PLY Woods',
  address TEXT,
  phone TEXT,
  ntn TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'PW-',
  receipt_footer TEXT DEFAULT 'Thank you for shopping at PLY Woods! Cut goods are non-returnable.',
  paper_size TEXT NOT NULL DEFAULT '80mm',
  urdu_receipt BOOLEAN NOT NULL DEFAULT TRUE,
  gst_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  default_low_stock NUMERIC(8,2) NOT NULL DEFAULT 10,
  manager_pin TEXT NOT NULL DEFAULT '1234',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON customer_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- TRIGGER: Keep stock_levels strictly derived from stock_movements
CREATE OR REPLACE FUNCTION apply_stock_movement() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_levels (variant_id, location_id, quantity, updated_at)
  VALUES (NEW.variant_id, NEW.location_id, NEW.quantity_delta, NOW())
  ON CONFLICT (variant_id, location_id)
  DO UPDATE SET quantity = stock_levels.quantity + NEW.quantity_delta, updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON stock_movements;
CREATE TRIGGER trg_apply_stock_movement
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();

-- ROW LEVEL SECURITY
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Example RLS Policies (Authenticated staff read; role-gated writes)
CREATE POLICY staff_read_products ON products FOR SELECT USING (auth.role() = 'authenticated' AND deleted_at IS NULL);
CREATE POLICY admin_write_products ON products FOR ALL USING (current_user_role() IN ('owner', 'manager', 'storekeeper'));
CREATE POLICY staff_read_sales ON sales FOR SELECT USING (auth.role() = 'authenticated' AND deleted_at IS NULL);
CREATE POLICY staff_insert_sales ON sales FOR INSERT WITH CHECK (current_user_role() IN ('owner', 'manager', 'cashier'));
CREATE POLICY owner_delete_sales ON sales FOR UPDATE USING (current_user_role() = 'owner');
CREATE POLICY admin_view_audit ON audit_logs FOR SELECT USING (current_user_role() IN ('owner', 'manager'));
