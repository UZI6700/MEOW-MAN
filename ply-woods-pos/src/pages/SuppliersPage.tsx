import React, { useMemo, useState } from 'react';
import { Plus, Wallet, BookOpen, X, Truck } from 'lucide-react';
import { Supplier } from '../types/pos';
import { usePos } from '../store/PosContext';
import { formatDate, formatPKR } from '../utils/format';

export const SuppliersPage: React.FC = () => {
  const { state, permissions, addSupplier, paySupplier } = usePos();
  const [showAdd, setShowAdd] = useState(false);
  const [paySup, setPaySup] = useState<Supplier | null>(null);
  const [ledgerSup, setLedgerSup] = useState<Supplier | null>(null);

  // Add form
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);

  // Pay form
  const [payAmt, setPayAmt] = useState(0);
  const [payAccId, setPayAccId] = useState('acc-hbl');
  const [payNote, setPayNote] = useState('Supplier IBFT settlement');

  const totalPayables = useMemo(
    () => state.suppliers.reduce((s, x) => s + Math.max(0, x.currentBalance), 0),
    [state.suppliers]
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addSupplier({
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      address: address.trim(),
      openingBalance,
    });
    setShowAdd(false);
    setName('');
    setContactPerson('');
    setPhone('');
    setAddress('');
    setOpeningBalance(0);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySup || payAmt <= 0) return;
    paySupplier(paySup.id, payAmt, payAccId, payNote);
    setPaySup(null);
  };

  const ledgerEntries = useMemo(() => {
    if (!ledgerSup) return [];
    return state.supplierLedger.filter((e) => e.supplierId === ledgerSup.id);
  }, [ledgerSup, state.supplierLedger]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Suppliers &amp; Payables
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Manage plywood mills, MDF manufacturers, laminate distributors, and payable ledgers
          </p>
        </div>
        {permissions.canManagePurchases && (
          <button onClick={() => setShowAdd(true)} className="btn-primary text-xs">
            <Plus className="h-4 w-4" /> Add Supplier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Active Suppliers</div>
          <div className="text-2xl font-extrabold text-[#1A1B2E] dark:text-white mt-1">
            {state.suppliers.length}
          </div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Total Payables</div>
          <div className="text-2xl font-extrabold text-[#7C5CFC] mt-1">
            {formatPKR(totalPayables)}
          </div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Open Purchase Orders</div>
          <div className="text-2xl font-extrabold text-[#3CD2F0] mt-1">
            {state.purchases.filter((p) => p.status !== 'received' && p.status !== 'cancelled').length}
          </div>
        </div>
      </div>

      <div className="concured-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A] font-semibold">
                <th className="px-4 py-3.5">Supplier</th>
                <th className="px-4 py-3.5">Contact Person</th>
                <th className="px-4 py-3.5">Phone &amp; Location</th>
                <th className="px-4 py-3.5 text-right">Payable Balance</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
              {state.suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#22253A]/60">
                  <td className="px-4 py-3 font-bold text-[#1A1B2E] dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#7C5CFC] shrink-0" />
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-[#525672] dark:text-[#C5C8DF]">
                    {s.contactPerson}
                  </td>
                  <td className="px-4 py-3 text-[#6B708A]">
                    <div>{s.phone}</div>
                    <div className="text-[11px] text-[#8B8FA8]">{s.address}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-[#EF4444]">
                    {formatPKR(s.currentBalance)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {permissions.canManagePurchases && (
                        <button
                          onClick={() => {
                            setPaySup(s);
                            setPayAmt(Math.max(0, s.currentBalance));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-2.5 py-1.5 text-[11px] font-bold text-[#7C5CFC] hover:bg-[#7C5CFC] hover:text-white transition"
                        >
                          <Wallet className="h-3.5 w-3.5" /> Pay
                        </button>
                      )}
                      <button
                        onClick={() => setLedgerSup(s)}
                        className="rounded-lg p-1.5 text-[#5C607B] hover:bg-[#F3F4FA]"
                        title="View Supplier Ledger"
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">Add Supplier</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <input
                required
                placeholder="Company / Mill Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Contact Person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="City / Industrial Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-field"
              />
              <div>
                <label className="block text-[#8B8FA8] mb-1">Opening Payable (Rs.)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {paySup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handlePay}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                  Pay Supplier
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  {paySup.name} • Balance: {formatPKR(paySup.currentBalance)}
                </p>
              </div>
              <button type="button" onClick={() => setPaySup(null)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Amount (Rs.)</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={payAmt}
                  onChange={(e) => setPayAmt(Number(e.target.value) || 0)}
                  className="input-field font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Pay From Account</label>
                <select
                  value={payAccId}
                  onChange={(e) => setPayAccId(e.target.value)}
                  className="input-field"
                >
                  {state.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatPKR(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Payment note / cheque #"
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPaySup(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Ledger Modal */}
      {ledgerSup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                  Supplier Ledger — {ledgerSup.name}
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  Current Payable: <strong>{formatPKR(ledgerSup.currentBalance)}</strong>
                </p>
              </div>
              <button onClick={() => setLedgerSup(null)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-[#8B8FA8]">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Ref</th>
                    <th className="py-2 text-left">Notes</th>
                    <th className="py-2 text-right">Purchase (+)</th>
                    <th className="py-2 text-right">Paid (-)</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                  {ledgerEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 text-[#8B8FA8]">{formatDate(e.createdAt)}</td>
                      <td className="py-2 font-semibold">{e.referenceNo}</td>
                      <td className="py-2 text-[#6B708A]">{e.notes}</td>
                      <td className="py-2 text-right text-[#EF4444]">
                        {e.credit > 0 ? formatPKR(e.credit) : '—'}
                      </td>
                      <td className="py-2 text-right text-[#22C55E]">
                        {e.debit > 0 ? formatPKR(e.debit) : '—'}
                      </td>
                      <td className="py-2 text-right font-bold">{formatPKR(e.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
