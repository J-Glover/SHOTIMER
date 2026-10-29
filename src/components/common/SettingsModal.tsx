import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useTimerStore, FREE_TIMER_LIMIT } from '../../store/useTimerStore';
import { exportRundownJSON, exportRundownCSV, parseCSVToRundown, validateAndSanitizeRundown } from '../../utils/exportImport';
import type { TimerItem } from '../../types/timer';
import ResetDialog from './ResetDialog';

interface Props { isOpen: boolean; onClose: () => void; onOpenPaywall: (feature: string) => void; onCustomize?: () => void }
export default function SettingsModal(props: Props) { return props.isOpen ? <SettingsSession {...props} /> : null; }
function SettingsSession({ onClose, onOpenPaywall, onCustomize }: Props) {
  const state = useTimerStore();
  const [name, setName] = useState(state.roomName);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, setPending] = useState<{ room: string; items: TimerItem[]; filename: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const ref = useDialogFocus(true, onClose);
  async function readFile(selected?: File) {
    setError(''); setStatus(''); setPending(null);
    if (!selected) return;
    const csv = selected.name.toLowerCase().endsWith('.csv');
    if (!csv && !selected.name.toLowerCase().endsWith('.json')) { setError('Choose a JSON backup or CSV schedule.'); return; }
    if (csv && !state.isProUser) { onOpenPaywall('CSV schedule import'); return; }
    if (selected.size > 2 * 1024 * 1024) { setError('Choose a file smaller than 2 MB.'); return; }
    const room = state.roomId;
    try {
      const text = await selected.text();
      const parsed = csv ? parseCSVToRundown(text) : JSON.parse(text);
      const raw = Array.isArray(parsed) ? parsed : parsed?.rundown;
      if (!Array.isArray(raw) || raw.length > 200) throw Error('The file must contain a rundown with up to 200 valid timer entries.');
      const items = validateAndSanitizeRundown(raw);
      if (raw.length && !items.length) throw Error('No valid timers were found in this file.');
      const latest = useTimerStore.getState();
      if (latest.roomId !== room) throw Error('The room changed while reading the file. Select it again in the intended room.');
      if (!latest.isProUser && items.length > FREE_TIMER_LIMIT) throw Error(`The Free plan allows ${FREE_TIMER_LIMIT} timers per room. This file contains ${items.length}.`);
      setPending({ room, items, filename: selected.name });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The file could not be read. Check its format.'); }
  }
  function replace() {
    if (!pending) return;
    const latest = useTimerStore.getState();
    if (latest.roomId !== pending.room || latest.status !== 'stopped') { setError('Reset the current timer before replacing this room’s rundown.'); return; }
    if (!latest.setRundown(pending.items)) { setError('The rundown exceeds this plan’s timer limit.'); return; }
    setPending(null); setError(''); setStatus('Rundown imported. The previous rundown has been replaced.');
  }
  return <div ref={ref} role="dialog" aria-modal="true" aria-label="Event settings" tabIndex={-1} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><section className="app-dialog-panel console-panel w-full max-w-lg p-5 flex flex-col gap-5">
    <header className="flex justify-between items-start gap-3"><div><h2 className="text-base font-semibold">Event settings</h2><p className="output-note mt-1">Changes below apply to this room.</p></div><button className="console-icon" onClick={onClose} aria-label="Close event settings"><X size={18} /></button></header>
    <form className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; state.setRoomName(name.trim()); setStatus('Room name saved.'); setError(''); }}><label className="form-label">Room name<input className="console-input" value={name} maxLength={100} onChange={event => setName(event.target.value)} required /></label><button className="console-button self-start" type="submit" disabled={!name.trim() || name.trim() === state.roomName}>Save room name</button></form>
    <section className="border-t border-neutral-800 pt-4"><h3 className="console-label mb-2">Stage monitor basics</h3>{([{ key: 'progressBar', text: 'Progress bar' }, { key: 'timeOfDay', text: 'Time of day' }, { key: 'upNext', text: 'Up next' }] as const).map(setting => <label className="customize-check" key={setting.key}>{setting.text}<input type="checkbox" checked={state.outputCustomization.viewer.elements.find(element => element.type === setting.key)?.visible ?? true} onChange={event => { const config = state.outputCustomization.viewer; const element = config.elements.find(element => element.type === setting.key); state.applyOutputConfigs({ viewer: { ...config, elements: element ? config.elements.map(value => value.id === element.id ? { ...value, visible: event.target.checked } : value) : [...config.elements, { id: `basic-${setting.key}`, type: setting.key, label: setting.text, visible: event.target.checked, order: config.elements.length }] } }); }} /></label>)}<p className="output-note mt-2">Saved when changed. These switches also update the output customizer. The separate Timer only switch hides these details on a receiving device.</p>{onCustomize && <button className="console-button mt-3" onClick={onCustomize}>Customize display content</button>}</section>
    <section className="border-t border-neutral-800 pt-4 flex flex-col gap-3"><h3 className="console-label">Rundown backup & import</h3><div className="flex flex-wrap gap-2"><button className="console-button" onClick={() => exportRundownJSON(state.roomName, state.rundown)}>Download JSON backup</button><button className="console-button" onClick={() => state.isProUser ? exportRundownCSV(state.roomName, state.rundown) : onOpenPaywall('CSV schedule export')}>Export CSV{!state.isProUser ? ' · Pro' : ''}</button></div><input ref={file} className="hidden" type="file" accept=".json,.csv" onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }} /><button className="console-button" onClick={() => file.current?.click()}>Choose JSON or CSV to import</button><p className="output-note">JSON backup and restore are free. CSV import/export is reserved for Pro. Importing replaces this room’s current rundown.</p>
      {pending && <div className="import-review"><strong className="text-sm break-words">Review {pending.filename}</strong><p className="output-note">{pending.items.length} timers will replace {state.rundown.length} current timers.</p><ul className="text-xs text-neutral-300 space-y-1">{pending.items.slice(0, 8).map((item, index) => <li key={index}>{index + 1}. {item.title}</li>)}</ul>{state.status !== 'stopped' && <p className="text-xs text-amber-300">Reset the current timer before replacing the rundown.</p>}<div className="flex gap-2"><button className="console-button" onClick={() => setPending(null)}>Cancel import</button><button className="console-button primary" disabled={state.status !== 'stopped'} onClick={replace}>Replace rundown</button></div></div>}
    </section>
    <section className="border-t border-neutral-700 pt-4 flex flex-col gap-2"><h3 className="console-label">Room reset</h3><p className="output-note">Start again in this room. Review what will be cleared before applying.</p><button className="console-button self-start" onClick={() => setResetOpen(true)}>Reset this room…</button></section>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}<p role="status" className="output-note">{status}</p><button className="console-button self-end" onClick={onClose}>Done</button>
    {resetOpen && <ResetDialog scope="room" onClose={() => setResetOpen(false)} />}
  </section></div>;
}
