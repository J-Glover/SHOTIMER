import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { exportRundownJSON } from '../../utils/exportImport';
import type { ResetScope } from '../../utils/roomReset';

interface Props { scope: ResetScope; onClose: () => void; onComplete?: () => void }
const labels: Record<ResetScope, string> = { timing: 'Reset show timing', restart: 'Restart rundown', rundown: 'Clear rundown', messages: 'Clear stage messages', appearance: 'Reset stage appearance', room: 'Reset this room' };
export default function ResetDialog({ scope, onClose, onComplete }: Props) {
  const [snapshot] = useState(() => { const state = useTimerStore.getState(); return { roomId: state.roomId, roomName: state.roomName, rundown: structuredClone(state.rundown), activeTimerId: state.activeTimerId, messageId: state.activeMessage?.id || null, outputs: JSON.stringify(state.outputCustomization), resetRevision: state.resetRevision || 0 }; });
  const [resetAppearance, setResetAppearance] = useState(false);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [error, setError] = useState('');
  const ref = useDialogFocus(true, onClose);
  const stopsPlayback = ['timing', 'restart', 'rundown', 'room'].includes(scope);
  const deletesRundown = scope === 'rundown' || scope === 'room';
  const selected = snapshot.rundown.find(item => item.id === snapshot.activeTimerId);
  function apply() {
    try {
      useTimerStore.getState().resetRoomSection(scope, {
        roomId: snapshot.roomId, resetAppearance, removeLogo, expectedResetRevision: snapshot.resetRevision,
        ...(['timing', 'restart', 'rundown', 'room'].includes(scope) ? { expectedRundown: JSON.stringify(snapshot.rundown), expectedActiveTimerId: snapshot.activeTimerId } : {}),
        ...(['messages', 'room'].includes(scope) ? { expectedMessageId: snapshot.messageId } : {}),
        ...(scope === 'appearance' || resetAppearance ? { expectedOutputs: snapshot.outputs } : {}),
      });
      onComplete?.(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The reset could not be completed.'); }
  }
  return <div ref={ref} role="dialog" aria-modal="true" aria-label={`${labels[scope]} confirmation`} tabIndex={-1} className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
    <section className="console-panel app-dialog-panel w-full max-w-lg p-5 sm:p-6 flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3"><div><p className="output-eyebrow mb-2">{snapshot.roomName}</p><h2 className="text-lg font-semibold">{labels[scope]}?</h2></div><button className="console-icon" onClick={onClose} aria-label="Cancel reset"><X size={18} /></button></header>
      {scope === 'timing' && <p className="text-sm leading-relaxed text-neutral-300">Stop and restore {selected ? `“${selected.title}”` : 'the selected timer'} to its original duration, clear elapsed time and overtime, and return show timing to <strong>Not started</strong>. All segments, scheduled times, messages and display settings are kept.</p>}
      {scope === 'restart' && <p className="text-sm leading-relaxed text-neutral-300">Stop playback, select the first segment and return show timing to <strong>Not started</strong>. All {snapshot.rundown.length} segments, speaker notes, scheduled times, messages and display settings are kept.</p>}
      {deletesRundown && <div className="draft-warning"><strong>{snapshot.rundown.length} segment{snapshot.rundown.length === 1 ? '' : 's'} will be removed.</strong><p className="mt-2">This includes their titles, durations, speaker notes and scheduled starts. Playback stops and the rundown becomes empty. Download a backup first if you need to keep it.</p></div>}
      {scope === 'rundown' && <p className="output-note">The current stage message, saved presets, room name, links and display settings are kept.</p>}
      {scope === 'messages' && <p className="text-sm leading-relaxed text-neutral-300">Remove the live stage message and clear message drafts on connected consoles in this room. Reusable saved presets, playback, the rundown and display settings are kept.</p>}
      {scope === 'room' && <><p className="text-sm leading-relaxed text-neutral-300">Also clear the live message, message drafts and show timing, and turn blackout off. Your room name, sharing links, account, plan, saved presets and other rooms are kept.</p><label className="flex gap-3 items-start text-sm text-neutral-300"><input className="mt-1" type="checkbox" checked={resetAppearance} onChange={event => setResetAppearance(event.target.checked)} /><span>Also reset all output appearance and remove the uploaded logo</span></label></>}
      {scope === 'appearance' && <><p className="text-sm leading-relaxed text-neutral-300">Apply the clean stage defaults to this room’s connected monitors. Playback, the rundown, messages and other output layouts are kept. This replaces the live stage settings.</p><label className="flex gap-3 items-center text-sm text-neutral-300"><input type="checkbox" checked={removeLogo} onChange={event => setRemoveLogo(event.target.checked)} />Also remove the uploaded logo</label></>}
      {stopsPlayback && <p className="output-note">Scheduled auto-starts will be paused until you explicitly resume them. Saved start times are not automatically re-armed.</p>}
      <p className="output-note">Connected screens in this room update when connected. Screens that are offline receive the reset on reconnection.</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <footer className="flex gap-2 flex-wrap justify-end">{deletesRundown && <button className="console-button mr-auto" onClick={() => exportRundownJSON(snapshot.roomName, snapshot.rundown)}>Download rundown backup</button>}<button className="console-button" onClick={onClose}>Cancel</button><button className={`console-button ${deletesRundown ? 'danger-active' : 'primary'}`} onClick={apply}><RotateCcw size={15} />{labels[scope]}</button></footer>
    </section>
  </div>;
}
