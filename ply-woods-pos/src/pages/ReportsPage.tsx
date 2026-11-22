import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download, Printer, Lock } from 'lucide-react';
import { usePos } from '../store/PosContext';
import { downloadCSV, formatDate, formatPKR } from '../utils/format';

type ReportTab = 'sales' | 'pnl' | 'stock' | 'ledgers' | 'daybook' | 'returns';

export const ReportsPage: React.FC = () => {
  const { state, permissions, notify } = usePos();
  const [tab, setTab] = useState<ReportTab>('sales');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 180);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const salesInRange = useMemo(() => {
    const start = new Date(`${fromDate}T00:00:00`).getTime();
    const end = new Date(`${toDate}T23:59:59`).getTime();
    return state.sales.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= start && t <= end && s.status !== 'returned' && s.status !== 'void';
    });
  }, [state.sales, fromDate, toDate]);

  const expensesInRange = useMemo(() => {
    const start = new Date(`${fromDate}T00:00:00`).getTime();
    const end = new Date(`${toDate}T23:59:59`).getTime();
    return state.expenses.filter((e) => {
      const t = new Date(`${e.date}T12:00:00`).getTime();
      return t >= start && t <= end;
    });
  }, [state.expenses, fromDate, toDate]);

  // Sales by Category chart
  const salesByCat = useMemo(() => {
    const map: Record<string, number> = {};
    salesInRange.forEach((s) => {
      s.items.forEach((it) => {
        map[it.category] = (map[it.category] || 0) + (it.quantity * it.unitPrice - it.lineDiscount);
      });
    });
    return Object.entries(map)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [salesInRange]);

  // P&L calculations
  const pnl = useMemo(() => {
    const grossRevenue = salesInRange.reduce((s, x) => s + x.grandTotal - x.taxAmount, 0);
    const totalDiscounts = salesInRange.reduce((s, x) => s + x.discountAmount, 0);
    const cogs = salesInRange.reduce(
      (s, x) => s + x.items.reduce((c, it) => c + it.unitCost * it.quantity, 0),
      0
    );
    const grossProfit = grossRevenue - cogs;
    const totalExpenses = expensesInRange.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const marginPct = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0.0';
    return { grossRevenue, totalDiscounts, cogs, grossProfit, totalExpenses, netProfit, marginPct };
  }, [salesInRange, expensesInRange]);

  // Dead stock (never sold in range)
  const soldVariantIds = useMemo(() => {
    const set = new Set<string>();
    salesInRange.forEach((s) => s.items.forEach((it) => it.variantId && set.add(it.variantId)));
    return set;
  }, [salesInRange]);

  const deadStock = useMemo(
    () => state.products.filter((p) => !soldVariantIds.has(p.id)),
    [state.products, soldVariantIds]
  );

  const stockValuation = useMemo(
    () =>
      state.products.reduce(
        (s, p) => s + (p.stock['loc-shop'] + p.stock['loc-godown']) * p.purchaseCost,
        0
      ),
    [state.products]
  );

  const returnedSales = useMemo(
    () => state.sales.filter((s) => s.status === 'returned'),
    [state.sales]
  );

  const exportCurrentReport = () => {
    if (tab === 'sales') {
      downloadCSV(
        `ply-woods-sales-report-${fromDate}-to-${toDate}.csv`,
        ['Invoice', 'Date', 'Customer', 'Tier', 'Total', 'Paid', 'Due', 'Status'],
        salesInRange.map((s) => [
          s.invoiceNo,
          formatDate(s.createdAt),
          s.customerName,
          s.priceTier,
          s.grandTotal,
          s.paidAmount,
          s.dueAmount,
          s.status,
        ])
      );
    } else if (tab === 'stock') {
      downloadCSV(
        `ply-woods-stock-report-${toDate}.csv`,
        [
          'SKU',
          'Product',
          'ShopQty',
          'GodownQty',
          'TotalQty',
          ...(permissions.canViewCostAndProfit ? ['AvgCost', 'Valuation'] : []),
        ],
        state.products.map((p) => {
          const total = p.stock['loc-shop'] + p.stock['loc-godown'];
          return [
            p.sku,
            p.name,
            p.stock['loc-shop'],
            p.stock['loc-godown'],
            total,
            ...(permissions.canViewCostAndProfit ? [p.purchaseCost, total * p.purchaseCost] : []),
          ];
        })
      );
    } else {
      downloadCSV(
        `ply-woods-cashbook-${toDate}.csv`,
        ['Date', 'Account', 'Type', 'Description', 'Amount'],
        state.accountTransactions.map((t) => [
          formatDate(t.createdAt),
          t.accountName,
          t.type,
          t.description,
          t.amount,
        ])
      );
    }
    notify('Report exported to CSV/Excel');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Financial &amp; Inventory Reports
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Filter by date range and export to Excel (CSV) or print to PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field w-36 py-2 text-xs"
          />
          <span className="text-[#8B8FA8]">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field w-36 py-2 text-xs"
          />
          <button onClick={exportCurrentReport} className="btn-secondary py-2 text-xs">
            <Download className="h-3.5 w-3.5" /> Export Excel/CSV
          </button>
          <button onClick={() => window.print()} className="btn-primary py-2 text-xs">
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-[#F3F4FA] dark:bg-[#22253A] p-1.5 text-xs font-semibold">
        {(
          [
            ['sales', 'Sales Analysis'],
            ['pnl', 'Profit & Loss'],
            ['stock', 'Stock & Dead Stock'],
            ['ledgers', 'Receivables & Payables'],
            ['daybook', 'Cash Book / Day Book'],
            ['returns', 'Returns Report'],
          ] as [ReportTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-3.5 py-2 transition ${
              tab === id ? 'bg-[#7C5CFC] text-white shadow-sm' : 'text-[#6B708A] dark:text-[#A3A7C2]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div id="printable-area" className="space-y-5">
        {/* 1. SALES ANALYSIS */}
        {tab === 'sales' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="concured-kpi-tile p-4">
                <div className="text-xs text-[#8B8FA8]">Period Sales</div>
                <div className="text-2xl font-extrabold text-[#7C5CFC] mt-1">
                  {formatPKR(salesInRange.reduce((s, x) => s + x.grandTotal, 0))}
                </div>
              </div>
              <div className="concured-kpi-tile p-4">
                <div className="text-xs text-[#8B8FA8]">Invoices Count</div>
                <div className="text-2xl font-extrabold text-[#1A1B2E] dark:text-white mt-1">
                  {salesInRange.length}
                </div>
              </div>
              <div className="concured-kpi-tile p-4">
                <div className="text-xs text-[#8B8FA8]">Collected vs Udhaar</div>
                <div className="text-lg font-extrabold text-[#22C55E] mt-1">
                  {formatPKR(salesInRange.reduce((s, x) => s + x.paidAmount, 0))}
                  <span className="text-xs text-[#EF4444] ml-2">
                    ({formatPKR(salesInRange.reduce((s, x) => s + x.dueAmount, 0))} due)
                  </span>
                </div>
              </div>
            </div>

            <div className="concured-card p-6">
              <h3 className="text-sm font-bold text-[#1A1B2E] dark:text-white mb-4">
                Revenue by Timber / Board Category
              </h3>
              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByCat}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EEF0F7" />
                    <XAxis dataKey="category" tick={{ fill: '#8B8FA8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#8B8FA8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                    />
                    <Tooltip formatter={(v) => formatPKR(Number(v))} />
                    <Bar dataKey="revenue" fill="#7C5CFC" radius={[10, 10, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 2. PROFIT & LOSS (Restricted for Cashier!) */}
        {tab === 'pnl' &&
          (!permissions.canViewCostAndProfit ? (
            <div className="concured-card p-12 text-center space-y-2">
              <Lock className="mx-auto h-9 w-9 text-[#7C5CFC]" />
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Access Restricted ({permissions.label})
              </h3>
              <p className="text-xs text-[#8B8FA8] max-w-md mx-auto">
                Cost of Goods Sold (COGS) and Profit &amp; Loss reports are strictly hidden from Cashier and Storekeeper roles. Switch to Owner or Manager to view.
              </p>
            </div>
          ) : (
            <div className="concured-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1F2F8] dark:border-[#2A2D45] pb-3">
                <h3 className="text-base font-bold">
                  Profit &amp; Loss Statement ({fromDate} to {toDate})
                </h3>
                <span className="rounded-full bg-[#EFEBFD] px-3 py-1 text-xs font-bold text-[#7C5CFC]">
                  Net Margin: {pnl.marginPct}%
                </span>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between py-2 border-b border-dashed border-[#ECEEF5] dark:border-[#2A2D45]">
                  <span className="text-[#6B708A]">Net Sales Revenue (excl. GST)</span>
                  <strong className="text-[#1A1B2E] dark:text-white">
                    {formatPKR(pnl.grossRevenue)}
                  </strong>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#ECEEF5] dark:border-[#2A2D45]">
                  <span className="text-[#6B708A]">Less: Cost of Goods Sold (COGS)</span>
                  <strong className="text-[#EF4444]">-{formatPKR(pnl.cogs)}</strong>
                </div>
                <div className="flex justify-between py-2.5 px-3 rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] font-bold">
                  <span>Gross Profit</span>
                  <span className="text-[#22C55E]">{formatPKR(pnl.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#ECEEF5] dark:border-[#2A2D45]">
                  <span className="text-[#6B708A]">
                    Less: Operating Expenses ({expensesInRange.length} entries)
                  </span>
                  <strong className="text-[#EF4444]">-{formatPKR(pnl.totalExpenses)}</strong>
                </div>
                <div className="hero-gradient rounded-2xl p-4 text-white flex justify-between items-center text-base font-extrabold">
                  <span>Net Profit</span>
                  <span className="text-2xl">{formatPKR(pnl.netProfit)}</span>
                </div>
              </div>
            </div>
          ))}

        {/* 3. STOCK VALUATION, LOW STOCK, DEAD STOCK & OFFCUTS */}
        {tab === 'stock' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {permissions.canViewCostAndProfit && (
                <div className="concured-kpi-tile p-4">
                  <div className="text-xs text-[#8B8FA8]">Total Stock Valuation (Cost)</div>
                  <div className="text-2xl font-extrabold text-[#7C5CFC] mt-1">
                    {formatPKR(stockValuation)}
                  </div>
                </div>
              )}
              <div className="concured-kpi-tile p-4">
                <div className="text-xs text-[#8B8FA8]">Dead Stock SKUs (0 sales in range)</div>
                <div className="text-2xl font-extrabold text-amber-600 mt-1">
                  {deadStock.length}
                </div>
              </div>
              <div className="concured-kpi-tile p-4">
                <div className="text-xs text-[#8B8FA8]">Offcut Remnant Value</div>
                <div className="text-2xl font-extrabold text-[#3CD2F0] mt-1">
                  {formatPKR(
                    state.offcuts.reduce((s, o) => s + o.discountedPrice * o.quantity, 0)
                  )}
                </div>
              </div>
            </div>

            <div className="concured-card p-5">
              <h3 className="text-sm font-bold mb-3">
                Dead / Slow-Moving Stock (No Sales between {fromDate} &amp; {toDate})
              </h3>
              {deadStock.length === 0 ? (
                <p className="text-xs text-[#8B8FA8]">Every SKU had sales activity in this period!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {deadStock.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] px-3.5 py-2.5"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-[#8B8FA8]">
                        {p.stock['loc-shop'] + p.stock['loc-godown']} {p.unit} in stock
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. RECEIVABLES & PAYABLES */}
        {tab === 'ledgers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="concured-card p-5">
              <h3 className="text-sm font-bold mb-3">Customer Receivables (Udhaar)</h3>
              <div className="space-y-2 text-xs">
                {state.customers
                  .filter((c) => c.currentBalance > 0)
                  .sort((a, b) => b.currentBalance - a.currentBalance)
                  .map((c) => (
                    <div key={c.id} className="flex justify-between py-1.5 border-b border-[#F1F2F8] dark:border-[#2A2D45]">
                      <span className="font-semibold">{c.name}</span>
                      <span className="font-bold text-[#EF4444]">
                        {formatPKR(c.currentBalance)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="concured-card p-5">
              <h3 className="text-sm font-bold mb-3">Supplier Payables</h3>
              <div className="space-y-2 text-xs">
                {state.suppliers
                  .filter((s) => s.currentBalance > 0)
                  .sort((a, b) => b.currentBalance - a.currentBalance)
                  .map((s) => (
                    <div key={s.id} className="flex justify-between py-1.5 border-b border-[#F1F2F8] dark:border-[#2A2D45]">
                      <span className="font-semibold">{s.name}</span>
                      <span className="font-bold text-[#7C5CFC]">
                        {formatPKR(s.currentBalance)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. CASH BOOK / DAY BOOK */}
        {tab === 'daybook' && (
          <div className="concured-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Cash In</th>
                    <th className="px-4 py-3 text-right">Cash Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                  {state.accountTransactions.slice(0, 40).map((t) => {
                    const isIn = t.type === 'in' || t.type === 'transfer_in';
                    return (
                      <tr key={t.id}>
                        <td className="px-4 py-2.5 text-[#8B8FA8]">{formatDate(t.createdAt)}</td>
                        <td className="px-4 py-2.5 font-semibold">{t.accountName}</td>
                        <td className="px-4 py-2.5">{t.description}</td>
                        <td className="px-4 py-2.5 text-right text-[#22C55E] font-bold">
                          {isIn ? formatPKR(t.amount) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#EF4444] font-bold">
                          {!isIn ? formatPKR(t.amount) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. RETURNS REPORT */}
        {tab === 'returns' && (
          <div className="concured-card p-5">
            <h3 className="text-sm font-bold mb-3">Sales Returns &amp; Reversals</h3>
            {returnedSales.length === 0 ? (
              <p className="text-xs text-[#8B8FA8] py-6 text-center">
                No sales returns recorded yet. Return any invoice from the Sales page to test full stock &amp; ledger reversal.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {returnedSales.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-3"
                  >
                    <div>
                      <span className="font-bold text-[#7C5CFC]">{s.invoiceNo}</span> —{' '}
                      <strong>{s.customerName}</strong>
                      <div className="text-[11px] text-[#8B8FA8]">Reason: {s.returnReason}</div>
                    </div>
                    <span className="font-bold text-[#EF4444]">{formatPKR(s.grandTotal)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
