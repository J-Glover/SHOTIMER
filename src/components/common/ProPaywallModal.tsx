import { useState } from 'react';
import { X, Check, Sparkles, ShieldCheck, Zap, Lock, Key } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';

interface ProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function ProPaywallModal({ isOpen, onClose, featureName = 'This feature' }: ProPaywallModalProps) {
  const { isProUser, activatePro, deactivatePro } = useTimerStore();
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleApplyKey = (e: React.FormEvent) => {
    e.preventDefault();
    const key = licenseKeyInput.trim().toUpperCase();
    if (key === 'PRO-STAGE-2026' || key.startsWith('SHOTIMER-PRO-') || key === 'DEMO') {
      activatePro(key);
      setSuccessMsg('License activated successfully! Pro features unlocked.');
      setErrorMsg('');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } else {
      setErrorMsg('Invalid license key. Try demo key: PRO-STAGE-2026');
      setSuccessMsg('');
    }
  };

  const handleInstantDemoActivate = () => {
    activatePro('PRO-DEMO-TRIAL');
    setSuccessMsg('Pro Mode unlocked for testing!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="bg-[#1C1C1C] border border-neutral-700 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-neutral-200 relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white shrink-0">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Shotimer Pro</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PRO FEATURE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              <strong className="text-white">{featureName}</strong> is a Pro feature designed for professional event productions.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#141414] p-4 rounded-xl border border-neutral-800 text-xs">
          {[
            { title: 'CSV & Excel Import/Export', desc: 'Sync schedules directly with spreadsheets' },
            { title: 'Custom Themes & OLED Black', desc: 'True zero-backlight stage display & fonts' },
            { title: 'Stream Deck & Companion API', desc: 'Control timers with Elgato buttons & macros' },
            { title: 'Unlimited Timers & Rooms', desc: 'Host multi-track conferences & breakouts' },
            { title: 'Custom Stage Branding', desc: 'Upload your event sponsor & client logos' },
            { title: 'Offline Network Server', desc: 'Local Wi-Fi broadcast with zero internet' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-neutral-200">{item.title}</span>
                <p className="text-[11px] text-neutral-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* License Key Activation Section */}
        <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Enter License Key</span>
            </span>
            {isProUser ? (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active Pro User
              </span>
            ) : (
              <span className="text-[11px] text-neutral-500">Demo Key: <code className="text-amber-300">PRO-STAGE-2026</code></span>
            )}
          </div>

          <form onSubmit={handleApplyKey} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. PRO-STAGE-2026"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
              className="flex-1 bg-[#141414] border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-amber-500 uppercase"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors shadow-md shadow-amber-500/20"
            >
              Activate
            </button>
          </form>

          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
          {successMsg && <p className="text-xs text-emerald-400 font-semibold">{successMsg}</p>}
        </div>

        {/* Action Buttons: Demo Unlock vs Purchase */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {!isProUser ? (
            <>
              <button
                type="button"
                onClick={handleInstantDemoActivate}
                className="w-full sm:flex-1 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Test with Free Demo License</span>
              </button>

              <button
                type="button"
                onClick={() => alert('Paywall Integration: Connect this button to your Stripe, Paddle, or LemonSqueezy checkout URL.')}
                className="w-full sm:flex-1 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold transition-transform shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Upgrade (TBA)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                deactivatePro();
                setSuccessMsg('Reverted back to Free tier for testing.');
                setTimeout(() => setSuccessMsg(''), 1500);
              }}
              className="w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-medium border border-neutral-700 transition-colors"
            >
              Switch back to Free Tier (for test testing)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
