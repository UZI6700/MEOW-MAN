import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AuthUser, RoleId } from '../types/pos';
import { ROLE_PERMISSIONS } from '../utils/permissions';
import {
  Plus, Edit2, Trash2, Shield, Search, X, Save,
  KeyRound, Mail, Phone, User, Check, Lock,
} from 'lucide-react';

const ROLES: { id: RoleId; label: string; color: string }[] = [
  { id: 'owner', label: 'Owner / Admin', color: 'bg-[#EFEBFD] text-[#7C5CFC]' },
  { id: 'manager', label: 'Manager', color: 'bg-cyan-50 text-cyan-600' },
  { id: 'cashier', label: 'Cashier', color: 'bg-amber-50 text-amber-700' },
  { id: 'storekeeper', label: 'Storekeeper', color: 'bg-emerald-50 text-emerald-700' },
];

export const StaffManagementPage: React.FC = () => {
  const { staffUsers, addStaff, updateStaff, deleteStaff, toggleStaffActive, demoMode, setDemoMode } = useAuth();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<RoleId>('cashier');
  const [formPassword, setFormPassword] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');

  const filtered = staffUsers.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openAddDrawer = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormUsername('');
    setFormPhone('');
    setFormRole('cashier');
    setFormPassword('');
    setFormPin('');
    setFormActive(true);
    setFormError('');
    setDrawerOpen(true);
  };

  const openEditDrawer = (user: AuthUser) => {
    setEditingUser(user);
    setFormName(user.fullName);
    setFormEmail(user.email);
    setFormUsername(user.username);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormPassword('');
    setFormPin('');
    setFormActive(user.isActive);
    setFormError('');
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      setFormError('Password is required for new users.');
      return;
    }

    if (editingUser) {
      const result = await updateStaff(editingUser.id, {
        fullName: formName.trim(),
        email: formEmail.trim(),
        username: formUsername.trim() || formEmail.split('@')[0],
        phone: formPhone.trim(),
        role: formRole,
        isActive: formActive,
        pin: formPin.trim() || undefined,
      });
      if (!result.success) {
        setFormError(result.error || 'Update failed.');
        return;
      }
    } else {
      const result = await addStaff({
        fullName: formName.trim(),
        email: formEmail.trim(),
        username: formUsername.trim() || formEmail.split('@')[0],
        phone: formPhone.trim(),
        role: formRole,
        isActive: formActive,
        password: formPassword,
        pin: formPin.trim() || undefined,
      });
      if (!result.success) {
        setFormError(result.error || 'Failed to add user.');
        return;
      }
    }
    setDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    await deleteStaff(id);
  };

  const roleBadgeColor = (role: RoleId) => {
    return ROLES.find((r) => r.id === role)?.color || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1B2E] dark:text-white tracking-tight">Staff &amp; Roles</h2>
          <p className="text-sm text-[#8B8FA8] mt-0.5">Manage staff accounts, roles, and permissions</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="btn-secondary py-2 px-4 text-xs"
          >
            <Shield className="h-3.5 w-3.5" />
            Permission Matrix
          </button>
          <button onClick={openAddDrawer} className="btn-primary py-2 px-4 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Demo mode toggle */}
      <div className="concured-card p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-[#1A1B2E] dark:text-white">Demo Mode</div>
          <div className="text-xs text-[#8B8FA8]">Show demo accounts on the login page for testing</div>
        </div>
        <button
          onClick={() => setDemoMode?.(!demoMode)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            demoMode ? 'bg-[#7C5CFC]' : 'bg-[#E3E6F0] dark:bg-[#2E314D]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              demoMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Permission Matrix */}
      {showMatrix && (
        <div className="concured-card p-5 overflow-x-auto">
          <h3 className="text-sm font-bold text-[#1A1B2E] dark:text-white mb-4">Permission Matrix</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#F1F2F8] dark:border-[#2A2D45]">
                <th className="text-left py-2 px-3 font-semibold text-[#8B8FA8]">Permission</th>
                {ROLES.map((r) => (
                  <th key={r.id} className="text-center py-2 px-3 font-semibold text-[#8B8FA8]">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'canViewCostAndProfit', label: 'View Cost Price & Profit' },
                { key: 'canEditPrices', label: 'Edit Prices' },
                { key: 'canDeleteOrReturnSales', label: 'Delete / Return Sales' },
                { key: 'canAdjustStock', label: 'Adjust Stock' },
                { key: 'canManageUsersAndSettings', label: 'Manage Users & Settings' },
                { key: 'canManagePurchases', label: 'Manage Purchases' },
                { key: 'canManageExpenses', label: 'Manage Expenses' },
              ].map((perm) => (
                <tr key={perm.key} className="border-b border-[#F1F2F8] dark:border-[#2A2D45]">
                  <td className="py-2 px-3 text-[#525672] dark:text-[#A3A7C2]">{perm.label}</td>
                  {ROLES.map((r) => {
                    const p = ROLE_PERMISSIONS[r.id];
                    const val = p[perm.key as keyof typeof p];
                    return (
                      <td key={r.id} className="text-center py-2 px-3">
                        {val ? (
                          <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-red-400 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-b border-[#F1F2F8] dark:border-[#2A2D45]">
                <td className="py-2 px-3 text-[#525672] dark:text-[#A3A7C2]">Max Discount %</td>
                {ROLES.map((r) => (
                  <td key={r.id} className="text-center py-2 px-3 font-bold text-[#1A1B2E] dark:text-white">
                    {ROLE_PERMISSIONS[r.id].maxDiscountPercent}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Search */}
      <div className="relative flex items-center w-full">
        <Search className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff by name, email, or role..."
          className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none"
        />
      </div>

      {/* Staff table */}
      <div className="concured-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F1F2F8] dark:border-[#2A2D45] bg-[#F7F8FC] dark:bg-[#22253A]">
                <th className="text-left py-3 px-4 font-semibold text-[#8B8FA8] text-xs">User</th>
                <th className="text-left py-3 px-4 font-semibold text-[#8B8FA8] text-xs">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-[#8B8FA8] text-xs">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-[#8B8FA8] text-xs">Last Login</th>
                <th className="text-right py-3 px-4 font-semibold text-[#8B8FA8] text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-[#F1F2F8] dark:border-[#2A2D45] hover:bg-[#F7F8FC]/50 dark:hover:bg-[#22253A]/50 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC] text-xs font-bold shrink-0">
                        {u.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#1A1B2E] dark:text-white text-sm truncate">{u.fullName}</div>
                        <div className="text-[11px] text-[#8B8FA8] truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${roleBadgeColor(u.role)}`}>
                      {ROLES.find((r) => r.id === u.role)?.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStaffActive(u.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold transition ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {u.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#8B8FA8]">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditDrawer(u)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4FA] dark:bg-[#22253A] text-[#7C5CFC] hover:bg-[#EFEBFD] transition"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4FA] dark:bg-[#22253A] text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-[#8B8FA8]">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-[#12131F]/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-[#1B1D2E] shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#ECEEF5] dark:border-[#2A2D45] bg-white dark:bg-[#1B1D2E]">
              <h3 className="text-lg font-bold text-[#1A1B2E] dark:text-white">
                {editingUser ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button onClick={() => setDrawerOpen(false)} className="text-[#8B8FA8] hover:text-[#1A1B2E] dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{formError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Full Name</label>
                <div className="relative flex items-center w-full">
                  <User className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Muhammad Usman" className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Email</label>
                <div className="relative flex items-center w-full">
                  <Mail className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@plywoods.pk" className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Username</label>
                <input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="auto-generated from email" className="input-field" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Phone</label>
                <div className="relative flex items-center w-full">
                  <Phone className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                  <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="0300-1234567" className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Role</label>
                <select value={formRole} onChange={(e) => setFormRole(e.target.value as RoleId)} className="input-field">
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Password</label>
                  <div className="relative flex items-center w-full">
                    <Lock className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                    <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••••" className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" />
                  </div>
                </div>
              )}

              {editingUser && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">New Password (leave blank to keep)</label>
                  <div className="relative flex items-center w-full">
                    <Lock className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                    <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••••" className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">
                  PIN {formRole === 'cashier' ? '(for quick login)' : '(optional)'}
                </label>
                <div className="relative flex items-center w-full">
                  <KeyRound className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                  <input value={formPin} onChange={(e) => setFormPin(e.target.value)} placeholder="4-6 digit PIN" maxLength={6} className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded accent-[#7C5CFC]"
                  id="active-toggle"
                />
                <label htmlFor="active-toggle" className="text-xs font-medium text-[#525672] dark:text-[#A3A7C2]">Account active</label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setDrawerOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} className="btn-primary flex-1">
                  <Save className="h-4 w-4" />
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
