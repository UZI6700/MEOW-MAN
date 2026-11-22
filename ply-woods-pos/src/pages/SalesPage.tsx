import React, { useMemo, useState } from 'react';
import {
  Printer,
  RotateCcw,
  MessageCircle,
  Search,
  Play,
  Trash2,
  ArrowRightCircle,
  X,
} from 'lucide-react';
import { PageId, Sale } from '../types/pos';
import { usePos } from '../store/PosContext';
import {
  buildWhatsAppInvoiceUrl,
  formatDateTime,
  formatPKR,
} from '../utils/format';

interface SalesPageProps {
  initialTab?: 'invoices' | 'quotations' | 'held';
  onPrintSale: (sale: Sale) => void;
  onNavigate: (page: PageId) => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  initialTab = 'invoices',
  onPrintSale,
  onNavigate,
}) => {
  const {
    state,
    permissions,
    returnSale,
    resumeHeldCart,
    deleteHeldCart,
    convertQuotationToSale,
  } = usePos();

  const [tab, setTab] = useState<'invoices' | 'quotations' | 'held'>(initialTab);
  const [search, setSearch] = useState('');
  const [returnTarget, setReturnTarget] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState('Customer returned uncut sheets');
  const [refundMode, setRefundMode] = useState<'cash' | 'credit_note'>('cash');

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.sales.filter(
      (s) =>
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [state.sales, search]);

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTarget) return;
    if (returnSale(returnTarget.id, returnReason, refundMode)) {
      setReturnTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            {tab === 'held'
              ? 'Held Bills'
              : tab === 'quotations'
                ? 'Quotations & Estimates'
                : 'Sales, Returns & Quotations'}
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Manage completed invoices, process full stock/ledger reversals on returns, convert quotes, or resume held carts
          </p>
        </div>

        <div className="inline-flex rounded-full bg-[#F3F4FA] dark:bg-[#22253A] p-1 text-xs font-semibold">
          <button
            onClick={() => setTab('invoices')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'invoices' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Invoices ({state.sales.length})
          </button>
          <button
            onClick={() => setTab('quotations')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'quotations' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Quotations ({state.quotations.length})
          </button>
          <button
            onClick={() => setTab('held')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'held' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Held Bills ({state.heldCarts.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Invoices */}
      {tab === 'invoices' && (
        <>
          <div className="concured-card p-3.5">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B8FA8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, customer, status..."
                className="input-field pl-10 py-2 text-xs"
              />
            </div>
          </div>

          <div className="concured-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A] font-semibold">
                    <th className="px-4 py-3.5">Invoice #</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Items</th>
                    <th className="px-4 py-3.5 text-right">Total</th>
                    <th className="px-4 py-3.5 text-right">Paid / Udhaar</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#22253A]/60">
                      <td className="px-4 py-3 font-extrabold text-[#7C5CFC]">
                        {s.invoiceNo}
                        {!s.synced && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9.5px] text-amber-700">
                            Queued
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#8B8FA8] whitespace-nowrap">
                        {formatDateTime(s.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1A1B2E] dark:text-white">
                        {s.customerName}
                      </td>
                      <td className="px-4 py-3 text-[#6B708A]">{s.items.length} line(s)</td>
                      <td className="px-4 py-3 text-right font-bold text-[#1A1B2E] dark:text-white">
                        {formatPKR(s.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-[#22C55E] font-semibold">{formatPKR(s.paidAmount)}</div>
                        {s.dueAmount > 0 && (
                          <div className="text-[11px] text-[#EF4444] font-bold">
                            Due: {formatPKR(s.dueAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase ${
                            s.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : s.status === 'partial'
                                ? 'bg-amber-100 text-amber-700'
                                : s.status === 'returned'
                                  ? 'bg-gray-100 text-gray-500 line-through'
                                  : 'bg-red-50 text-[#EF4444]'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onPrintSale(s)}
                            title="Print / View Invoice"
                            className="rounded-lg p-1.5 text-[#7C5CFC] hover:bg-[#EFEBFD]"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <a
                            href={buildWhatsAppInvoiceUrl(s, state.settings)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Share via WhatsApp"
                            className="rounded-lg p-1.5 text-[#22C55E] hover:bg-emerald-50"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          {permissions.canDeleteOrReturnSales && s.status !== 'returned' && (
                            <button
                              onClick={() => setReturnTarget(s)}
                              title="Return / Reverse Sale"
                              className="rounded-lg p-1.5 text-[#EF4444] hover:bg-red-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Quotations */}
      {tab === 'quotations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.quotations.map((qt) => (
            <div key={qt.id} className="concured-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-extrabold text-[#7C5CFC]">{qt.quoteNo}</span>
                  <h4 className="text-sm font-bold text-[#1A1B2E] dark:text-white">
                    {qt.customerName}
                  </h4>
                  <p className="text-[11px] text-[#8B8FA8]">{formatDateTime(qt.createdAt)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                    qt.status === 'converted'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-[#EFEBFD] text-[#7C5CFC]'
                  }`}
                >
                  {qt.status === 'converted' ? `Converted (${qt.convertedInvoiceNo})` : 'Open'}
                </span>
              </div>
              <div className="text-xs text-[#6B708A] space-y-1 border-y border-[#F1F2F8] dark:border-[#2A2D45] py-2">
                {qt.items.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>
                      {it.name} × {it.quantity} {it.unit}
                    </span>
                    <span className="font-semibold">{formatPKR(it.quantity * it.unitPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-[#1A1B2E] dark:text-white">
                  {formatPKR(qt.grandTotal)}
                </span>
                {qt.status === 'open' && (
                  <button
                    onClick={() => {
                      const sale = convertQuotationToSale(qt.id, [
                        { method: 'cash', amount: qt.grandTotal },
                      ]);
                      if (sale) onPrintSale(sale);
                    }}
                    className="btn-primary py-2 text-xs"
                  >
                    <ArrowRightCircle className="h-4 w-4" /> Convert to Invoice
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Held Bills */}
      {tab === 'held' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.heldCarts.length === 0 ? (
            <div className="concured-card col-span-full p-10 text-center text-sm text-[#8B8FA8]">
              No held carts right now. Press <strong>F8</strong> in POS to hold an active bill!
            </div>
          ) : (
            state.heldCarts.map((h) => (
              <div key={h.id} className="concured-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#1A1B2E] dark:text-white">{h.label}</h4>
                    <p className="text-[11px] text-[#8B8FA8]">Held at {formatDateTime(h.heldAt)}</p>
                  </div>
                  <button
                    onClick={() => deleteHeldCart(h.id)}
                    className="text-[#EF4444] p-1 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-[#6B708A] space-y-1">
                  {h.items.map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span>
                        {it.name} × {it.quantity}
                      </span>
                      <span>{formatPKR(it.quantity * it.unitPrice)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      resumeHeldCart(h.id);
                      onNavigate('pos');
                    }}
                    className="btn-primary py-2 text-xs"
                  >
                    <Play className="h-3.5 w-3.5" /> Resume in POS
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Return Sale (Stock + Ledger Reversal) */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConfirmReturn}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                  Return Sale — {returnTarget.invoiceNo}
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  Reverses stock quantities via stock_movements &amp; updates customer ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="text-[#8B8FA8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-3">
                <div>
                  Customer: <strong>{returnTarget.customerName}</strong>
                </div>
                <div>
                  Grand Total: <strong>{formatPKR(returnTarget.grandTotal)}</strong> (Paid:{' '}
                  {formatPKR(returnTarget.paidAmount)}, Udhaar: {formatPKR(returnTarget.dueAmount)})
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Refund Mode</label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value as 'cash' | 'credit_note')}
                  className="input-field"
                >
                  <option value="cash">Cash Refund (deducts from Cash Drawer + clears due)</option>
                  <option value="credit_note">Credit Note to Customer Ledger</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Return Reason</label>
                <input
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-[12px] bg-[#EF4444] hover:bg-red-600 text-white font-semibold px-4 py-2.5 text-xs"
              >
                <RotateCcw className="h-4 w-4" /> Confirm Return &amp; Reverse Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
