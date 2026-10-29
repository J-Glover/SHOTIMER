import { useState } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useTimerStore } from '../../store/useTimerStore';
import { timingValidation } from '../../utils/outputModel';
import { soundSynth } from '../../audio/soundSynthesizer';
import type { TimerItem, TimerType, ChimeStyle } from '../../types/timer';

interface Props { isOpen: boolean; timer: TimerItem | null; onClose: () => void; onUpdate: (id: string, updates: Partial<TimerItem>) => void; onDuplicate: (id: string) => boolean; onDelete: (id: string) => void; canDelete: boolean; onOpenPaywall?: (feature: string) => void }
export default function TimerSettingsModal(props: Props) { return props.isOpen && props.timer ? <TimerSession key={props.timer.id} {...props} timer={props.timer} /> : null; }
function TimerSession({ timer, onClose, onUpdate, onDuplicate, onDelete, canDelete, onOpenPaywall }: Props & { timer: TimerItem }) {
  const state = useTimerStore();
  const room = useState(state.roomId)[0];
  const ref = useDialogFocus(true, onClose);
  const [tab, setTab] = useState('timing');
  const [draft, setDraft] = useState(() => structuredClone(timer));
  const [minutes, setMinutes] = useState(Math.floor(timer.durationSeconds / 60));
  const [seconds, setSeconds] = useState(timer.durationSeconds % 60);
  const [finish, setFinish] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const locked = state.activeTimerId === timer.id && (state.status === 'running' || state.status === 'paused');
  const change = (updates: Partial<TimerItem>) => { setDraft(value => ({ ...value, ...updates })); setError(''); };
  function save() {
    const latest = useTimerStore.getState();
    if (latest.roomId !== room || !latest.rundown.some(item => item.id === timer.id)) { setError('This timer is no longer in the current room. Close settings and reopen it.'); return; }
    const liveLocked = latest.activeTimerId === timer.id && (latest.status === 'running' || latest.status === 'paused');
    const duration = liveLocked ? timer.durationSeconds : minutes * 60 + seconds;
    const invalid = timingValidation(duration, draft.thresholds.yellowTime, draft.thresholds.redTime);
    if (invalid || (!liveLocked && (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds > 59))) { setError(invalid || 'Enter whole minutes and seconds from 0 to 59.'); return; }
    const updates: Partial<TimerItem> = { title: draft.title.trim() || 'Untitled segment', speaker: draft.speaker.trim(), notes: draft.notes?.trim(), thresholds: draft.thresholds, sounds: draft.sounds, autoStartNext: draft.autoStartNext };
    if (!liveLocked) Object.assign(updates, { type: draft.type, durationSeconds: duration, scheduledStartTime: draft.scheduledStartTime || undefined });
    onUpdate(timer.id, updates); onClose();
  }
  function calculate() {
    if (!finish) return;
    const now = new Date();
    const start = draft.scheduledStartTime || `${now.getHours()}:${now.getMinutes()}`;
    const toMinutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    const duration = (toMinutes(finish) - toMinutes(start) + 1440) % 1440;
    if (!duration) { setFeedback('Choose a finish time later than the start time.'); return; }
    setMinutes(duration); setSeconds(0); setFeedback(`Duration set to ${duration} minutes. Calculated from ${draft.scheduledStartTime ? 'the scheduled start' : 'the current minute'}; times after midnight use the following day.`);
  }
  return <div ref={ref} role="dialog" aria-modal="true" aria-label="Timer settings" tabIndex={-1} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <section className="console-panel app-dialog-panel max-w-xl w-full flex flex-col">
      <header className="p-5 flex justify-between gap-3 border-b border-neutral-700"><div><h2 className="text-lg font-semibold">Timer settings</h2><p className="output-note mt-1">{timer.title}</p></div><button className="console-icon" aria-label="Close timer settings" onClick={onClose}><X size={18} /></button></header>
      <nav className="flex gap-1 p-3 flex-wrap border-b border-neutral-700" aria-label="Timer settings sections">{['timing', 'alerts', 'audio', 'notes'].map(value => <button className={`console-button ${tab === value ? 'primary' : ''}`} key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{({ timing: 'Timing', alerts: 'Alerts', audio: 'Audio', notes: 'Speaker notes' })[value]}</button>)}</nav>
      <div className="p-5 flex flex-col gap-4">
        {tab === 'timing' && <>
          <label className="form-label">Segment title<input className="console-input" maxLength={160} value={draft.title} onChange={event => change({ title: event.target.value })} /></label>
          <label className="form-label">Speaker<input className="console-input" maxLength={120} value={draft.speaker} onChange={event => change({ speaker: event.target.value })} /></label>
          {locked && <p className="draft-warning">Reset this timer before changing its mode, duration or scheduled start. Names, alerts, notes and linking can still be saved.</p>}
          <fieldset disabled={locked} className="flex flex-col gap-4 disabled:opacity-50">
            <label className="form-label">Timer mode<select className="console-input" value={draft.type} onChange={event => change({ type: event.target.value as TimerType })}><option value="countdown">Countdown</option><option value="countup">Count up</option><option value="clock">Time of day</option></select></label>
            <div className="grid grid-cols-2 gap-3"><label className="form-label">Minutes<input className="console-input" type="number" min={0} max={1440} step={1} value={minutes} onChange={event => setMinutes(event.target.valueAsNumber)} /></label><label className="form-label">Seconds<input className="console-input" type="number" min={0} max={59} step={1} value={seconds} onChange={event => setSeconds(event.target.valueAsNumber)} /></label></div>
            <p className="output-note">{draft.type === 'clock' ? 'Duration reserves time in the schedule. The display shows the current wall clock.' : 'Enter a duration from 1 second to 24 hours.'}</p>
            <label className="form-label">Scheduled start (optional)<input className="console-input" type="time" value={draft.scheduledStartTime || ''} onChange={event => change({ scheduledStartTime: event.target.value })} /></label>
            <p className="output-note">Starts the selected timer at this device’s local time while the controller is open and ready.</p>
            <div className="import-review"><label className="form-label">Calculate duration to finish at<input className="console-input" type="time" value={finish} onChange={event => setFinish(event.target.value)} /></label><button type="button" className="console-button" disabled={!finish} onClick={calculate}>Calculate duration</button>{feedback && <p role="status" className="output-note">{feedback}</p>}</div>
          </fieldset>
          <label className="customize-check">Start the next timer automatically<input type="checkbox" checked={draft.autoStartNext} onChange={event => change({ autoStartNext: event.target.checked })} /></label><p className="output-note">Links to the following segment when this timer reaches its duration. Time-of-day mode does not auto-advance.</p>
        </>}
        {tab === 'alerts' && <><p className="output-note">Thresholds use seconds remaining until the target duration for countdown and count-up timers. Enter 0 to disable a colour alert.</p>{(['yellowTime', 'redTime'] as const).map(key => <label className="form-label" key={key}>{key === 'yellowTime' ? 'Warning (yellow)' : 'Urgent (red)'}<input className="console-input" type="number" min={0} max={86400} step={1} value={draft.thresholds[key]} onChange={event => change({ thresholds: { ...draft.thresholds, [key]: event.target.valueAsNumber } })} /></label>)}<label className="customize-check">Pulse the digits during overtime<input type="checkbox" checked={draft.thresholds.overtimeBlink} onChange={event => change({ thresholds: { ...draft.thresholds, overtimeBlink: event.target.checked } })} /></label></>}
        {tab === 'audio' && <><label className="form-label">Warning chime<select className="console-input" value={draft.sounds.chimeStyle} onChange={event => change({ sounds: { ...draft.sounds, chimeStyle: event.target.value as ChimeStyle } })}><option value="soft_bell">Soft bell</option><option value="marimba">Marimba</option><option value="gong">Deep gong</option><option value="digital_beep">Alert beep</option></select></label><label className="form-label">Volume · {Math.round(draft.sounds.volume * 100)}%<input type="range" min={0} max={1} step={0.05} value={draft.sounds.volume} onChange={event => change({ sounds: { ...draft.sounds, volume: Number(event.target.value) } })} /></label><button className="console-button self-start" onClick={() => soundSynth.play(draft.sounds.chimeStyle, draft.sounds.volume)}>Test warning chime</button>{(['soundOnYellow', 'soundOnRed', 'soundOnFinish'] as const).map(key => <label className="customize-check" key={key}>{({ soundOnYellow: 'Chime at yellow warning', soundOnRed: 'Beep at red warning', soundOnFinish: 'Gong at the target duration' })[key]}<input type="checkbox" checked={draft.sounds[key]} onChange={event => change({ sounds: { ...draft.sounds, [key]: event.target.checked } })} /></label>)}<p className="output-note">Sound requires browser audio permission. The controller’s mute switch silences automatic alerts. A sound test plays even when automatic alerts are muted.</p></>}
        {tab === 'notes' && <><label className="form-label">Speaker notes / stage cues<textarea className="console-input" rows={7} maxLength={4000} value={draft.notes || ''} onChange={event => change({ notes: event.target.value })} /></label><p className="output-note">Shown in the moderator summary and on stage monitors when speaker notes are enabled. Notes do not appear on the public agenda.</p></>}
        {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
      </div>
      <footer className="p-4 border-t border-neutral-700 flex justify-between gap-3 flex-wrap"><div className="flex gap-2"><button className="console-button" onClick={() => { if (onDuplicate(timer.id)) onClose(); else onOpenPaywall?.('Additional timers'); }}>Duplicate</button>{canDelete && <button className="console-button" onClick={() => { onDelete(timer.id); onClose(); }}>Delete</button>}</div><div className="flex gap-2"><button className="console-button" onClick={onClose}>Cancel</button><button className="console-button primary" onClick={save}>Save changes</button></div></footer>
    </section>
  </div>;
}
