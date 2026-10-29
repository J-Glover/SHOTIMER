import { useState } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { registerWithEmail, loginWithEmail, loginWithGoogle, sendPasswordReset, updatePassword } from '../../services/authService';
import { isSupabaseConfigured } from '../../lib/supabase';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
interface Props { isOpen: boolean; onClose: () => void; onSuccess?: () => void; initialMode?: Mode }
export default function AuthModal(props: Props) { return props.isOpen ? <AuthSession {...props} /> : null; }
function AuthSession({ onClose, onSuccess, initialMode = 'login' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [complete, setComplete] = useState(false);
  const ref = useDialogFocus(true, onClose);
  const titles = { login: 'Sign in', register: 'Create a free account', forgot: 'Reset your password', reset: 'Choose a new password' };
  function switchMode(next: Mode) { setMode(next); setError(''); setStatus(''); setPassword(''); setConfirm(''); setComplete(false); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setError(''); setStatus('');
    if ((mode === 'register' || mode === 'reset') && password.length < 6) { setError('Use at least 6 characters for your password.'); return; }
    if (mode === 'reset' && password !== confirm) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const result = await sendPasswordReset(email);
        if (result.error) setError(result.error); else { setStatus('If an account uses this email, you’ll receive a reset link. Check your inbox and spam folder.'); setComplete(true); }
      } else if (mode === 'reset') {
        const result = await updatePassword(password);
        if (result.error) setError(result.error); else { setStatus('Your password has been updated.'); setComplete(true); setPassword(''); setConfirm(''); onSuccess?.(); }
      } else {
        const result = mode === 'login' ? await loginWithEmail(email, password) : await registerWithEmail(email, password, name.trim());
        if (result.error) setError(result.error);
        else if (result.requiresEmailConfirmation) { setStatus('Check your inbox for a confirmation link. Confirm your email before signing in.'); setComplete(true); setPassword(''); }
        else { setStatus('You’re signed in.'); setComplete(true); setPassword(''); onSuccess?.(); }
      }
    } catch { setError('We couldn’t connect to account services. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div ref={ref} role="dialog" aria-modal="true" aria-label={titles[mode]} tabIndex={-1} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <section className="console-panel app-dialog-panel w-full max-w-md p-6 flex flex-col gap-4">
      <header className="flex justify-between items-start gap-4"><div><p className="output-eyebrow mb-2">Shotimer account</p><h2 className="text-xl font-semibold">{titles[mode]}</h2></div><button className="console-icon" aria-label="Close account form" onClick={onClose}><X size={18} /></button></header>
      {!isSupabaseConfigured && <p className="draft-warning">Account services are unavailable in this installation. You can continue using the timer as a guest.</p>}
      {(mode === 'login' || mode === 'register') && !complete && <><button disabled={busy || !isSupabaseConfigured} className="console-button justify-center" onClick={async () => { setBusy(true); setError(''); try { const result = await loginWithGoogle(); if (result.error) setError(result.error); else setStatus('Opening Google sign-in…'); } catch { setError('Google sign-in could not be opened. Try email and password.'); } finally { setBusy(false); } }}>Continue with Google</button><p className="output-note text-center">or use email</p></>}
      {!complete && <form className="flex flex-col gap-4" onSubmit={submit}>
        {mode === 'register' && <label className="form-label">Your name / organisation<input className="console-input" autoComplete="organization" required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>}
        {mode !== 'reset' && <label className="form-label">Email address<input type="email" className="console-input" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>}
        {mode !== 'forgot' && <><label className="form-label">{mode === 'reset' ? 'New password' : 'Password'}<input type={visible ? 'text' : 'password'} className="console-input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? undefined : 6} value={password} onChange={event => setPassword(event.target.value)} /></label>{mode === 'reset' && <label className="form-label">Confirm new password<input type={visible ? 'text' : 'password'} className="console-input" autoComplete="new-password" required minLength={6} value={confirm} onChange={event => setConfirm(event.target.value)} /></label>}<label className="flex gap-2 text-xs text-neutral-400"><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} />Show password</label></>}
        <button disabled={busy || !isSupabaseConfigured} className="console-button primary justify-center">{busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : titles[mode]}</button>
      </form>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{status && <p role="status" className="text-sm text-emerald-300">{status}</p>}
      {complete && <button className="console-button primary" onClick={onClose}>Done</button>}
      <footer className="flex flex-wrap gap-3 border-t border-neutral-700 pt-3 text-xs">{mode !== 'login' && <button className="text-emerald-300" onClick={() => switchMode('login')}>Back to sign in</button>}{mode === 'login' && <><button className="text-emerald-300" onClick={() => switchMode('register')}>Create an account</button><button className="text-neutral-400" onClick={() => switchMode('forgot')}>Forgot password?</button></>}{mode === 'reset' && <button className="text-emerald-300" onClick={() => switchMode('forgot')}>Request a new reset link</button>}</footer>
    </section>
  </div>;
}
