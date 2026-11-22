import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  MessageCircle,
  Wallet,
  BookOpen,
  Printer,
  X,
  Search,
} from 'lucide-react';
import { Customer, CustomerType, PaymentMethod } from '../types/pos';
import { usePos } from '../store/PosContext';
import {
  buildWhatsAppReminderUrl,
  daysAgo,
  formatDate,
  formatPKR,
} from '../utils/format';

export const CustomersPage: React.FC = () => {
  const { state, addCustomer, receiveCustomerPayment } = usePos();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'aging'>('list');

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);

  // Add form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<CustomerType>('contractor');
  const [creditLimit, setCreditLimit] = useState(150000);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Payment form
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<Exclude<PaymentMethod, 'credit'>>('cash');
  const [payInvoiceNo, setPayInvoiceNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
    );
  }, [state.customers, search]);

  const totalUdhaar = useMemo(
    () => state.customers.reduce((s, c) => s + Math.max(0, c.currentBalance), 0),
    [state.customers]
  );

  // Aging buckets (0-30, 31-60, 60+)
  const agingRows = useMemo(() => {
    return state.customers
      .filter((c) => c.currentBalance > 0)
      .map((c) => {
        const entries = state.customerLedger.filter(
          (e) => e.customerId === c.id && e.debit > 0
        );
        const oldestDays =
          entries.length > 0
            ? Math.max(...entries.map((e) => daysAgo(e.createdAt)))
            : daysAgo(c.createdAt);
        return {
          customer: c,
          b0_30: oldestDays <= 30 ? c.currentBalance : 0,
          b31_60: oldestDays > 30 && oldestDays <= 60 ? c.currentBalance : 0,
          b60plus: oldestDays > 60 ? c.currentBalance : 0,
          oldestDays,
        };
      })
      .sort((a, b) => b.oldestDays - a.oldestDays);
  }, [state.customers, state.customerLedger]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      type,
      creditLimit,
      openingBalance,
    });
    setShowAdd(false);
    setName('');
    setPhone('');
    setAddress('');
    setOpeningBalance(0);
  };

  const openPayModal = (c: Customer) => {
    setPayCustomer(c);
    setPayAmount(Math.max(0, c.currentBalance));
    setPayMethod('cash');
    setPayInvoiceNo('');
    setPayNotes('Udhaar recovery');
  };

  const handleReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer || payAmount <= 0) return;
    receiveCustomerPayment(
      payCustomer.id,
      payAmount,
      payMethod,
      payNotes,
      payInvoiceNo || undefined
    );
    setPayCustomer(null);
  };

  const unpaidInvoicesForPayCustomer = useMemo(() => {
    if (!payCustomer) return [];
    return state.sales.filter(
      (s) => s.customerId === payCustomer.id && s.dueAmount > 0 && s.status !== 'returned'
    );
  }, [payCustomer, state.sales]);

  const ledgerEntries = useMemo(() => {
    if (!ledgerCustomer) return [];
    return state.customerLedger.filter((e) => e.customerId === ledgerCustomer.id);
  }, [ledgerCustomer, state.customerLedger]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Customers &amp; Udhaar (Credit) Ledger
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Track carpenters, contractors &amp; wholesale dealers, receive payments, and send WhatsApp reminders
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-xs">
          <UserPlus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Total Accounts</div>
          <div className="text-2xl font-extrabold text-[#1A1B2E] dark:text-white mt-1">
            {state.customers.length}
          </div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Total Udhaar Receivable</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">
            {formatPKR(totalUdhaar)}
          </div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">0–30 Days Current</div>
          <div className="text-2xl font-extrabold text-[#7C5CFC] mt-1">
            {formatPKR(agingRows.reduce((s, r) => s + r.b0_30, 0))}
          </div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">60+ Days Overdue</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {formatPKR(agingRows.reduce((s, r) => s + r.b60plus, 0))}
          </div>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-[#F3F4FA] dark:bg-[#22253A] p-1 text-xs font-semibold">
          <button
            onClick={() => setTab('list')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'list' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Customer Directory
          </button>
          <button
            onClick={() => setTab('aging')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'aging' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Udhaar Aging Report ({agingRows.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B8FA8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="input-field pl-10 py-2 text-xs"
          />
        </div>
      </div>

      {tab === 'list' ? (
        <div className="concured-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A] font-semibold">
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Phone &amp; Address</th>
                  <th className="px-4 py-3.5 text-right">Credit Limit</th>
                  <th className="px-4 py-3.5 text-right">Udhaar Balance</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                {filtered.map((c) => {
                  const overLimit = c.creditLimit > 0 && c.currentBalance > c.creditLimit;
                  return (
                    <tr key={c.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#22253A]/60">
                      <td className="px-4 py-3 font-bold text-[#1A1B2E] dark:text-white">
                        {c.name}
                        {overLimit && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-[#EF4444]">
                            Over Limit
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-2 py-0.5 text-[11px] font-semibold capitalize text-[#7C5CFC]">
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B708A]">
                        <div>{c.phone || '—'}</div>
                        <div className="text-[11px] text-[#8B8FA8]">{c.address}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-[#6B708A]">
                        {c.creditLimit > 0 ? formatPKR(c.creditLimit) : 'Cash Only'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-extrabold ${
                          c.currentBalance > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'
                        }`}
                      >
                        {formatPKR(c.currentBalance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {c.id !== 'cust-walkin' && (
                            <>
                              <button
                                onClick={() => openPayModal(c)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-2.5 py-1.5 text-[11px] font-bold text-[#7C5CFC] hover:bg-[#7C5CFC] hover:text-white transition"
                              >
                                <Wallet className="h-3.5 w-3.5" /> Receive
                              </button>
                              <button
                                onClick={() => setLedgerCustomer(c)}
                                className="rounded-lg p-1.5 text-[#5C607B] hover:bg-[#F3F4FA]"
                                title="Running Ledger & Printable Statement"
                              >
                                <BookOpen className="h-4 w-4" />
                              </button>
                              {c.currentBalance > 0 && (
                                <a
                                  href={buildWhatsAppReminderUrl(
                                    c.name,
                                    c.phone,
                                    c.currentBalance,
                                    state.settings
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="WhatsApp Udhaar Reminder"
                                  className="rounded-lg p-1.5 text-[#22C55E] hover:bg-emerald-50"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="concured-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A] font-semibold">
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5 text-right">0–30 Days</th>
                  <th className="px-4 py-3.5 text-right">31–60 Days</th>
                  <th className="px-4 py-3.5 text-right">60+ Days</th>
                  <th className="px-4 py-3.5 text-right">Total Due</th>
                  <th className="px-4 py-3.5 text-right">Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                {agingRows.map((r) => (
                  <tr key={r.customer.id}>
                    <td className="px-4 py-3 font-bold text-[#1A1B2E] dark:text-white">
                      {r.customer.name}
                      <span className="ml-2 text-[11px] font-normal text-[#8B8FA8]">
                        ({r.oldestDays}d)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.b0_30 > 0 ? formatPKR(r.b0_30) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 font-semibold">
                      {r.b31_60 > 0 ? formatPKR(r.b31_60) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[#EF4444] font-bold">
                      {r.b60plus > 0 ? formatPKR(r.b60plus) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold">
                      {formatPKR(r.customer.currentBalance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={buildWhatsAppReminderUrl(
                          r.customer.name,
                          r.customer.phone,
                          r.customer.currentBalance,
                          state.settings
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#22C55E] px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Remind
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Add New Customer
              </h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <input
                required
                placeholder="Full Name / Workshop Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Phone (03XX-XXXXXXX)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-field"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomerType)}
                className="input-field"
              >
                <option value="retail">Retail Buyer</option>
                <option value="contractor">Carpenter / Contractor</option>
                <option value="wholesale">Wholesale Dealer</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8B8FA8] mb-1">Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[#8B8FA8] mb-1">Opening Udhaar (Rs.)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Receive Payment */}
      {payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleReceivePayment}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                  Receive Udhaar Payment
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  {payCustomer.name} • Current Due:{' '}
                  <strong className="text-[#EF4444]">
                    {formatPKR(payCustomer.currentBalance)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayCustomer(null)}
                className="text-[#8B8FA8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">
                  Apply Against Invoice (Optional)
                </label>
                <select
                  value={payInvoiceNo}
                  onChange={(e) => setPayInvoiceNo(e.target.value)}
                  className="input-field"
                >
                  <option value="">On Account (General Udhaar Balance)</option>
                  {unpaidInvoicesForPayCustomer.map((s) => (
                    <option key={s.id} value={s.invoiceNo}>
                      {s.invoiceNo} — Due {formatPKR(s.dueAmount)} ({formatDate(s.createdAt)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5C607B] mb-1">Amount (Rs.)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                    className="input-field font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5C607B] mb-1">Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(e.target.value as Exclude<PaymentMethod, 'credit'>)
                    }
                    className="input-field"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Notes / Reference #"
                className="input-field"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayCustomer(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Printable Running Customer Statement */}
      {ledgerCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4 my-auto">
            <div className="no-print flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Customer Account Statement
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary py-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" /> Print Statement
                </button>
                <button
                  onClick={() => setLedgerCustomer(null)}
                  className="rounded-lg p-1 text-[#8B8FA8]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div id="printable-area" className="print-a4 bg-white text-gray-900 p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <div className="text-lg font-extrabold">{state.settings.businessName}</div>
                  <div className="text-xs text-gray-500">{state.settings.address}</div>
                  <div className="text-xs text-gray-500">Tel: {state.settings.phone}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-sm">{ledgerCustomer.name}</div>
                  <div>{ledgerCustomer.phone}</div>
                  <div className="text-red-600 font-bold mt-1">
                    Current Balance: {formatPKR(ledgerCustomer.currentBalance)}
                  </div>
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Ref / Type</th>
                    <th className="py-2 text-left">Notes</th>
                    <th className="py-2 text-right">Debit (Udhaar)</th>
                    <th className="py-2 text-right">Credit (Paid)</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        No ledger transactions yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2">{formatDate(e.createdAt)}</td>
                        <td className="py-2 font-semibold">{e.referenceNo}</td>
                        <td className="py-2 text-gray-600">{e.notes}</td>
                        <td className="py-2 text-right text-red-600">
                          {e.debit > 0 ? formatPKR(e.debit) : '—'}
                        </td>
                        <td className="py-2 text-right text-emerald-600">
                          {e.credit > 0 ? formatPKR(e.credit) : '—'}
                        </td>
                        <td className="py-2 text-right font-bold">
                          {formatPKR(e.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
