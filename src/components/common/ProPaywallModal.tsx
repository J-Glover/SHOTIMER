import { useState } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useTimerStore } from '../../store/useTimerStore';

interface Props { isOpen: boolean; onClose: () => void; featureName?: string }
export default function ProPaywallModal(props: Props) { return props.isOpen ? <ProSession {...props} /> : null; }
function ProSession({ onClose, featureName = 'Additional production tools' }: Props) {
  const { isProUser, activatePro, deactivatePro } = useTimerStore();
  const ref = useDialogFocus(true, onClose);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  return <div ref={ref} role="dialog" aria-modal="true" aria-label="Shotimer Pro preview" tabIndex={-1} className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
    <section className="console-panel app-dialog-panel max-w-lg w-full p-6 flex flex-col gap-5">
      <header className="flex justify-between gap-4"><div><h2 className="text-lg font-semibold">Shotimer Pro preview</h2><p className="output-note mt-2">{featureName}</p></div><button className="console-icon" aria-label="Close Pro preview" onClick={onClose}><X size={18} /></button></header>
      <p className="text-sm text-neutral-300">The free app is available now. Pro is in development, and paid subscriptions are not on sale yet.</p>
      <div className="import-review"><h3 className="text-sm font-semibold">Available to evaluate</h3><ul className="text-sm text-neutral-300 list-disc pl-5 space-y-2"><li>Additional timers and custom rooms</li><li>CSV schedule import and export</li><li>Output colours, fonts and content order</li><li>Top-left stage logo upload</li></ul></div>
      <p className="output-note">OBS output and hardware integrations are planned features. Preview access does not enable them.</p>
      {!isProUser ? <><button className="console-button primary" onClick={() => { activatePro('PRO-DEMO-TRIAL'); setStatus('Pro preview enabled on this browser.'); setError(''); }}>Enable free Pro preview</button><form className="flex flex-col gap-2" onSubmit={event => { event.preventDefault(); const value = key.trim().toUpperCase(); if (value === 'PRO-STAGE-2026' || value === 'DEMO') { activatePro(value); setStatus('Preview access enabled.'); setError(''); } else { setError('This preview key was not recognised. Use the free preview button above.'); } }}><label className="form-label" htmlFor="preview-key">Preview key (optional)</label><div className="flex gap-2"><input id="preview-key" className="console-input min-w-0" value={key} onChange={event => setKey(event.target.value)} autoComplete="off" /><button className="console-button" disabled={!key.trim()}>Apply key</button></div></form></> : <button className="console-button" onClick={() => { deactivatePro(); setStatus('Returned to the Free plan. Existing rundowns are kept.'); }}>Return to Free plan</button>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{status && <p role="status" className="text-sm text-emerald-300">{status}</p>}
      <footer className="flex justify-end"><button className="console-button" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
