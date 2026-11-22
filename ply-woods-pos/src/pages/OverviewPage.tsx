import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  HelpCircle,
  TrendingUp,
  Receipt,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  MessageCircle,
  Printer,
  BadgeDollarSign,
} from 'lucide-react';
import { PageId, Sale } from '../types/pos';
import { usePos } from '../store/PosContext';
import {
  buildWhatsAppReminderUrl,
  formatCompactPKR,
  formatDate,
  formatPKR,
  isSameDay,
} from '../utils/format';

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
  onPrintSale: (sale: Sale) => void;
}

type TimeRange = 'today' | '30d' | '90d' | '6m' | '12m';

const DONUT_COLORS = ['#60A5FA', '#7C5CFC', '#E86CE0', '#3CD2F0', '#A78BFA'];

const RANGE_OPTIONS: { id: TimeRange; label: string; days: number }[] = [
  { id: 'today', label: 'Today', days: 1 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '6m', label: '6 months', days: 180 },
  { id: '12m', label: '12 months', days: 365 },
];

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, onPrintSale }) => {
  const { state, permissions } = usePos();
  const [range, setRange] = useState<TimeRange>('6m');
  const [rightDonutMode, setRightDonutMode] = useState<'payments' | 'customers'>('payments');

  const activeSales = useMemo(
    () => state.sales.filter((s) => s.status !== 'returned' && s.status !== 'void'),
    [state.sales]
  );

  const rangeDays = RANGE_OPTIONS.find((r) => r.id === range)?.days || 180;

  const filteredSales = useMemo(() => {
    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    if (range === 'today') {
      return activeSales.filter((s) => isSameDay(s.createdAt));
    }
    return activeSales.filter((s) => new Date(s.createdAt).getTime() >= cutoff);
  }, [activeSales, range, rangeDays]);

  // KPI metrics
  const todaySales = useMemo(
    () => activeSales.filter((s) => isSameDay(s.createdAt)),
    [activeSales]
  );
  const todayRevenue = useMemo(
    () => todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
    [todaySales]
  );
  const todayInvoices = todaySales.length;

  const totalUdhaar = useMemo(
    () => state.customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0),
    [state.customers]
  );

  const totalPayables = useMemo(
    () => state.suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0),
    [state.suppliers]
  );

  const cashInHand = useMemo(
    () => state.accounts.find((a) => a.id === 'acc-cash')?.balance || 0,
    [state.accounts]
  );

  const rangeRevenue = useMemo(
    () => filteredSales.reduce((sum, s) => sum + s.grandTotal, 0),
    [filteredSales]
  );

  const avgBillValue = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return Math.round(rangeRevenue / filteredSales.length);
  }, [filteredSales.length, rangeRevenue]);

  const todayProfit = useMemo(() => {
    return todaySales.reduce((sum, s) => {
      const cogs = s.items.reduce((c, it) => c + it.unitCost * it.quantity, 0);
      return sum + (s.grandTotal - s.taxAmount - cogs);
    }, 0);
  }, [todaySales]);

  // Smooth spline area chart data (grouped by Month or Day depending on range)
  const chartData = useMemo(() => {
    if (range === 'today') {
      const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
      return hours.map((h) => {
        const hr = parseInt(h.slice(0, 2), 10);
        const total = todaySales
          .filter((s) => new Date(s.createdAt).getHours() === hr)
          .reduce((acc, s) => acc + s.grandTotal, 0);
        return { label: h, sales: total };
      });
    }

    if (range === '30d') {
      const buckets: { label: string; sales: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = Date.now() - (i + 1) * 5 * 86400000;
        const end = Date.now() - i * 5 * 86400000;
        const d = new Date(end);
        const label = d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
        const total = activeSales
          .filter((s) => {
            const t = new Date(s.createdAt).getTime();
            return t >= start && t <= end;
          })
          .reduce((acc, s) => acc + s.grandTotal, 0);
        buckets.push({ label, sales: total });
      }
      return buckets;
    }

    // Monthly series (last 6 months)
    const monthsCount = range === '12m' ? 12 : range === '90d' ? 4 : 6;
    const now = new Date();
    const list: { key: string; label: string; sales: number }[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleDateString('en-PK', { month: 'short' });
      list.push({ key, label, sales: 0 });
    }
    filteredSales.forEach((s) => {
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = list.find((m) => m.key === key);
      if (found) found.sales += s.grandTotal;
    });
    return list;
  }, [activeSales, filteredSales, range, todaySales]);

  // Donut 1: Sales by Category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        const val = it.quantity * it.unitPrice - it.lineDiscount;
        map[it.category] = (map[it.category] || 0) + val;
      });
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, value]) => ({
        name,
        value,
        pct: Math.round((value / total) * 100),
      }));
    return sorted;
  }, [filteredSales]);

  // Donut 2: Payment Methods OR Top Customers
  const paymentOrCustomerBreakdown = useMemo(() => {
    if (rightDonutMode === 'payments') {
      const map: Record<string, number> = {};
      filteredSales.forEach((s) => {
        s.payments.forEach((p) => {
          const label =
            p.method === 'cash'
              ? 'Cash'
              : p.method === 'bank'
                ? 'Bank Transfer'
                : p.method === 'jazzcash'
                  ? 'JazzCash'
                  : p.method === 'easypaisa'
                    ? 'Easypaisa'
                    : p.method === 'credit'
                      ? 'Credit (Udhaar)'
                      : 'Cheque';
          map[label] = (map[label] || 0) + p.amount;
        });
      });
      const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, value]) => ({
          name,
          value,
          pct: Math.round((value / total) * 100),
        }));
    } else {
      const map: Record<string, number> = {};
      filteredSales.forEach((s) => {
        map[s.customerName] = (map[s.customerName] || 0) + s.grandTotal;
      });
      const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, value]) => ({
          name,
          value,
          pct: Math.round((value / total) * 100),
        }));
    }
  }, [filteredSales, rightDonutMode]);

  // Low stock items
  const lowStockProducts = useMemo(
    () =>
      state.products
        .filter((p) => p.stock['loc-shop'] <= p.lowStockAlert)
        .sort((a, b) => a.stock['loc-shop'] - b.stock['loc-shop'])
        .slice(0, 5),
    [state.products]
  );

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; rev: number; unit: string }> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        if (!map[it.name]) {
          map[it.name] = { name: it.name, qty: 0, rev: 0, unit: it.unit };
        }
        map[it.name].qty += it.quantity;
        map[it.name].rev += it.quantity * it.unitPrice - it.lineDiscount;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5);
  }, [filteredSales]);

  // Top Udhaar receivables
  const topReceivables = useMemo(
    () =>
      state.customers
        .filter((c) => c.currentBalance > 0)
        .sort((a, b) => b.currentBalance - a.currentBalance)
        .slice(0, 5),
    [state.customers]
  );

  const topCat = categoryBreakdown[0];
  const topRight = paymentOrCustomerBreakdown[0];

  return (
    <div className="space-y-6">
      {/* Page Header Row — exact Concured layout */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[22px] font-bold tracking-tight text-[#1A1B2E] dark:text-white">
            Shop statistics
          </h1>
          <span
            title="Live sales, Udhaar receivables, inventory alerts and category mix across PLY Woods"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC] cursor-help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Pill Segmented Time Filter */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[#F7F8FC] dark:bg-[#22253A] p-1 border border-[#ECEEF5] dark:border-[#2E314D]">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRange(opt.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                range === opt.id
                  ? 'bg-[#7C5CFC] text-white shadow-sm shadow-[#7C5CFC]/30'
                  : 'text-[#6B708A] dark:text-[#A3A7C2] hover:text-[#1A1B2E] dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Concured Hero Row: Left Total Sales Line Chart + Right 2x2 KPI Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Large Card: Total Sales Smooth Spline Chart */}
        <div className="concured-card xl:col-span-7 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#1A1B2E] dark:text-white">
                Total sales
              </h2>
              <p className="text-xs text-[#8B8FA8]">
                {filteredSales.length} invoices • Cash in hand: {formatPKR(cashInHand)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-extrabold text-[#7C5CFC] tracking-tight">
                {formatCompactPKR(rangeRevenue)}
              </div>
              <div className="text-[11px] font-medium text-[#8B8FA8]">
                {RANGE_OPTIONS.find((r) => r.id === range)?.label} revenue
              </div>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#7C5CFC" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke={state.settings.darkMode ? '#2B2F4A' : '#EEF0F7'}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9498B0', fontSize: 11.5 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9498B0', fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                        ? `${Math.round(v / 1_000)}K`
                        : `${v}`
                  }
                  width={48}
                />
                <Tooltip
                  cursor={{ stroke: '#7C5CFC', strokeWidth: 1.5, strokeDasharray: '0' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-2xl bg-[#23253A] px-4 py-2.5 text-center shadow-xl border border-white/10">
                        <div className="text-[15px] font-bold text-white">
                          {formatPKR(Number(payload[0].value || 0))}
                        </div>
                        <div className="text-[11px] text-[#B4B8D4]">Sales • {label}</div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#7C5CFC"
                  strokeWidth={3}
                  fill="url(#salesAreaGrad)"
                  activeDot={{
                    r: 6,
                    fill: '#7C5CFC',
                    stroke: '#FFFFFF',
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 2x2 KPI Cards Grid matching Concured */}
        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: HERO GRADIENT CARD — Today's Sales */}
          <div
            onClick={() => onNavigate('pos')}
            className="hero-gradient rounded-[20px] p-5 text-white shadow-hero cursor-pointer transition-transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[152px]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11.5px] font-bold text-white">
                <span className="text-[#86EFAC]">▲</span> 14.2%
              </span>
            </div>
            <div className="mt-4">
              <div className="text-[26px] font-extrabold tracking-tight leading-tight">
                {formatCompactPKR(todayRevenue)}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-medium text-white/85">Today&apos;s Sales</span>
                <span
                  title="Total sales billed today across all payment methods"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold"
                >
                  ?
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Invoices Today */}
          <div
            onClick={() => onNavigate('sales')}
            className="concured-kpi-tile p-5 cursor-pointer flex flex-col justify-between min-h-[152px]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC]">
                <Receipt className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#22C55E]">
                ▲ 8.5%
              </span>
            </div>
            <div className="mt-4">
              <div className="text-[28px] font-extrabold text-[#1A1B2E] dark:text-white tracking-tight leading-tight">
                {todayInvoices}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B8FA8]">Invoices Today</span>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#7C5CFC] text-white text-[10px] font-bold">
                  ?
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Credit Outstanding (Udhaar) */}
          <div
            onClick={() => onNavigate('customers')}
            className="concured-kpi-tile p-5 cursor-pointer flex flex-col justify-between min-h-[152px]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCE7FA] dark:bg-[#E86CE0]/20 text-[#E86CE0]">
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#EF4444]">
                ▼ 2.1%
              </span>
            </div>
            <div className="mt-4">
              <div className="text-[26px] font-extrabold text-[#1A1B2E] dark:text-white tracking-tight leading-tight">
                {formatCompactPKR(totalUdhaar)}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B8FA8]">
                  Credit Outstanding (Udhaar)
                </span>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#7C5CFC] text-white text-[10px] font-bold">
                  ?
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Today's Gross Profit (Admin/Manager) OR Average Bill Value (Cashier — no profit shown!) */}
          <div
            onClick={() => onNavigate('reports')}
            className="concured-kpi-tile p-5 cursor-pointer flex flex-col justify-between min-h-[152px]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F7FC] dark:bg-[#3CD2F0]/20 text-[#0EA5E9]">
                {permissions.canViewCostAndProfit ? (
                  <BadgeDollarSign className="h-5 w-5" />
                ) : (
                  <ShoppingBag className="h-5 w-5" />
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#22C55E]">
                ▲ 5.4%
              </span>
            </div>
            <div className="mt-4">
              <div className="text-[26px] font-extrabold text-[#1A1B2E] dark:text-white tracking-tight leading-tight">
                {permissions.canViewCostAndProfit
                  ? formatCompactPKR(todayProfit)
                  : formatCompactPKR(avgBillValue)}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B8FA8]">
                  {permissions.canViewCostAndProfit
                    ? `Today's Profit • Avg ${formatCompactPKR(avgBillValue)}`
                    : 'Average Bill Value'}
                </span>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#7C5CFC] text-white text-[10px] font-bold">
                  ?
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Concured Donut + Table Row: Sales by Category & Payment Methods / Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: Sales by Category */}
        <div className="concured-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-[#1A1B2E] dark:text-white">
              Sales by Category
            </h3>
            <span className="text-xs text-[#8B8FA8]">Share of revenue</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
            {/* Left Table */}
            <div className="sm:col-span-7">
              <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] px-3 py-2 flex items-center justify-between text-[11.5px] font-semibold text-[#8B8FA8] mb-2">
                <span>Category</span>
                <span>Share %</span>
              </div>
              <div className="space-y-2.5">
                {categoryBreakdown.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-2 py-1 text-[13px] rounded-lg hover:bg-[#F7F8FC] dark:hover:bg-[#22253A] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-2 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                      />
                      <span className="text-xs text-[#8B8FA8] w-3">{idx + 1}</span>
                      <span className="font-medium text-[#2D2F45] dark:text-[#E2E4F5] truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-[#1A1B2E] dark:text-white ml-2">
                      {item.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Donut Chart */}
            <div className="sm:col-span-5 relative h-[185px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={2}
                    cornerRadius={8}
                    stroke="none"
                  >
                    {categoryBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatPKR(Number(val))}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#23253A',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {topCat && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-2xl font-extrabold text-[#38BDF8] leading-none">
                    {topCat.pct}%
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-[#8B8FA8] truncate max-w-[92px]">
                    {topCat.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card B: Payment Methods / Top Customers */}
        <div className="concured-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-[#1A1B2E] dark:text-white">
              {rightDonutMode === 'payments' ? 'Payment Methods' : 'Top Customers'}
            </h3>
            <div className="inline-flex rounded-full bg-[#F3F4FA] dark:bg-[#22253A] p-0.5 text-[11px] font-semibold">
              <button
                onClick={() => setRightDonutMode('payments')}
                className={`rounded-full px-2.5 py-1 transition ${
                  rightDonutMode === 'payments'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#6B708A] dark:text-[#A3A7C2]'
                }`}
              >
                Payments
              </button>
              <button
                onClick={() => setRightDonutMode('customers')}
                className={`rounded-full px-2.5 py-1 transition ${
                  rightDonutMode === 'customers'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#6B708A] dark:text-[#A3A7C2]'
                }`}
              >
                Customers
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
            {/* Left Table */}
            <div className="sm:col-span-7">
              <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] px-3 py-2 flex items-center justify-between text-[11.5px] font-semibold text-[#8B8FA8] mb-2">
                <span>{rightDonutMode === 'payments' ? 'Method' : 'Customer'}</span>
                <span>Share %</span>
              </div>
              <div className="space-y-2.5">
                {paymentOrCustomerBreakdown.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-2 py-1 text-[13px] rounded-lg hover:bg-[#F7F8FC] dark:hover:bg-[#22253A] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-2 w-3.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: DONUT_COLORS[(idx + 1) % DONUT_COLORS.length],
                        }}
                      />
                      <span className="text-xs text-[#8B8FA8] w-3">{idx + 1}</span>
                      <span className="font-medium text-[#2D2F45] dark:text-[#E2E4F5] truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-[#1A1B2E] dark:text-white ml-2">
                      {item.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Donut Chart */}
            <div className="sm:col-span-5 relative h-[185px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentOrCustomerBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={2}
                    cornerRadius={8}
                    stroke="none"
                  >
                    {paymentOrCustomerBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={DONUT_COLORS[(idx + 1) % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatPKR(Number(val))}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#23253A',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {topRight && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-2xl font-extrabold text-[#7C5CFC] leading-none">
                    {topRight.pct}%
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-[#8B8FA8] truncate max-w-[92px]">
                    {topRight.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Extra Operational Cards Row: Low Stock, Recent Sales, Top Products, Receivables Due */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low Stock Items */}
        <div className="concured-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-[15.5px] font-semibold text-[#1A1B2E] dark:text-white">
                Low Stock Alerts (Main Shop)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-[#7C5CFC] hover:underline inline-flex items-center gap-1"
            >
              Transfer / Restock <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-[#8B8FA8] py-4 text-center">All items are well stocked.</p>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-[#F8F9FD] dark:bg-[#22253A] px-3.5 py-2.5"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-xs font-semibold text-[#1A1B2E] dark:text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-[#8B8FA8]">
                      {p.rackLocation} • Godown has {p.stock['loc-godown']} {p.unit}s
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-50 dark:bg-red-950/50 px-2.5 py-1 text-xs font-bold text-[#EF4444]">
                    {p.stock['loc-shop']} / {p.lowStockAlert} min
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Receivables Due (Udhaar) */}
        <div className="concured-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#E86CE0]" />
              <h3 className="text-[15.5px] font-semibold text-[#1A1B2E] dark:text-white">
                Udhaar Receivables Due
              </h3>
            </div>
            <div className="text-xs text-[#8B8FA8]">
              Payables: <strong className="text-[#1A1B2E] dark:text-white">{formatCompactPKR(totalPayables)}</strong>
            </div>
          </div>
          <div className="space-y-2.5">
            {topReceivables.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-[#F8F9FD] dark:bg-[#22253A] px-3.5 py-2.5"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-xs font-semibold text-[#1A1B2E] dark:text-white truncate">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-[#8B8FA8] capitalize">
                    {c.type} • {c.phone || 'No phone'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-[#EF4444]">
                    {formatPKR(c.currentBalance)}
                  </span>
                  <a
                    href={buildWhatsAppReminderUrl(c.name, c.phone, c.currentBalance, state.settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Send WhatsApp Udhaar reminder"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E] hover:text-white transition"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="concured-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15.5px] font-semibold text-[#1A1B2E] dark:text-white">
              Recent Sales
            </h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-[#7C5CFC] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {state.sales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-[#F7F8FC] dark:hover:bg-[#22253A] transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#7C5CFC]">{sale.invoiceNo}</span>
                    <span className="text-xs font-semibold text-[#1A1B2E] dark:text-white truncate">
                      {sale.customerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8B8FA8]">
                    {formatDate(sale.createdAt)} • {sale.items.length} items
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#1A1B2E] dark:text-white">
                      {formatPKR(sale.grandTotal)}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        sale.status === 'paid'
                          ? 'text-[#22C55E]'
                          : sale.status === 'returned'
                            ? 'text-[#8B8FA8]'
                            : 'text-[#EF4444]'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                  <button
                    onClick={() => onPrintSale(sale)}
                    className="rounded-lg p-1.5 text-[#7C809B] hover:bg-[#EFEBFD] hover:text-[#7C5CFC]"
                    title="Print / Share Receipt"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="concured-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15.5px] font-semibold text-[#1A1B2E] dark:text-white">
              Top Selling Products
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-[#7C5CFC] hover:underline"
            >
              Full report
            </button>
          </div>
          <div className="space-y-2.5">
            {topProducts.map((tp, idx) => (
              <div
                key={tp.name}
                className="flex items-center justify-between rounded-xl bg-[#F8F9FD] dark:bg-[#22253A] px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[11px] font-bold text-[#7C5CFC]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#1A1B2E] dark:text-white truncate">
                      {tp.name}
                    </div>
                    <div className="text-[11px] text-[#8B8FA8]">
                      Sold: {tp.qty} {tp.unit}s
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#1A1B2E] dark:text-white shrink-0">
                  {formatPKR(tp.rev)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
