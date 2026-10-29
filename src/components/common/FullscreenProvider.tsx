import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Maximize2, Minimize2, Smartphone, X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useWakeLock } from '../../hooks/useWakeLock';
import { exitAppFullscreen, fullscreenElement, isStandaloneDisplay, requestAppFullscreen } from '../../utils/fullscreen';
import '../../styles/fullscreen.css';
import { FullscreenContext, useFullscreen } from '../../hooks/useFullscreen';

function FullscreenHelp({ open, onClose, failed }: { open: boolean; onClose: () => void; failed: boolean }) {
  const dialogRef = useDialogFocus(open, onClose);
  if (!open) return null;
  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Fullscreen on your device" tabIndex={-1} className="fullscreen-help-backdrop">
    <div className="fullscreen-help">
      <div className="flex items-center justify-between gap-4"><h2 className="text-base font-semibold flex items-center gap-2"><Smartphone size={19} />Fullscreen on your device</h2>
        <button className="screen-control" onClick={onClose} aria-label="Close fullscreen help"><X size={18} /></button></div>
      <p className="text-sm text-neutral-300 leading-relaxed">{failed ? 'The browser could not enter fullscreen. Clean view is on, but the browser may keep its bars visible.' : 'Use the fullscreen button to hide browser tabs and the address bar where your browser supports it.'}</p>
      <div><h3>iPhone / iPad</h3><ol><li>Open this room in Safari.</li><li>Tap Share (or the page menu, then Share).</li><li>Choose <strong>Add to Home Screen</strong>. Enable <strong>Open as Web App</strong> if shown, then tap Add.</li><li>Open the new Home Screen icon to use this room without Safari’s address bar.</li></ol></div>
      <div><h3>Android</h3><p>Tap Fullscreen. If the browser keeps its bars, use its menu → Add to Home screen (or Install app), then open the new icon.</p></div>
      <p className="text-xs text-neutral-400 leading-relaxed">Add the editor and stage monitor separately to keep shortcuts to each view. Phone status bars may remain, depending on the device. On a computer, Esc exits the app’s fullscreen; F11 controls browser fullscreen.</p>
      <button className="screen-control screen-control-primary" onClick={onClose}>Continue with clean view</button>
    </div>
  </div>;
}

export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(isStandaloneDisplay);
  const [nativeActive, setNativeActive] = useState(() => typeof document !== 'undefined' && !!fullscreenElement(document));
  const [helpOpen, setHelpOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const immersive = focusMode || nativeActive;
  useWakeLock(immersive);

  useEffect(() => {
    const changed = () => {
      const active = !!fullscreenElement(document);
      setNativeActive(active);
      setFocusMode(active);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !fullscreenElement(document) && !document.querySelector('[role="dialog"], details[open]')) setFocusMode(false);
    };
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('webkitfullscreenchange', changed);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('fullscreenchange', changed);
      document.removeEventListener('webkitfullscreenchange', changed);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  async function toggle() {
    if (pending.current) return;
    pending.current = true;
    setError('');
    try {
      if (immersive) {
        await exitAppFullscreen(document);
        setFocusMode(false);
      } else {
        setFocusMode(true);
        if (isStandaloneDisplay()) return;
        try {
          if (await requestAppFullscreen(document)) return;
        } catch { /* Clean view still works when fullscreen is unavailable or denied. */ }
        setFailed(true);
        setHelpOpen(true);
      }
    } catch { setError('Could not exit fullscreen. Use Esc or your browser’s fullscreen control.'); }
    finally { pending.current = false; }
  }

  return <FullscreenContext.Provider value={{ immersive, nativeActive, toggle, openHelp: () => { setFailed(false); setHelpOpen(true); } }}>
    {children}
    <FullscreenHelp open={helpOpen} failed={failed} onClose={() => setHelpOpen(false)} />
    {error && <button className="fullscreen-error" role="alert" onClick={() => setError('')}>{error}</button>}
  </FullscreenContext.Provider>;
}

export function FullscreenButton({ viewer = false }: { viewer?: boolean }) {
  const { immersive, toggle } = useFullscreen();
  const label = immersive ? 'Exit fullscreen' : 'Fullscreen';
  return <button type="button" className={viewer ? 'screen-control' : 'console-button fullscreen-button'}
    aria-label={label} title={label} aria-pressed={immersive}
    onClick={event => { void toggle(); if (event.detail > 0) event.currentTarget.blur(); }}>
    {immersive ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span className="fullscreen-button-label">{label}</span>
  </button>;
}
