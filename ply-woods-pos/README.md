# PLY Woods POS — Plywood, MDF & Laminate Retail/Wholesale System

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
cd ply-woods-pos
npm install
npm run dev
```

### Build & Preview
```bash
npm run build
npm run preview
```

## Demo Accounts

The system ships with 4 demo accounts (one per role). These can be disabled in Settings → Staff & Roles → Demo Mode.

| Role | Email | Password | PIN |
|------|-------|----------|-----|
| Owner / Admin | owner@plywoods.pk | owner123 | 1234 |
| Manager | manager@plywoods.pk | manager123 | 1234 |
| Cashier | cashier@plywoods.pk | cashier123 | 1234 |
| Storekeeper | store@plywoods.pk | store123 | 1234 |

### Role Permissions

- **Owner/Admin**: Full access — staff management, settings, audit log, cost price, profit, delete/edit invoices, stock adjustments, backups.
- **Manager**: Sales, purchases, inventory, customers, suppliers, expenses, reports, cost price. Can approve discounts and returns. Cannot manage owner accounts, backups, or critical settings.
- **Cashier**: POS, customers (add/view), receive payments, hold bills, own sales history. No cost price, no profit, no purchase data. Discount limited to 5% (manager PIN required above).
- **Storekeeper**: Inventory, stock transfers, goods received, stock adjustments (with reason), low-stock and offcut stock. No cost price, no sales profit, no POS payments.

### First-Run Setup

If no users exist in the system, a "Create Owner Account" screen will be shown to bootstrap the system.

### Idle Timeout

Sessions automatically log out after 30 minutes of inactivity (configurable in settings). A warning modal appears 2 minutes before logout.

### Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 3
- Lucide React (icons)
- Recharts (charts)
- Zod (validation)

### Supabase Integration

The `supabase/migrations/` directory contains SQL migration files for the database schema. To connect to Supabase:

1. Create a Supabase project
2. Run the migration files in order
3. Set environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Install `@supabase/supabase-js` and update `AuthContext.tsx` to use Supabase Auth

The current implementation uses localStorage for auth, which can be replaced with Supabase Auth by updating the `AuthContext`.