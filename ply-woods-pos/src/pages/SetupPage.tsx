import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const SetupPage: React.FC = () => {
  const { createOwnerAccount, needsSetup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!needsSetup) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await createOwnerAccount(name.trim(), email.trim(), password);
    setIsLoading(false);
    if (result.success) {
      // Auth state change triggers re-render
    } else {
      setError(result.error || 'Setup failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4FA] dark:bg-[#12131F] p-6">
      <div className="w-full max-w-md">
        <div className="concured-card p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full hero-gradient shadow-hero">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#1A1B2E] dark:text-white tracking-tight">
              Create Owner Account
            </h1>
            <p className="text-sm text-[#8B8FA8]">
              Welcome to PLY Woods POS! Set up your owner account to get started.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Full Name</label>
              <div className="relative flex items-center w-full">
                <User className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Muhammad Usman" className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Email</label>
              <div className="relative flex items-center w-full">
                <Mail className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@plywoods.pk" className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none" disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Password</label>
              <div className="relative flex items-center w-full">
                <Lock className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-[46px] pr-[46px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none"
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#8B8FA8] hover:text-[#7C5CFC] transition" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wide">Confirm Password</label>
              <div className="relative flex items-center w-full">
                <Lock className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9A9CB8] z-[1] transition-colors peer-focus:text-[#7C5CFC]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-[46px] pr-[16px] h-[48px] rounded-[12px] box-border w-full peer focus:border-[#7C5CFC] focus:ring-[0_0_0_4px_rgba(124,92,252,0.12)] focus:outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-sm font-bold">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Owner Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
