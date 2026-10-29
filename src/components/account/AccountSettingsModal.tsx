import { useState } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { FREE_ROOM_LIMIT, useTimerStore } from '../../store/useTimerStore';
import { logoutUser } from '../../services/authService';

interface Props { isOpen: boolean; onClose: () => void; onOpenPaywall?: () => void }
export default function AccountSettingsModal(props: Props) { return props.isOpen ? <AccountSession {...props} /> : null; }
function AccountSession({ onClose, onOpenPaywall }: Props) {
  const state = useTimerStore();
  const ref = useDialogFocus(true, onClose);
  const [tab, setTab] = useState('account');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const limited = !state.isProUser && state.availableRooms.length >= FREE_ROOM_LIMIT;
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : 'The change could not be saved. Try again.'); }
    finally { setBusy(false); }
  }
  return <div ref={ref} role="dialog" aria-modal="true" aria-label="Account settings" tabIndex={-1} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <section className="console-panel app-dialog-panel w-full max-w-xl p-5 sm:p-6 flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Account & rooms</h2><p className="output-note mt-1 break-all">{state.currentUser?.email || 'Guest operator'}</p></div><button className="console-icon" aria-label="Close account settings" onClick={onClose}><X size={18} /></button></header>
      <nav className="flex gap-2" aria-label="Account sections">{['account', 'rooms'].map(value => <button key={value} className={`console-button ${tab === value ? 'primary' : ''}`} aria-pressed={tab === value} onClick={() => { setTab(value); setError(''); setDeleting(null); }}>{value === 'account' ? 'Account & plan' : 'Rooms'}</button>)}</nav>
      {tab === 'account' ? <>
        <div className="import-review"><h3 className="font-semibold">{state.isProUser ? 'Pro preview enabled' : 'Free plan'}</h3><p className="output-note">{state.isProUser ? 'Evaluation access to additional timers, rooms, CSV schedules and output appearance.' : '3 rooms with up to 3 timers in each. Use or rename the included rooms to get started.'}</p><p className="output-note">Paid subscriptions are not available yet.</p>{onOpenPaywall && <button className="console-button self-start" onClick={() => { onClose(); onOpenPaywall(); }}>{state.isProUser ? 'Manage preview access' : 'Explore Pro preview'}</button>}</div>
        <p className="output-note">Rundowns and output settings are stored in this browser. Signed-in rooms can also be saved to your account. Live connections depend on network availability; export a JSON backup before a show.</p>
        <p className="output-note">Change output appearance from the preview’s Customize button. Set chimes and volume in each timer’s settings.</p>
        {state.currentUser && <button disabled={busy} className="console-button self-start" onClick={() => run(async () => { const result = await logoutUser(); if (result.error) throw Error(result.error); onClose(); })}>{busy ? 'Signing out…' : 'Sign out'}</button>}
      </> : <>
        <p className="output-note">Each room has its own rundown and output settings. Switching rooms resets playback on this controller.</p>
        <div className="flex justify-between text-xs text-neutral-400"><span>{state.availableRooms.length} {state.isProUser ? 'rooms' : `of ${FREE_ROOM_LIMIT} rooms`}</span>{limited && <span>Free plan limit reached</span>}</div>
        {state.availableRooms.map(room => <div key={room.id} className="import-review"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium break-words min-w-0">{room.name}</span><div className="flex gap-2 shrink-0">{room.id === state.roomId ? <span className="text-xs text-emerald-300 self-center">Current</span> : <button disabled={busy} className="console-button" onClick={() => state.switchRoom(room.id)}>Switch</button>}{!['room-1', 'room-2', 'room-3'].includes(room.id) && <button disabled={busy} className="console-button" aria-label={`Delete ${room.name}`} onClick={() => setDeleting(room.id)}>Delete</button>}</div></div>{deleting === room.id && <><p className="output-note">Delete this room and its saved rundown? Export a backup first if you need to keep it.</p><div className="flex gap-2"><button disabled={busy} className="console-button" onClick={() => setDeleting(null)}>Keep room</button><button disabled={busy} className="console-button danger" onClick={() => run(async () => { await state.deleteCustomRoom(room.id); setDeleting(null); })}>Delete room</button></div></>}</div>)}
        <form className="flex flex-col gap-2" onSubmit={event => { event.preventDefault(); run(async () => { await state.createCustomRoom(name.trim()); setName(''); }); }}><label className="form-label" htmlFor="new-room-name">New room name</label><div className="flex gap-2"><input className="console-input min-w-0" id="new-room-name" maxLength={80} disabled={limited || !state.currentUser || busy} value={name} onChange={event => setName(event.target.value)} /><button className="console-button" disabled={limited || !state.currentUser || busy || !name.trim()}>Add room</button></div><p className="output-note">{limited ? 'All 3 free rooms are available above. Rename the current room in Room settings.' : !state.currentUser ? 'Sign in to create custom rooms.' : 'New rooms start with a sample rundown.'}</p></form>
      </>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <footer className="flex justify-end"><button className="console-button" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
