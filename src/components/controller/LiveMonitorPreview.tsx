import { useState } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, ExternalLink, Paintbrush, MoreHorizontal } from 'lucide-react';
import type { ResetScope } from '../../utils/roomReset';
import type { TimerItem, FlashMessage, TimerStatus, OutputRole } from '../../types/timer';
import type { ScheduleMetrics } from '../../utils/scheduleMath';
import { useOutputSnapshot } from '../../hooks/useOutputSnapshot';
import { getOutputUrl } from '../../utils/outputLinks';
import { OUTPUT_ROLES, clockLabel, timerReadout } from '../../utils/outputModel';
import StageDisplay from '../outputs/StageDisplay';
import AgendaDisplay from '../outputs/AgendaDisplay';
import ModeratorSummary from '../outputs/ModeratorSummary';
import ScheduleDriftBadge from './ScheduleDriftBadge';

interface Props {
  activeTimer: TimerItem | undefined; timeRemaining: number; elapsedTime: number; targetDuration: number;
  overtimeSeconds: number; status: TimerStatus; blackout: boolean; activeMessage: FlashMessage | null;
  start: () => void; pause: () => void; reset: () => void; adjustTime: (seconds: number) => void;
  previousTimer: () => void; nextTimer: () => void; onLaunchStage?: () => void;
  onOpenCustomize?: (role: OutputRole) => void; scheduleMetrics?: ScheduleMetrics;
  onResetSection?: (scope: ResetScope) => void;
}
export default function LiveMonitorPreview({ start, pause, reset, adjustTime, previousTimer, nextTimer, onLaunchStage, onOpenCustomize, scheduleMetrics, onResetSection }: Props) {
  const { state, now } = useOutputSnapshot();
  const [role, setRole] = useState<OutputRole>('viewer');
  const [controlError, setControlError] = useState('');
  function saveControl(action: () => void) {
    try { action(); setControlError(''); } catch { setControlError('This browser could not save the change. Check browser storage and try again.'); }
  }
  const item = state.rundown.find(timer => timer.id === state.activeTimerId) || state.rundown[0];
  const readout = timerReadout(item, state, now);
  const running = state.status === 'running';
  return <section className="console-panel p-4 flex flex-col gap-4">
    <div className="flex items-center flex-wrap justify-between gap-2"><div className="flex items-center gap-2 min-w-0">
      <label className="sr-only" htmlFor="preview-role">Preview output</label><select id="preview-role" className="console-input !w-auto !text-xs" value={role} onChange={event => setRole(event.target.value as OutputRole)}>
        {OUTPUT_ROLES.map(output => <option key={output.id} disabled={!output.available} value={output.id}>{output.label}{!output.available ? ' · Coming soon' : ''}</option>)}
      </select>
      <button className="console-icon" onClick={() => onOpenCustomize?.(role)} title="Customize output" aria-label="Customize output"><Paintbrush size={16} /></button>
      <a href={getOutputUrl(state.roomId, role)} target="_blank" rel="noopener noreferrer" className="console-icon" aria-label="Open output" onClick={role === 'viewer' && onLaunchStage ? event => { event.preventDefault(); onLaunchStage(); } : undefined}><ExternalLink size={15} /></a>
    </div><div className="flex items-center gap-2"><span className={`playback-badge ${running ? 'running' : state.status === 'paused' ? 'paused' : ''}`}><span />{item ? readout.status : 'Empty'}</span>{onResetSection && <details className="console-dropdown"><summary className="console-icon" aria-label="Monitor and timing actions"><MoreHorizontal size={16} /></summary><div className="console-menu" onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><button onClick={() => onResetSection('timing')}>Reset show timing…</button><button onClick={() => onResetSection('appearance')}>Reset stage appearance…</button></div></details>}</div></div>
    <div className="output-preview landscape" aria-label={`${role} live preview`}>
      {role === 'viewer' ? <StageDisplay state={state} now={now} /> : role === 'agenda' ? <AgendaDisplay state={state} now={now} /> : <ModeratorSummary state={state} now={now} />}
    </div>
    <div className="flex items-center justify-between text-xs text-neutral-400"><span>{readout.label}</span><span className="font-mono">{readout.text}</span></div>
    <div className="h-1.5 bg-neutral-800 rounded overflow-hidden"><div className={readout.tone === 'danger' ? 'h-full bg-red-500' : readout.tone === 'warning' ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'} style={{ width: `${readout.progress * 100}%` }} /></div>
    <div className="transport-primary"><button className="console-icon" disabled={!item} onClick={previousTimer} aria-label="Previous timer"><SkipBack size={17} /></button><button className={`transport-start ${running ? 'paused' : ''}`} disabled={!item} onClick={running ? pause : start}>{running ? <Pause size={17} /> : <Play size={17} />}{running ? 'Pause' : state.status === 'paused' ? 'Resume' : 'Start'}</button><button className="console-icon" disabled={!item} onClick={nextTimer} aria-label="Next timer"><SkipForward size={17} /></button><button className="console-icon" disabled={!item} onClick={() => saveControl(reset)} aria-label="Reset current timer" title="Reset current timer. Use the monitor menu to reset show timing."><RotateCcw size={17} /></button></div>
    <div className="transport-adjustments"><button className="console-button" disabled={!item} onClick={() => adjustTime(-60)}>-1 min</button><button className="console-button" disabled={!item} onClick={() => adjustTime(60)}>+1 min</button><button className="console-button" disabled={!item} onClick={() => adjustTime(300)}>+5 min</button></div>
    {scheduleMetrics && <ScheduleDriftBadge metrics={scheduleMetrics} />}
    {state.scheduledStartsArmed === false && state.rundown.some(timer => timer.scheduledStartTime) && <div className="schedule-paused"><p>Scheduled auto-starts paused. Saved start times are kept.</p><button className="console-button" title="A selected timer scheduled for the current minute may start immediately" onClick={() => saveControl(state.armScheduledStarts)}>Resume scheduled starts</button></div>}
    {controlError && <p role="alert" className="text-xs text-red-300">{controlError}</p>}
    <div className="flex justify-between text-xs text-neutral-400 border-t border-neutral-800 pt-3"><span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span><time className="font-mono">{clockLabel(now)}</time></div>
  </section>;
}
