import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../auth/AuthContext';
import { IconInput } from '../components/ui/IconInput';
import {
  Eye, EyeOff, Lock, Mail, Shield, ShieldCheck, ShieldAlert, ShieldQuestion,
  Loader2, ChevronDown, KeyRound, ArrowRight, HelpCircle,
} from 'lucide-react';

const ROLES = [
  { id: 'owner', label: 'Owner/Admin', icon: ShieldCheck, color: 'from-[#E86CE0] to-[#7C5CFC]' },
  { id: 'manager', label: 'Manager', icon: Shield, color: 'from-[#7C5CFC] to-[#5B5BF0]' },
  { id: 'cashier', label: 'Cashier', icon: ShieldAlert, color: 'from-[#3CD2F0] to-[#7C5CFC]' },
  { id: 'storekeeper', label: 'Storekeeper', icon: ShieldQuestion, color: 'from-[#22C55E] to-[#3CD2F0]' },
] as const;

export const LoginPage: React.FC = () => {
  const { login, loginWithPin, isLocked, lockoutRemaining, demoMode } = useAuth();

  const [selectedRole, setSelectedRole] = useState<string>('cashier');
  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password.trim()) {
      setError('Please enter your email/username and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await login(emailOrUsername.trim(), password);
    setIsLoading(false);
    if (result.success) {
      // Auth state change will trigger re-render in App
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  const handlePinLogin = async (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length >= 4) {
      setIsLoading(true);
      setError('');
      const result = await loginWithPin(newPin);
      setIsLoading(false);
      if (result.success) {
        // Auth state change triggers re-render
      } else {
        setError(result.error || 'Invalid PIN.');
        setPin('');
      }
    }
  };

  const handlePinBackspace = () => {
    setPin((p) => p.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  const formatLockout = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex bg-[#F3F4FA] dark:bg-[#12131F]">
      {/* Left gradient panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#E86CE0]/80 via-[#7C5CFC]/70 to-[#3CD2F0]/60" />
        {/* Decorative circles */}
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-hero">
              <div className="h-5 w-5 rounded-full border-[3px] border-white" />
            </div>
            <div>
              <span className="block text-2xl font-bold tracking-tight">PLY Woods</span>
              <span className="block text-xs font-medium text-white/70">POS & Timber ERP</span>
            </div>
          </div>

          {/* Tagline + floating card */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
                Manage your timber business<br />
                <span className="text-white/90">smarter & faster.</span>
              </h1>
              <p className="mt-4 text-base text-white/75 max-w-md">
                Complete POS, inventory, sales, purchases, and customer management — all in one place. Built for plywood, MDF & laminate retailers.
              </p>
            </div>

            {/* Floating glass card previewing today's sales */}
            <div className="max-w-sm rounded-[24px] bg-white/15 backdrop-blur-md border border-white/25 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/80">Today's Sales</span>
                <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-200">Live</span>
              </div>
              <div className="text-3xl font-extrabold tracking-tight">Rs. 210,300</div>
              <div className="mt-1 text-xs text-white/60">4 invoices • 14.2% vs yesterday</div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/10 p-2.5 text-center">
                  <div className="text-[10px] text-white/60">Cash</div>
                  <div className="text-sm font-bold">Rs. 89K</div>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 text-center">
                  <div className="text-[10px] text-white/60">JazzCash</div>
                  <div className="text-sm font-bold">Rs. 73K</div>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 text-center">
                  <div className="text-[10px] text-white/60">Udhaar</div>
                  <div className="text-sm font-bold">Rs. 48K</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-white/50">
            © 2026 PLY Woods — Plywood, MDF & Laminate Retail/Wholesale System
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full hero-gradient shadow-hero">
              <div className="h-4 w-4 rounded-full border-[2.5px] border-white" />
            </div>
            <div>
              <span className="block text-xl font-bold tracking-tight text-[#1A1B2E] dark:text-white">PLY Woods</span>
              <span className="block text-[10px] font-medium text-[#8B8FA8]">POS & Timber ERP</span>
            </div>
          </div>

          {/* Login card */}
          <div className="concured-card p-8 sm:p-10 space-y-7">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-[#1A1B2E] dark:text-white tracking-tight">Welcome back</h2>
              <p className="text-sm text-[#8B8FA8]">Sign in to your account to continue</p>
            </div>

            {/* Role pills */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">
                Sign in as
              </label>
              <div className="flex flex-wrap gap-2.5">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const active = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role.id);
                        if (role.id === 'cashier') setMode('pin');
                        else setMode('password');
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all border ${
                        active
                          ? 'bg-[#7C5CFC] text-white border-[#7C5CFC] shadow-sm shadow-[#7C5CFC]/30'
                          : 'bg-[#F3F4FA] dark:bg-[#22253A] text-[#5C607B] dark:text-[#A3A7C2] border-[#E3E6F0] dark:border-[#2E314D] hover:border-[#7C5CFC]/40'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {role.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10.5px] text-[#8B8FA8] italic">
                Role selection only labels your sign-in context. Your actual role is determined by your account.
              </p>
            </div>

            {/* Mode toggle for cashier */}
            {selectedRole === 'cashier' && (
              <div className="flex items-center gap-2 rounded-xl bg-[#F3F4FA] dark:bg-[#22253A] p-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setMode('pin')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${mode === 'pin' ? 'bg-[#7C5CFC] text-white shadow-sm' : 'text-[#6B708A] dark:text-[#A3A7C2]'}`}
                >
                  <KeyRound className="inline h-3.5 w-3.5 mr-1" />
                  PIN Pad
                </button>
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${mode === 'password' ? 'bg-[#7C5CFC] text-white shadow-sm' : 'text-[#6B708A] dark:text-[#A3A7C2]'}`}
                >
                  <Lock className="inline h-3.5 w-3.5 mr-1" />
                  Password
                </button>
              </div>
            )}

            {/* Lockout warning */}
            {isLocked && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 text-center">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Account locked — try again in {formatLockout(lockoutRemaining)}
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {mode === 'pin' && selectedRole === 'cashier' ? (
              /* PIN Pad */
              <div className="space-y-5">
                <div className="flex justify-center gap-3 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-13 w-11 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition ${
                        i < pin.length
                          ? 'border-[#7C5CFC] bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC]'
                          : 'border-[#E3E6F0] dark:border-[#2E314D] bg-[#F8F9FD] dark:bg-[#161827]'
                      }`}
                    >
                      {i < pin.length ? '•' : ''}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handlePinLogin(String(d))}
                      disabled={isLoading || isLocked}
                      className="h-14 rounded-2xl bg-[#F3F4FA] dark:bg-[#22253A] border border-[#E3E6F0] dark:border-[#2E314D] text-xl font-bold text-[#1A1B2E] dark:text-white hover:bg-[#EFEBFD] dark:hover:bg-[#7C5CFC]/20 hover:border-[#7C5CFC]/40 active:scale-95 transition disabled:opacity-50"
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handlePinClear}
                    disabled={isLoading || isLocked}
                    className="h-14 rounded-2xl bg-[#F3F4FA] dark:bg-[#22253A] border border-[#E3E6F0] dark:border-[#2E314D] text-xs font-bold text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinLogin('0')}
                    disabled={isLoading || isLocked}
                    className="h-14 rounded-2xl bg-[#F3F4FA] dark:bg-[#22253A] border border-[#E3E6F0] dark:border-[#2E314D] text-xl font-bold text-[#1A1B2E] dark:text-white hover:bg-[#EFEBFD] dark:hover:bg-[#7C5CFC]/20 hover:border-[#7C5CFC]/40 active:scale-95 transition disabled:opacity-50"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    disabled={isLoading || isLocked}
                    className="h-14 rounded-2xl bg-[#F3F4FA] dark:bg-[#22253A] border border-[#E3E6F0] dark:border-[#2E314D] text-xs font-bold text-[#7C5CFC] hover:bg-[#EFEBFD] dark:hover:bg-[#7C5CFC]/20 active:scale-95 transition disabled:opacity-50"
                  >
                    ⌫
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode('password')}
                    className="text-xs font-semibold text-[#7C5CFC] hover:underline"
                  >
                    Use password instead
                  </button>
                </div>
              </div>
            ) : (
              /* Password form */
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">
                    Email or Username
                  </label>
                  <IconInput
                  icon={<Mail size={18} />}
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="you@plywoods.pk"
                  disabled={isLoading || isLocked}
                  autoComplete="username"
                />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">
                    Password
                  </label>
                  <IconInput
                  icon={<Lock size={18} />}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading || isLocked}
                  autoComplete="current-password"
                  trailing={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  onTrailingClick={() => setShowPassword(!showPassword)}
                />
                </div>

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded accent-[#7C5CFC]"
                    />
                    <span className="text-xs font-medium text-[#525672] dark:text-[#A3A7C2]">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#7C5CFC] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isLocked}
                  className="btn-primary w-full py-3 text-sm font-bold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Demo accounts box */}
            {demoMode && (
              <div className="rounded-xl border border-dashed border-[#E3E6F0] dark:border-[#2E314D] bg-[#F8F9FD] dark:bg-[#161827] p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="flex w-full items-center justify-between text-xs font-semibold text-[#5C607B] dark:text-[#A3A7C2]"
                >
                  <span>Demo accounts (click to expand)</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${showDemoAccounts ? 'rotate-180' : ''}`} />
                </button>
                {showDemoAccounts && (
                  <div className="space-y-1.5 pt-1">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <div key={acc.email} className="flex items-center justify-between rounded-lg bg-white dark:bg-[#1B1D2E] px-3 py-2 text-[11px]">
                        <div>
                          <span className="font-bold text-[#1A1B2E] dark:text-white">{acc.name}</span>
                          <span className="text-[#8B8FA8] ml-1.5">({acc.role})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[#7C5CFC] font-medium">{acc.email}</div>
                          <div className="text-[#8B8FA8]">{acc.password}</div>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-[#8B8FA8] italic pt-1">
                      PIN for all accounts: 1234
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Help link */}
            <div className="text-center">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8B8FA8] hover:text-[#7C5CFC] transition"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Need help? Contact owner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};