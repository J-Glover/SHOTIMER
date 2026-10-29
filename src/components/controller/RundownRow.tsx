import { useRef, useState } from 'react';
import { Play, Pause, Sliders, MoreHorizontal, ArrowUp, ArrowDown, Copy, Trash2, BookmarkPlus, Link2 } from 'lucide-react';
import type { TimerItem, TimerStatus } from '../../types/timer';
import type { ItemScheduleInfo } from '../../utils/scheduleMath';
import { formatTimerDuration, parseTimerDuration } from '../../utils/operatorControls';

function DurationField({ seconds, disabled, onChange }: { seconds: number; disabled: boolean; onChange: (seconds: number) => void }) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const skipBlur = useRef(false);
  function commit() {
    const parsed = parseTimerDuration(draft);
    if (parsed === null) { setInvalid(true); return; }
    onChange(parsed);
    setEditing(false);
    setInvalid(false);
  }
  return <label className="rundown-duration">
    <span className="row-field-label">Duration</span>
    <input aria-label="Timer duration" aria-invalid={invalid} title={invalid ? 'Use MM:SS or HH:MM:SS, up to 24 hours.' : 'Duration (MM:SS or HH:MM:SS)'}
      disabled={disabled} value={editing || invalid ? draft : formatTimerDuration(seconds)} onFocus={() => { setDraft(formatTimerDuration(seconds)); setEditing(true); }}
      onChange={e => { setDraft(e.target.value); setInvalid(false); }}
      onBlur={() => { if (skipBlur.current) { skipBlur.current = false; return; } commit(); }} onKeyDown={e => {
        if (e.key === 'Enter') { commit(); skipBlur.current = true; e.currentTarget.blur(); }
        if (e.key === 'Escape') { setEditing(false); setInvalid(false); skipBlur.current = true; e.currentTarget.blur(); }
      }} className="console-input font-mono tabular-nums text-right" />
    {invalid && <span className="text-xs text-red-400">Use MM:SS</span>}
  </label>;
}

interface Props {
  item: TimerItem;
  index: number;
  count: number;
  active: boolean;
  status: TimerStatus;
  schedule?: ItemScheduleInfo;
  locked: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onUpdate: (updates: Partial<TimerItem>) => void;
  onMove: (index: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSavePreset: () => void;
}

export default function RundownRow({ item, index, count, active, status, schedule, locked, onPlay, onEdit, onUpdate, onMove, onDuplicate, onDelete, onSavePreset }: Props) {
  const running = active && status === 'running';
  const stateLabel = active ? ({ stopped: 'Ready', running: 'Running', paused: 'Paused', finished: 'Finished' }[status]) : '';
  const mode = item.type === 'clock' ? 'Wall clock' : item.type === 'countup' ? 'Count up' : 'Countdown';
  return <article className={`rundown-row ${active ? 'is-selected' : ''}`} aria-label={`Segment ${index + 1}: ${item.title}`}>
    <button className={`console-icon row-play ${running ? 'is-running' : ''}`} onClick={onPlay}
      aria-label={running ? `Pause ${item.title}` : `Start ${item.title}`} title={running ? 'Pause timer' : 'Start timer'}>
      {running ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
    </button>
    <div className="rundown-segment">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-neutral-500 font-mono shrink-0">{String(index + 1).padStart(2, '0')}</span>
        <input className="row-title" aria-label={`Segment ${index + 1} title`} value={item.title} disabled={locked}
          onChange={e => onUpdate({ title: e.target.value })} placeholder="Segment title" title={item.title} />
      </div>
      <div className="row-meta">
        <input className="row-speaker" aria-label={`Segment ${index + 1} speaker`} value={item.speaker} disabled={locked}
          onChange={e => onUpdate({ speaker: e.target.value })} placeholder="Add speaker" title={item.speaker} />
        <span className="text-xs text-neutral-500 shrink-0">{mode}</span>
        {item.notes && <button className="row-notes" disabled={locked} onClick={onEdit} title={item.notes}>Notes</button>}
      </div>
    </div>
    <label className="rundown-start">
      <span className="row-field-label">Start</span>
      <input type="time" aria-label={`Segment ${index + 1} scheduled start`} disabled={locked}
        value={item.scheduledStartTime || ''} onChange={e => onUpdate({ scheduledStartTime: e.target.value || undefined })}
        className="console-input font-mono" />
      {!active && <span className="text-xs text-neutral-500 tabular-nums">{schedule?.status === 'past' ? 'Completed' : `Est ${schedule?.projectedStartTime || '—'}`}</span>}
    </label>
    <DurationField seconds={item.durationSeconds} disabled={locked || (active && status !== 'stopped')} onChange={durationSeconds => onUpdate({ durationSeconds })} />
    <div className="rundown-state">
      {stateLabel && <span className={`playback-badge ${running ? 'running' : status === 'paused' ? 'paused' : ''}`}><span />{stateLabel}</span>}
      {index < count - 1 && <button className={`row-link ${item.autoStartNext ? 'linked' : ''}`} disabled={locked}
        aria-pressed={item.autoStartNext} title="Automatically start the next timer at zero"
        onClick={() => onUpdate({ autoStartNext: !item.autoStartNext })}><Link2 size={13} />{item.autoStartNext ? 'Auto next' : 'Link next'}</button>}
    </div>
    <div className="rundown-actions">
      <button className="console-icon" disabled={locked} onClick={onEdit} aria-label={`Settings for ${item.title}`} title="Timer settings"><Sliders size={16} /></button>
      <details className="console-dropdown row-menu">
        <summary className="console-icon" aria-label={`More actions for ${item.title}`} title="More timer actions"><MoreHorizontal size={18} /></summary>
        <div className="console-menu" onClick={e => { if ((e.target as HTMLElement).closest('button:not(:disabled)')) e.currentTarget.closest('details')?.removeAttribute('open'); }}>
          <button disabled={locked} onClick={onDuplicate}><Copy size={15} />Duplicate</button>
          <button onClick={onSavePreset}><BookmarkPlus size={15} />Save as preset</button>
          <button disabled={locked || index === 0} onClick={() => onMove(index - 1)}><ArrowUp size={15} />Move up</button>
          <button disabled={locked || index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown size={15} />Move down</button>
          <hr />
          <button className="text-red-400" disabled={locked || count <= 1 || running || (active && status === 'paused')} onClick={onDelete}><Trash2 size={15} />Delete timer</button>
        </div>
      </details>
    </div>
  </article>;
}
