import { useState } from 'react';
import { Monitor, X } from 'lucide-react';
import { useConnectionsStore } from '../../hooks/useRoomPresence';
import { useTimerStore } from '../../store/useTimerStore';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import ConnectionsPanel from './ConnectionsPanel';

function ScreensDialog({ now, onClose }: { now: number; onClose: () => void }) {
  const ref = useDialogFocus(true, onClose);
  return <div ref={ref} className="screen-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Connected screens" tabIndex={-1}><section className="screen-dialog app-dialog-panel"><header><h2>Connected screens</h2><button className="console-icon" aria-label="Close connected screens" onClick={onClose}><X size={18} /></button></header><ConnectionsPanel now={now} /></section></div>;
}
export default function ScreensButton({ now }: { now: number }) {
  const roomId = useTimerStore(s => s.roomId);
  const connected = useTimerStore(s => s.cloudSyncStatus === 'connected');
  const peers = useConnectionsStore(s => s.peers).filter(peer => peer.roomId === roomId && peer.role !== 'controller');
  const uncertain = !connected || peers.some(peer => now - peer.lastSeen > 15000);
  const [open, setOpen] = useState(false);
  return <><button className={`console-button screens-button ${uncertain ? 'unconfirmed' : ''}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}><Monitor size={16} />Screens <span>{peers.length}</span>{uncertain && <span className="screens-warning">Unconfirmed</span>}</button>{open && <ScreensDialog now={now} onClose={() => setOpen(false)} />}</>;
}
