import { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { registerWithEmail, loginWithEmail, loginWithGoogle, sendPasswordReset } from '../../services/authService';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginWithEmail(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Signed in successfully!');
          setTimeout(() => {
            onClose();
            onSuccess?.();
          }, 600);
        }
      } else if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const res = await registerWithEmail(email, password, displayName);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Account created successfully!');
          setTimeout(() => {
            onClose();
            onSuccess?.();
          }, 600);
        }
      } else if (mode === 'forgot') {
        const res = await sendPasswordReset(email);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Password reset link sent to your email.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage('Signed in with Google!');
        setTimeout(() => {
          onClose();
          onSuccess?.();
        }, 600);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="bg-[#18181B] border border-neutral-700/80 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl flex flex-col text-neutral-200 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">
              Shotimer Cloud
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create your free account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {mode === 'login' && 'Access your cloud rooms, custom rundowns, and presets.'}
            {mode === 'register' && 'Sync your stages across devices with zero setup.'}
            {mode === 'forgot' && 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {/* Google Sign In Button */}
        {mode !== 'forgot' && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !isSupabaseConfigured}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-neutral-900 font-semibold text-sm rounded-xl hover:bg-neutral-100 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        )}

        {mode !== 'forgot' && (
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">or with email</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>
        )}

        {/* Feedback Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Your Name / Organization
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Studio Director"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@production.com"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Mode Switcher Footer */}
        <div className="mt-5 pt-4 border-t border-neutral-800 text-center text-xs text-neutral-400">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="text-amber-400 font-semibold hover:underline ml-1"
              >
                Sign up free
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-amber-400 font-semibold hover:underline ml-1"
              >
                Sign in
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
