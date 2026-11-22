import React, { useState } from 'react';
import {
  Plus,
  Wallet,
  ArrowLeftRight,
  Lock,
  Unlock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ExpenseCategory } from '../types/pos';
import { usePos } from '../store/PosContext';
import { formatDate, formatDateTime, formatPKR } from '../utils/format';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Salaries',
  'Electricity',
  'Loader Charges',
  'Tea & Refreshments',
  'Fuel & Transport',
  'Shop Maintenance',
  'Misc',
];

export const ExpensesCashPage: React.FC = () => {
  const {
    state,
    permissions,
    addExpense,
    transferBetweenAccounts,
    openCashSession,
    recordCashDrawerAdjustment,
    closeCashSession,
  } = usePos();

  const [tab, setTab] = useState<'cash' | 'expenses' | 'accounts'>('cash');

  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expCat, setExpCat] = useState<ExpenseCategory>('Loader Charges');
  const [expAcc, setExpAcc] = useState('acc-cash');
  const [expAmt, setExpAmt] = useState(1500);
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));

  const [showTransfer, setShowTransfer] = useState(false);
  const [trfFrom, setTrfFrom] = useState('acc-cash');
  const [trfTo, setTrfTo] = useState('acc-hbl');
  const [trfAmt, setTrfAmt] = useState(50000);
  const [trfDesc, setTrfDesc] = useState('Daily cash deposit to HBL');

  const [showCloseShift, setShowCloseShift] = useState(false);
  const [countedCash, setCountedCash] = useState(0);

  const [showOpenShift, setShowOpenShift] = useState(false);
  const [openingCash, setOpeningCash] = useState(50000);

  const [showCashInOut, setShowCashInOut] = useState<'in' | 'out' | null>(null);
  const [adjAmt, setAdjAmt] = useState(5000);
  const [adjReason, setAdjReason] = useState('');

  const activeSession = state.cashSessions.find((cs) => cs.status === 'open');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmt <= 0) return;
    addExpense({
      category: expCat,
      accountId: expAcc,
      amount: expAmt,
      description: expDesc || expCat,
      date: expDate,
    });
    setShowAddExpense(false);
    setExpDesc('');
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    transferBetweenAccounts(trfFrom, trfTo, trfAmt, trfDesc);
    setShowTransfer(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Expenses, Cash Drawer &amp; Accounts
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Daily cash drawer reconciliation, Day Close / Shift Close variance report, expenses &amp; wallet accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permissions.canManageExpenses && (
            <>
              <button onClick={() => setShowAddExpense(true)} className="btn-primary text-xs">
                <Plus className="h-4 w-4" /> Record Expense
              </button>
              <button onClick={() => setShowTransfer(true)} className="btn-secondary text-xs">
                <ArrowLeftRight className="h-4 w-4" /> Transfer Account
              </button>
            </>
          )}
        </div>
      </div>

      {/* Accounts Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {state.accounts.map((acc, idx) => (
          <div
            key={acc.id}
            className={
              idx === 0
                ? 'hero-gradient rounded-[20px] p-4 text-white shadow-hero'
                : 'concured-kpi-tile p-4'
            }
          >
            <div className={`text-xs ${idx === 0 ? 'text-white/80' : 'text-[#8B8FA8]'}`}>
              {acc.name}
            </div>
            <div
              className={`text-xl font-extrabold mt-1 ${
                idx === 0 ? 'text-white' : 'text-[#1A1B2E] dark:text-white'
              }`}
            >
              {formatPKR(acc.balance)}
            </div>
            <div className={`text-[10.5px] uppercase mt-0.5 ${idx === 0 ? 'text-white/75' : 'text-[#7C5CFC]'}`}>
              {acc.type}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-full bg-[#F3F4FA] dark:bg-[#22253A] p-1 text-xs font-semibold">
        <button
          onClick={() => setTab('cash')}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === 'cash' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
          }`}
        >
          Cash Drawer &amp; Day Close
        </button>
        <button
          onClick={() => setTab('expenses')}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === 'expenses' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
          }`}
        >
          Expenses ({state.expenses.length})
        </button>
        <button
          onClick={() => setTab('accounts')}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === 'accounts' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
          }`}
        >
          Account Transactions
        </button>
      </div>

      {/* Tab 1: Cash Drawer & Shift Close */}
      {tab === 'cash' && (
        <div className="space-y-4">
          {activeSession ? (
            <div className="concured-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Unlock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                      Active Shift / Cash Drawer Open
                    </h3>
                    <p className="text-xs text-[#8B8FA8]">
                      Opened by {activeSession.openedBy} at {formatDateTime(activeSession.openedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowCashInOut('in')}
                    className="btn-secondary py-2 text-xs"
                  >
                    + Cash In
                  </button>
                  <button
                    onClick={() => setShowCashInOut('out')}
                    className="btn-secondary py-2 text-xs"
                  >
                    - Cash Out
                  </button>
                  <button
                    onClick={() => {
                      setCountedCash(activeSession.expectedCash);
                      setShowCloseShift(true);
                    }}
                    className="btn-primary py-2 text-xs"
                  >
                    <Lock className="h-3.5 w-3.5" /> Close Day / Shift
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-3.5">
                  <div className="text-[#8B8FA8]">Opening Float</div>
                  <div className="text-base font-bold mt-0.5">
                    {formatPKR(activeSession.openingCash)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-3.5">
                  <div className="text-[#8B8FA8]">+ Cash Sales</div>
                  <div className="text-base font-bold text-[#22C55E] mt-0.5">
                    +{formatPKR(activeSession.cashSales)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-3.5">
                  <div className="text-[#8B8FA8]">+ Udhaar Cash Recv</div>
                  <div className="text-base font-bold text-[#22C55E] mt-0.5">
                    +{formatPKR(activeSession.cashPaymentsReceived + activeSession.cashInManual)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-3.5">
                  <div className="text-[#8B8FA8]">- Expenses / Out / Refunds</div>
                  <div className="text-base font-bold text-[#EF4444] mt-0.5">
                    -
                    {formatPKR(
                      activeSession.cashExpenses +
                        activeSession.cashOutManual +
                        activeSession.cashRefunds
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 p-4 flex items-center justify-between">
                <span className="text-sm font-bold text-[#7C5CFC]">
                  Expected Closing Cash in Drawer
                </span>
                <span className="text-xl font-extrabold text-[#7C5CFC]">
                  {formatPKR(activeSession.expectedCash)}
                </span>
              </div>
            </div>
          ) : (
            <div className="concured-card p-8 text-center space-y-3">
              <Wallet className="mx-auto h-9 w-9 text-[#7C5CFC]" />
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Cash Drawer is Closed
              </h3>
              <p className="text-xs text-[#8B8FA8]">
                Open a new shift with today&apos;s opening cash float to track daily sales &amp; variance.
              </p>
              <button onClick={() => setShowOpenShift(true)} className="btn-primary text-xs">
                <Unlock className="h-4 w-4" /> Open Cash Drawer Shift
              </button>
            </div>
          )}

          {/* Previous Closed Shifts */}
          <div className="concured-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F1F2F8] dark:border-[#2A2D45] font-bold text-sm">
              Shift / Day Close History
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A]">
                    <th className="px-4 py-3">Opened / Closed</th>
                    <th className="px-4 py-3 text-right">Opening</th>
                    <th className="px-4 py-3 text-right">Cash Sales</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">Expected</th>
                    <th className="px-4 py-3 text-right">Counted</th>
                    <th className="px-4 py-3 text-right">Short / Over</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                  {state.cashSessions.map((cs) => (
                    <tr key={cs.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{formatDateTime(cs.openedAt)}</div>
                        <div className="text-[11px] text-[#8B8FA8]">
                          {cs.status === 'open'
                            ? `Open (${cs.openedBy})`
                            : `Closed by ${cs.closedBy}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{formatPKR(cs.openingCash)}</td>
                      <td className="px-4 py-3 text-right text-[#22C55E]">
                        {formatPKR(cs.cashSales)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#EF4444]">
                        {formatPKR(cs.cashExpenses)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatPKR(cs.expectedCash)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cs.countedCash !== undefined ? formatPKR(cs.countedCash) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {cs.variance === undefined ? (
                          <span className="text-[#7C5CFC]">Active</span>
                        ) : cs.variance === 0 ? (
                          <span className="text-[#22C55E]">Balanced (Rs. 0)</span>
                        ) : (
                          <span className={cs.variance > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                            {cs.variance > 0 ? `+${formatPKR(cs.variance)}` : formatPKR(cs.variance)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Expenses */}
      {tab === 'expenses' && (
        <div className="concured-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A]">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5">Paid From</th>
                  <th className="px-4 py-3.5">By</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                {state.expenses.map((ex) => (
                  <tr key={ex.id}>
                    <td className="px-4 py-3 text-[#8B8FA8]">{formatDate(ex.date)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-2 py-0.5 font-semibold text-[#7C5CFC]">
                        {ex.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{ex.description}</td>
                    <td className="px-4 py-3 text-[#6B708A]">{ex.accountName}</td>
                    <td className="px-4 py-3 text-[#8B8FA8]">{ex.createdBy}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-[#EF4444]">
                      {formatPKR(ex.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Account Transactions */}
      {tab === 'accounts' && (
        <div className="concured-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A]">
                  <th className="px-4 py-3.5">Time</th>
                  <th className="px-4 py-3.5">Account</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                {state.accountTransactions.slice(0, 50).map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-[#8B8FA8]">{formatDateTime(t.createdAt)}</td>
                    <td className="px-4 py-3 font-bold">{t.accountName}</td>
                    <td className="px-4 py-3 uppercase text-[10.5px] font-bold text-[#7C5CFC]">
                      {t.type}
                    </td>
                    <td className="px-4 py-3 text-[#6B708A]">{t.description}</td>
                    <td
                      className={`px-4 py-3 text-right font-extrabold ${
                        t.type === 'in' || t.type === 'transfer_in'
                          ? 'text-[#22C55E]'
                          : 'text-[#EF4444]'
                      }`}
                    >
                      {t.type === 'in' || t.type === 'transfer_in' ? '+' : '-'}
                      {formatPKR(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddExpense}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Record Shop Expense</h3>
              <button type="button" onClick={() => setShowAddExpense(false)}>
                <X className="h-5 w-5 text-[#8B8FA8]" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <select
                value={expCat}
                onChange={(e) => setExpCat(e.target.value as ExpenseCategory)}
                className="input-field"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={expAcc}
                onChange={(e) => setExpAcc(e.target.value)}
                className="input-field"
              >
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatPKR(a.balance)})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="number"
                  min={1}
                  value={expAmt}
                  onChange={(e) => setExpAmt(Number(e.target.value) || 0)}
                  placeholder="Amount (Rs.)"
                  className="input-field font-bold"
                />
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <input
                required
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Description (e.g. Unloading truck labour)"
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleTransfer}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Transfer Between Accounts</h3>
              <button type="button" onClick={() => setShowTransfer(false)}>
                <X className="h-5 w-5 text-[#8B8FA8]" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <select
                value={trfFrom}
                onChange={(e) => setTrfFrom(e.target.value)}
                className="input-field"
              >
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    From: {a.name} ({formatPKR(a.balance)})
                  </option>
                ))}
              </select>
              <select
                value={trfTo}
                onChange={(e) => setTrfTo(e.target.value)}
                className="input-field"
              >
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    To: {a.name} ({formatPKR(a.balance)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={trfAmt}
                onChange={(e) => setTrfAmt(Number(e.target.value) || 0)}
                className="input-field font-bold"
              />
              <input
                value={trfDesc}
                onChange={(e) => setTrfDesc(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTransfer(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Transfer Now
              </button>
            </div>
          </form>
        </div>
      )}

      {showCloseShift && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">Close Day / Cash Drawer</h3>
            <div className="rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Expected Cash in Drawer:</span>
                <strong>{formatPKR(activeSession.expectedCash)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Variance (Counted − Expected):</span>
                <strong
                  className={
                    countedCash - activeSession.expectedCash === 0
                      ? 'text-[#22C55E]'
                      : 'text-[#EF4444]'
                  }
                >
                  {formatPKR(countedCash - activeSession.expectedCash)}
                </strong>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C607B] mb-1">
                Physical Cash Counted (Rs.)
              </label>
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(Number(e.target.value) || 0)}
                className="input-field font-bold text-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCloseShift(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  closeCashSession(countedCash);
                  setShowCloseShift(false);
                }}
                className="btn-primary"
              >
                <CheckCircle2 className="h-4 w-4" /> Close Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {showOpenShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">Open New Cash Shift</h3>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
              className="input-field font-bold"
              placeholder="Opening float (Rs.)"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowOpenShift(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  openCashSession(openingCash);
                  setShowOpenShift(false);
                }}
                className="btn-primary"
              >
                Open Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCashInOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">
              Cash Drawer {showCashInOut === 'in' ? 'Deposit (In)' : 'Withdrawal (Out)'}
            </h3>
            <input
              type="number"
              value={adjAmt}
              onChange={(e) => setAdjAmt(Number(e.target.value) || 0)}
              className="input-field font-bold"
            />
            <input
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Reason (e.g. Owner cash withdrawal)"
              className="input-field"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCashInOut(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  recordCashDrawerAdjustment(showCashInOut, adjAmt, adjReason || 'Manual drawer entry');
                  setShowCashInOut(null);
                  setAdjReason('');
                }}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
