import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
export default function OperatorShortcutsDialog({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus(true, onClose);
  return <div ref={ref} className="screen-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Operator shortcuts" tabIndex={-1}><section className="screen-dialog app-dialog-panel"><header><h2>Operator shortcuts</h2><button className="console-icon" onClick={onClose} aria-label="Close shortcuts"><X size={18} /></button></header><dl className="shortcut-list">{[['Space', 'Start / pause'], ['R', 'Reset current timer'], ['← / →', 'Previous / next timer'], ['B', 'Blackout']].map(([key, label]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>)}</dl><p className="output-note">Shortcuts run on the connected controller. They pause while typing or while a menu or dialog is open.</p></section></div>;
}
