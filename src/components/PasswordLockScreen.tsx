import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, BookOpen } from 'lucide-react';
import { verifyPassword } from '../lib/auth';

interface PasswordLockScreenProps {
  onUnlock: () => void;
}

export const PasswordLockScreen: React.FC<PasswordLockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number>(0);

  // Countdown timer for lockout cooldown
  useEffect(() => {
    if (lockoutTime <= 0) return;
    const interval = setInterval(() => {
      setLockoutTime((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || lockoutTime > 0) return;

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyPassword(password);
      if (result.success) {
        onUnlock();
      } else {
        setError(result.error || 'Mot de passe incorrect.');
        if (result.lockoutSeconds) {
          setLockoutTime(result.lockoutSeconds);
        }
      }
    } catch {
      setError('Erreur lors de la vérification.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-center items-center bg-stone-100/70 p-4 sm:p-6">
      <div className="w-full max-w-sm bg-white border border-stone-200/80 rounded-2xl shadow-xl shadow-stone-200/40 p-6 sm:p-8 space-y-6">
        {/* App Logo & Lock Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-900 shadow-2xs">
            <Lock className="w-6 h-6 text-amber-900" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-stone-900">
              Kepubify Web
            </h1>
            <p className="text-xs text-stone-500">
              Accès protégé par mot de passe
            </p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              Mot de passe d'accès
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                disabled={lockoutTime > 0}
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-800/10 focus:border-amber-800 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!password.trim() || isVerifying || lockoutTime > 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-stone-50 text-xs font-semibold rounded-xl hover:bg-stone-800 active:bg-stone-950 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <span>{isVerifying ? 'Vérification...' : lockoutTime > 0 ? `Patientez (${lockoutTime}s)` : 'Déverrouiller'}</span>
            {!isVerifying && lockoutTime <= 0 && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* Security explanation badge */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Vérification cryptographique SHA-256 locale</span>
        </div>
      </div>
    </div>
  );
};
