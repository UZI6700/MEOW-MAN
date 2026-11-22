import React, { useRef, useState } from 'react';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Shield,
  FileCode2,
} from 'lucide-react';
import { usePos } from '../store/PosContext';
import { formatDateTime } from '../utils/format';

export const SettingsPage: React.FC = () => {
  const {
    state,
    permissions,
    updateSettings,
    exportBackupJSON,
    importBackupJSON,
    resetDemoData,
    notify,
  } = usePos();

  const [tab, setTab] = useState<'general' | 'audit' | 'backup'>('general');
  const [form, setForm] = useState(state.settings);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    notify('Business settings saved');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importBackupJSON(String(reader.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Settings, Security &amp; Audit Log
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Configure shop profile, 80mm/A4 Urdu receipts, GST, Manager PIN, backups, and review full audit logs
          </p>
        </div>

        <div className="inline-flex rounded-full bg-[#F3F4FA] dark:bg-[#22253A] p-1 text-xs font-semibold">
          <button
            onClick={() => setTab('general')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'general' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Shop Settings
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'audit' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Audit Log ({state.auditLogs.length})
          </button>
          <button
            onClick={() => setTab('backup')}
            className={`rounded-full px-4 py-1.5 transition ${
              tab === 'backup' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A]'
            }`}
          >
            Backup &amp; Schema
          </button>
        </div>
      </div>

      {tab === 'general' && (
        <form onSubmit={handleSave} className="concured-card p-6 space-y-5">
          {!permissions.canManageUsersAndSettings && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
              You are signed in as <strong>{permissions.label}</strong>. Switch to Owner/Admin to modify shop settings.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">Business Name</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">Tagline</label>
              <input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-[#5C607B] mb-1">Shop Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">Phone / WhatsApp</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">NTN (Optional)</label>
              <input
                value={form.ntn}
                onChange={(e) => setForm({ ...form, ntn: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">Invoice Prefix</label>
              <input
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">Default Paper Size</label>
              <select
                value={form.paperSize}
                onChange={(e) => setForm({ ...form, paperSize: e.target.value as '80mm' | 'A4' })}
                className="input-field"
              >
                <option value="80mm">80mm Thermal Receipt</option>
                <option value="A4">A4 Full Invoice</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">GST Rate (%)</label>
              <input
                type="number"
                value={form.gstRate}
                onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#5C607B] mb-1">
                Manager Discount Approval PIN
              </label>
              <input
                value={form.managerPin}
                onChange={(e) => setForm({ ...form, managerPin: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-[#5C607B] mb-1">Receipt Footer Text</label>
              <input
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.urduReceiptLabels}
                onChange={(e) => setForm({ ...form, urduReceiptLabels: e.target.checked })}
                className="accent-[#7C5CFC]"
              />
              Show Urdu labels on receipts (بل / انوائس، گاہک، بقایا)
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.rtlInvoice}
                onChange={(e) => setForm({ ...form, rtlInvoice: e.target.checked })}
                className="accent-[#7C5CFC]"
              />
              Enable RTL invoice layout by default
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.blockOverCreditLimit}
                onChange={(e) => setForm({ ...form, blockOverCreditLimit: e.target.checked })}
                className="accent-[#7C5CFC]"
              />
              Hard-block Udhaar sales exceeding customer credit limit
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.darkMode}
                onChange={(e) => setForm({ ...form, darkMode: e.target.checked })}
                className="accent-[#7C5CFC]"
              />
              Dark Theme (#12131F Navy)
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!permissions.canManageUsersAndSettings}
              className="btn-primary"
            >
              <Save className="h-4 w-4" /> Save Settings
            </button>
          </div>
        </form>
      )}

      {tab === 'audit' && (
        <div className="concured-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F1F2F8] dark:border-[#2A2D45] flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#7C5CFC]" />
            <span className="text-sm font-bold">Immutable Audit Log (Who Changed What &amp; When)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A]">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User / Role</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                {state.auditLogs.slice(0, 80).map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 text-[#8B8FA8] whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold">
                      {log.userName}{' '}
                      <span className="text-[10px] uppercase text-[#7C5CFC]">({log.role})</span>
                    </td>
                    <td className="px-4 py-2.5">{log.module}</td>
                    <td className="px-4 py-2.5 font-bold">{log.action}</td>
                    <td className="px-4 py-2.5 text-[#6B708A]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="concured-card p-6 space-y-4">
            <h3 className="text-base font-bold">Data Backup &amp; Restore</h3>
            <p className="text-xs text-[#8B8FA8]">
              Download a full JSON snapshot of all products, stock movements, offcuts, customers, Udhaar ledgers, sales, purchases, expenses, and audit logs.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={exportBackupJSON} className="btn-primary text-xs">
                <Download className="h-4 w-4" /> Export Full JSON Backup
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">
                <Upload className="h-4 w-4" /> Restore Backup JSON
              </button>
              <button
                onClick={resetDemoData}
                className="inline-flex items-center gap-2 rounded-[12px] bg-red-50 text-[#EF4444] hover:bg-red-100 px-4 py-2.5 text-xs font-semibold"
              >
                <RotateCcw className="h-4 w-4" /> Reset Seed Demo Data
              </button>
            </div>
          </div>

          <div className="concured-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-[#7C5CFC]" />
              <h3 className="text-base font-bold">Production Supabase Postgres Schema</h3>
            </div>
            <p className="text-xs text-[#8B8FA8]">
              Ready-to-run SQL migration with all 26+ normalized tables, indexes, stock_movements trigger, and Row Level Security (RLS) policies is included in:
            </p>
            <code className="block rounded-xl bg-[#F3F4FA] dark:bg-[#22253A] px-3.5 py-2.5 text-xs font-mono text-[#7C5CFC]">
              supabase/migrations/001_initial_schema.sql
            </code>
          </div>
        </div>
      )}
    </div>
  );
};
