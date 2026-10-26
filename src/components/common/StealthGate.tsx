import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';

const DEFAULT_PASSKEY = 'SHOTIMER-ALPHA-2026';

interface StealthGateProps {
  children: React.ReactNode;
}

export default function StealthGate({ children }: StealthGateProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsAuthorized(false);
      return;
    }

    const hostname = window.location.hostname;
    // Auto-bypass for local machine or LAN testing
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.');

    if (isLocal) {
      setIsAuthorized(true);
      return;
    }

    const expectedKey = (import.meta.env.VITE_STEALTH_PASSKEY || DEFAULT_PASSKEY).trim().toUpperCase();

    // Check URL query parameter (e.g. ?access=SHOTIMER-ALPHA-2026 or ?key=...)
    const params = new URLSearchParams(window.location.search);
    const queryKey = (params.get('access') || params.get('key') || '').trim().toUpperCase();

    if (queryKey === expectedKey) {
      try {
        localStorage.setItem('shotimer_stealth_auth', 'granted');
        localStorage.setItem('shotimer_stealth_timestamp', Date.now().toString());
      } catch {}
      setIsAuthorized(true);
      return;
    }

    // Check stored authorization
    try {
      const stored = localStorage.getItem('shotimer_stealth_auth');
      if (stored === 'granted') {
        setIsAuthorized(true);
        return;
      }
    } catch {}

    setIsAuthorized(false);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const expectedKey = (import.meta.env.VITE_STEALTH_PASSKEY || DEFAULT_PASSKEY).trim().toUpperCase();
    const entered = inputKey.trim().toUpperCase();

    if (entered === expectedKey) {
      try {
        localStorage.setItem('shotimer_stealth_auth', 'granted');
        localStorage.setItem('shotimer_stealth_timestamp', Date.now().toString());
      } catch {}
      setIsAuthorized(true);
    } else {
      setErrorMsg('Invalid production passkey. Access is restricted to authorized crew.');
    }
    setIsSubmitting(false);
  };

  // While evaluating authorization state
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-neutral-400">
        <div className="animate-pulse flex items-center gap-2 text-xs font-mono tracking-widest uppercase">
          <KeyRound className="w-4 h-4 text-amber-500 animate-spin" />
          Verifying Broadcast Telemetry...
        </div>
      </div>
    );
  }

  // If authorized, render the actual app
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Locked Gatekeeper View
  return (
    <div className="min-h-screen bg-[#07090E] text-neutral-200 flex flex-col justify-between selection:bg-amber-500/20 selection:text-amber-300 font-sans p-4 sm:p-6">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-sm">SHOTIMER</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-2">
              Private Preview
            </span>
          </div>
        </div>

        <a
          href="https://shotimer.io/"
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>shotimer.io</span>
        </a>
      </header>

      {/* Main Lock Card */}
      <main className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-[#0E1118] border border-neutral-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Studio Gatekeeper</h1>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Shotimer is currently in closed alpha development. Enter your private invitation passkey to unlock the director console and stage monitors.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label htmlFor="passkey-input" className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
                Production Passkey
              </label>
              <div className="relative">
                <input
                  id="passkey-input"
                  type="password"
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter secret access key"
                  className="w-full bg-[#151923] border border-neutral-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                  autoFocus
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1">
                  <span>•</span> {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !inputKey.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Unlock Studio</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800/80 text-center">
            <p className="text-[11px] text-neutral-500">
              Don't have a passkey? Join the VIP waitlist on{' '}
              <a href="https://shotimer.io/" className="text-amber-400 hover:underline">
                shotimer.io
              </a>{' '}
              for early launch credentials.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-[11px] text-neutral-600 font-mono">
        SHOTIMER STAGE BROADCAST ENGINE &copy; 2026 • CONFIDENTIAL PRE-LAUNCH
      </footer>
    </div>
  );
}
