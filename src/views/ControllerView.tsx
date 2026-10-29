import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, EyeOff, Eye, Volume2, VolumeX, ExternalLink, Tv, Calendar, MessageSquare,
  Music, QrCode, Settings, Link2, Layers, ChevronDown, LockKeyhole, UnlockKeyhole,
  Undo2, X, UserRound, MoreHorizontal, BookmarkPlus } from 'lucide-react';
import { useTimerStore } from '../store/useTimerStore';
import { soundSynth } from '../audio/soundSynthesizer';
import type { ChimeStyle, OutputRole, TimerItem } from '../types/timer';
import ShareModal from '../components/common/ShareModal';
import SettingsModal from '../components/common/SettingsModal';
import ProPaywallModal from '../components/common/ProPaywallModal';
import AuthModal from '../components/auth/AuthModal';
import AccountSettingsModal from '../components/account/AccountSettingsModal';
import LiveMonitorPreview from '../components/controller/LiveMonitorPreview';
import TimerSettingsModal from '../components/controller/TimerSettingsModal';
import CustomizeOutputModal from '../components/controller/CustomizeOutputModal';
import RundownRow from '../components/controller/RundownRow';
import MessagesPanel from '../components/controller/MessagesPanel';
import ConnectionsPanel from '../components/controller/ConnectionsPanel';
import { calculateScheduleMetrics } from '../utils/scheduleMath';
import { formatTimerDuration, parseTimerDuration } from '../utils/operatorControls';
import { getOutputUrl } from '../utils/outputLinks';
import { isTimerPreset, useSavedPresets } from '../hooks/useSavedPresets';
import type { TimerPreset } from '../hooks/useSavedPresets';
import '../styles/controller.css';
import ResetDialog from '../components/common/ResetDialog';
import type { ResetScope } from '../utils/roomReset';
import { FullscreenButton } from '../components/common/FullscreenProvider';
import { useFullscreen } from '../hooks/useFullscreen';

type TimerDraft = Omit<TimerItem, 'id' | 'order'>;
interface UndoEntry { item: TimerItem; index: number; roomId: string; expires: number }
function createUndoEntry(item: TimerItem, index: number, roomId: string): UndoEntry {
  return { item, index, roomId, expires: Date.now() + 15000 };
}
const makeDraft = (): TimerDraft => ({
  title: '', speaker: '', durationSeconds: 600, type: 'countdown', autoStartNext: false,
  thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
  sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
});
const builtinPresets: TimerPreset[] = [
  { name: '10-minute talk', timer: { ...makeDraft(), title: 'Talk' } },
  { name: '30-minute panel', timer: { ...makeDraft(), title: 'Panel', durationSeconds: 1800 } },
  { name: '15-minute break', timer: { ...makeDraft(), title: 'Break', durationSeconds: 900 } },
];
const outputRoles = [
  { id: 'viewer', label: 'Stage monitor', description: 'Presenter confidence screen', icon: Tv },
  { id: 'agenda', label: 'Agenda', description: 'Live event schedule', icon: Calendar },
  { id: 'moderator', label: 'Moderator', description: 'Presenter notes and cues', icon: MessageSquare },
  { id: 'overlay', label: 'OBS overlay', description: 'Transparent broadcast output', icon: Layers },
] as const;

export default function ControllerView() {
  const roomKey = useTimerStore(state => `${state.roomId}:${state.rundownResetVersion || ''}`);
  return <RoomController key={roomKey} />;
}

function RoomController() {
  const { immersive, openHelp } = useFullscreen();
  const state = useTimerStore();
  const { roomId, roomName, availableRooms, switchRoom, rundown, activeTimerId, status,
    timeRemaining, elapsedTime, targetDuration, overtimeSeconds, blackout, toggleBlackout,
    isAudioMuted, toggleMute, activeMessage, start, pause, reset, adjustTime, selectTimer,
    nextTimer, previousTimer, addTimer, duplicateTimer, updateTimer, deleteTimer, restoreTimer,
    reorderRundown, isProUser, currentUser, cloudSyncStatus } = state;
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [resetScope, setResetScope] = useState<ResetScope | null>(null);
  const [isAddingTimer, setIsAddingTimer] = useState(false);
  const [newDraft, setNewDraft] = useState<TimerDraft>(makeDraft);
  const [durationDraft, setDurationDraft] = useState('10:00');
  const [formError, setFormError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [selectedChime, setSelectedChime] = useState<ChimeStyle>('soft_bell');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const authIntent = new URLSearchParams(window.location.search).get('auth');
  const [isAuthOpen, setIsAuthOpen] = useState(() => ['login', 'signup', 'signin', 'reset'].includes(authIntent || ''));
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('Shotimer Pro');
  const [isCustomizeOutputOpen, setIsCustomizeOutputOpen] = useState(false);
  const [customizeRole, setCustomizeRole] = useState<OutputRole>('viewer');
  const [locked, setLocked] = useState(false);
  const [messagesCollapsed, setMessagesCollapsed] = useState(false);
  const [density, setDensity] = useState<'auto' | 'compact' | 'comfortable'>('auto');
  const [rundownWidth, setRundownWidth] = useState(0);
  const rundownRef = useRef<HTMLElement>(null);
  const [clockTick, setClockTick] = useState(Date.now);
  const [notice, setNotice] = useState('');
  const [deleted, setDeleted] = useState<UndoEntry | null>(null);
  const timerPresets = useSavedPresets('shotimer_timer_presets_v1', isTimerPreset);
  const activeTimer = rundown.find(timer => timer.id === activeTimerId) || rundown[0];
  const layout = density === 'auto' ? (rundownWidth >= 950 ? 'compact' : 'comfortable') : density;

  useEffect(() => {
    const interval = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!rundownRef.current) return;
    const observer = new ResizeObserver(entries => setRundownWidth(entries[0].contentRect.width));
    observer.observe(rundownRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => setDeleted(null), Math.max(0, deleted.expires - Date.now()));
    return () => clearTimeout(timer);
  }, [deleted]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const scheduleMetrics = useMemo(() => calculateScheduleMetrics({
    rundown, activeTimerId, timeRemaining, elapsedTime, targetDuration, status,
    startedAt: state.startedAt, referenceTime: new Date(clockTick),
    showStartedAt: state.showStartedAt,
  }), [rundown, activeTimerId, timeRemaining, elapsedTime, targetDuration, status, state.startedAt, state.showStartedAt, clockTick]);

  function showPaywall(feature: string) { setPaywallFeature(feature); setIsPaywallOpen(true); }
  function requestAdd() {
    if (locked) return;
    if (!isProUser && rundown.length >= 3) { showPaywall('Unlimited Timers (Free Plan is capped at 3 timers per room)'); return; }
    setIsAddingTimer(true);
  }
  function handleCreateTimer(event: React.FormEvent) {
    event.preventDefault();
    if (locked) return;
    const seconds = parseTimerDuration(durationDraft);
    if (!seconds) { setFormError('Enter a duration as MM:SS or HH:MM:SS, up to 24 hours.'); return; }
    if (!newDraft.title.trim()) { setFormError('Enter a segment title.'); return; }
    if (!addTimer({ ...newDraft, title: newDraft.title.trim(), speaker: newDraft.speaker.trim(), durationSeconds: seconds })) {
      showPaywall('Unlimited Timers (Free Plan is capped at 3 timers per room)'); return;
    }
    setIsAddingTimer(false); setNewDraft(makeDraft()); setDurationDraft('10:00'); setFormError(''); setSelectedPreset('');
  }
  const handleDelete = (id: string) => {
    const latest = useTimerStore.getState();
    if (locked || latest.rundown.length <= 1 || (latest.activeTimerId === id && ['running', 'paused'].includes(latest.status))) return;
    const index = latest.rundown.findIndex(timer => timer.id === id);
    if (index < 0) return;
    const item = structuredClone(latest.rundown[index]);
    deleteTimer(id);
    setDeleted(createUndoEntry(item, index, latest.roomId));
    setEditingTimerId(null);
  };
  function saveTimerPreset(item: TimerItem) {
    const name = item.title.trim().slice(0, 80) || 'Untitled timer';
    if (timerPresets.items.length >= 20 && !timerPresets.items.some(preset => preset.name === name)) {
      setNotice('You can save up to 20 timer presets. Remove one in Add timer to make space.'); return;
    }
    const timer: TimerPreset['timer'] = { title: item.title, speaker: item.speaker, notes: item.notes,
      durationSeconds: item.durationSeconds, type: item.type, thresholds: { ...item.thresholds }, sounds: { ...item.sounds } };
    if (timerPresets.save([...timerPresets.items.filter(preset => preset.name !== name), { name, timer }])) {
      setNotice(`Preset “${name}” saved in this browser.`);
    }
  }
  function loadPreset(value: string) {
    setSelectedPreset(value);
    const [group, index] = value.split('-');
    const preset = (group === 'saved' ? timerPresets.items : builtinPresets)[Number(index)];
    if (!preset) return;
    setNewDraft({ ...structuredClone(preset.timer), autoStartNext: false, scheduledStartTime: undefined });
    setDurationDraft(formatTimerDuration(preset.timer.durationSeconds)); setFormError('');
  }
  const closeParentMenu = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button:not(:disabled), a')) event.currentTarget.closest('details')?.removeAttribute('open');
  };

  return <div className={`controller-console ${messagesCollapsed ? 'messages-collapsed' : ''} ${immersive ? 'is-immersive' : ''}`} data-controller-console>
    <header className="console-header">
      <div className="console-room">
        <span className="console-brand">SHOTIMER</span><span className="header-divider" />
        <label className="sr-only" htmlFor="room-picker">Stage room</label>
        <select id="room-picker" value={roomId} onChange={event => switchRoom(event.target.value)} className="console-input room-picker" title="Switch stage room">
          {availableRooms.map(room => <option key={room.id} value={room.id}>{room.id === roomId ? roomName : room.name}</option>)}
        </select>
        <span className={`connection-status ${cloudSyncStatus === 'connected' ? 'connected' : ''}`}
          title={cloudSyncStatus === 'connected' ? 'Connected to cloud sync. See Connected screens for display presence.' : 'Local tabs can sync on this device. Remote displays require a cloud connection.'}>
          <span />{cloudSyncStatus === 'connected' ? 'Cloud connected' : cloudSyncStatus === 'connecting' ? 'Connecting…' : cloudSyncStatus === 'offline' ? 'Cloud offline' : 'Local sync'}
        </span>
      </div>
      <div className="console-header-actions">
        <FullscreenButton />
        <button className={`console-button ${blackout ? 'danger-active' : ''}`} aria-pressed={blackout} onClick={toggleBlackout} title="Blank connected outputs (B)">
          {blackout ? <EyeOff size={16} /> : <Eye size={16} />}<span>Blackout{blackout ? ' on' : ''}</span>
        </button>
        <details className="console-dropdown outputs-dropdown">
          <summary className="console-button"><Tv size={16} />Outputs<ChevronDown size={14} /></summary>
          <div className="console-menu outputs-menu" onClick={closeParentMenu}>
            <p className="menu-caption">Open in a new tab</p>
            {outputRoles.map(({ id, label, description, icon: Icon }) => id === 'overlay' ? <button key={id} disabled className="disabled-output"><Icon size={17} />{label}<small>Coming soon</small></button> : <a key={id} href={getOutputUrl(roomId, id)} target="_blank" rel="noopener noreferrer">
              <Icon size={17} /><span className="flex-1"><strong>{label}</strong><small>{description}</small></span><ExternalLink size={13} />
            </a>)}
            <hr /><button onClick={() => setIsShareOpen(true)}><QrCode size={16} />Share links & QR codes</button>
          </div>
        </details>
        <button className="console-icon" disabled={locked} onClick={() => setIsSettingsOpen(true)} aria-label="Event settings" title={locked ? 'Unlock rundown editing to change event settings' : 'Event settings'}><Settings size={18} /></button>
        <details className="console-dropdown">
          <summary className="console-icon" aria-label="Account and audio options" title="Account and audio options"><MoreHorizontal size={19} /></summary>
          <div className="console-menu options-menu">
            <button onClick={event => { closeParentMenu(event); openHelp(); }}><Tv size={16} />Phone fullscreen help</button>
            <hr />
            <p className="menu-caption">Audio on this console</p>
            <div className="audio-option"><select aria-label="Test chime" className="console-input" value={selectedChime} onChange={e => setSelectedChime(e.target.value as ChimeStyle)}>
              <option value="soft_bell">Soft bell</option><option value="marimba">Marimba</option><option value="gong">Deep gong</option><option value="digital_beep">Alert beep</option>
            </select><button className="console-icon" onClick={() => soundSynth.play(selectedChime)} title="Test chime" aria-label="Test chime"><Music size={16} /></button></div>
            <button onClick={toggleMute}>{isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}{isAudioMuted ? 'Unmute audio' : 'Mute audio'}</button>
            <hr /><div onClick={closeParentMenu}>
              <button onClick={() => currentUser ? setIsAccountOpen(true) : setIsAuthOpen(true)}><UserRound size={16} /><span className="truncate">{currentUser ? 'Account & rooms' : 'Sign in / Create account'}</span></button>
              <button onClick={() => showPaywall(isProUser ? 'Pro License Active' : 'Shotimer Pro')}><BookmarkPlus size={16} />{isProUser ? 'Pro licence active' : 'Explore Shotimer Pro'}</button>
            </div>
          </div>
        </details>
      </div>
    </header>

    <main className="console-workspace">
      <aside className="monitor-column" aria-label="Monitor and transport">
        <LiveMonitorPreview activeTimer={activeTimer} timeRemaining={timeRemaining} elapsedTime={elapsedTime}
          targetDuration={targetDuration} overtimeSeconds={overtimeSeconds} status={status} blackout={blackout}
          activeMessage={activeMessage} start={start} pause={pause} reset={reset} adjustTime={adjustTime}
          nextTimer={nextTimer} previousTimer={previousTimer} scheduleMetrics={scheduleMetrics}
          onResetSection={scope => setResetScope(scope)}
          onLaunchStage={() => window.open(getOutputUrl(roomId, 'viewer'), '_blank', 'noopener,noreferrer')}
          onOpenCustomize={role => { setCustomizeRole(role); setIsCustomizeOutputOpen(true); }} />
      </aside>

      <section ref={rundownRef} className="console-panel rundown-panel" aria-label="Event rundown" data-density={layout}>
        <div className="rundown-heading">
          <div><h1>Event rundown <span className="text-neutral-500 font-normal ml-1">{rundown.length}</span></h1>
            <p className="text-xs text-neutral-400 mt-1">{isProUser ? 'Pro plan' : `Free plan · ${rundown.length} of 3 timers`}</p></div>
          <div className="flex items-center flex-wrap gap-2">
            <button className={`console-button ${locked ? 'lock-active' : ''}`} aria-pressed={locked}
              onClick={() => { setLocked(value => !value); setIsAddingTimer(false); }} title="Lock rundown editing on this console. Playback controls remain available.">
              {locked ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}<span>{locked ? 'Locked' : 'Lock editing'}</span>
            </button>
            <button className="console-button primary" disabled={locked} onClick={requestAdd}><Plus size={16} />Add timer</button>
            <details className="console-dropdown"><summary className="console-icon" aria-label="Rundown actions"><MoreHorizontal size={18} /></summary><div className="console-menu" onClick={closeParentMenu}><button disabled={locked || !rundown.length} onClick={() => setResetScope('restart')}>Restart rundown…</button><button disabled={locked || !rundown.length} onClick={() => setResetScope('rundown')}>Clear rundown…</button></div></details>
          </div>
        </div>
        <div className="rundown-toolbar">
          <span className="text-xs text-neutral-500">{locked ? 'Editing locked on this console. Playback is available.' : 'Edit segments here. Open settings for timing, alerts and notes.'}</span>
          <label className="flex items-center gap-2 text-xs text-neutral-400 shrink-0">Rows<select aria-label="Rundown row density" className="density-picker" value={density} onChange={event => setDensity(event.target.value as typeof density)}>
            <option value="auto">Auto</option><option value="compact">Compact</option><option value="comfortable">Comfortable</option>
          </select></label>
        </div>
        {isAddingTimer && <form className="add-timer-form" onSubmit={handleCreateTimer}>
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">New segment</h2><button type="button" className="console-icon" onClick={() => setIsAddingTimer(false)} aria-label="Cancel new timer"><X size={17} /></button></div>
          <label className="form-label">Start from a preset
            <select className="console-input" aria-label="Timer preset" value={selectedPreset} onChange={event => loadPreset(event.target.value)}>
              <option value="">Custom timer</option><optgroup label="Quick presets">{builtinPresets.map((preset, i) => <option key={preset.name} value={`builtin-${i}`}>{preset.name}</option>)}</optgroup>
              {!!timerPresets.items.length && <optgroup label="Your saved presets">{timerPresets.items.map((preset, i) => <option key={preset.name} value={`saved-${i}`}>{preset.name}</option>)}</optgroup>}
            </select>
          </label>
          {selectedPreset.startsWith('saved-') && <button type="button" className="text-xs text-neutral-400 underline self-start" onClick={() => {
            timerPresets.save(timerPresets.items.filter((_, i) => i !== Number(selectedPreset.split('-')[1]))); setSelectedPreset('');
          }}>Remove this saved preset</button>}
          <div className="add-timer-fields">
            <label className="form-label segment-name">Segment title<input className="console-input" autoFocus value={newDraft.title} maxLength={200} onChange={event => setNewDraft({ ...newDraft, title: event.target.value })} required placeholder="e.g. Opening remarks" /></label>
            <label className="form-label">Speaker<input className="console-input" value={newDraft.speaker} maxLength={200} onChange={event => setNewDraft({ ...newDraft, speaker: event.target.value })} placeholder="Optional" /></label>
            <label className="form-label">Duration<input className="console-input font-mono" value={durationDraft} onChange={event => setDurationDraft(event.target.value)} placeholder="10:00" /></label>
            <label className="form-label">Timer mode<select className="console-input" value={newDraft.type} onChange={event => setNewDraft({ ...newDraft, type: event.target.value as TimerDraft['type'] })}>
              <option value="countdown">Countdown</option><option value="countup">Count up</option><option value="clock">Wall clock</option>
            </select></label>
            <label className="form-label">Scheduled start<input type="time" className="console-input" value={newDraft.scheduledStartTime || ''} onChange={event => setNewDraft({ ...newDraft, scheduledStartTime: event.target.value || undefined })} /></label>
          </div>
          <label className="text-xs text-neutral-400 flex gap-2 items-center"><input type="checkbox" checked={newDraft.autoStartNext} onChange={event => setNewDraft({ ...newDraft, autoStartNext: event.target.checked })} />Automatically start the next timer at zero</label>
          {formError && <p role="alert" className="text-xs text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="console-button" onClick={() => setIsAddingTimer(false)}>Cancel</button><button className="console-button primary" type="submit">Create timer</button></div>
        </form>}
        <div className="rundown-column-head" aria-hidden="true"><span /><span>Segment / speaker</span><span>Start</span><span>Duration</span><span>Status</span><span /></div>
        <div className="rundown-list">
          {!rundown.length && !isAddingTimer && <div className="rundown-empty"><h2>No timers in this room</h2><p>Add your first timer or import a JSON rundown from Event settings.</p><button className="console-button primary" disabled={locked} onClick={requestAdd}><Plus size={16} />Add your first timer</button></div>}
          {rundown.map((item, index) => <RundownRow key={`${roomId}-${item.id}`} item={item} index={index} count={rundown.length}
            active={item.id === activeTimerId} status={status} schedule={scheduleMetrics.itemSchedules.get(item.id)} locked={locked}
            onPlay={() => { if (item.id === activeTimerId && status === 'running') pause(); else { if (item.id !== activeTimerId) selectTimer(item.id); start(); } }}
            onEdit={() => { if (!locked) setEditingTimerId(item.id); }} onUpdate={updates => { if (!locked) updateTimer(item.id, updates); }}
            onMove={destination => { if (!locked) reorderRundown(index, destination); }} onDelete={() => handleDelete(item.id)}
            onDuplicate={() => { if (!locked && !duplicateTimer(item.id)) showPaywall('Unlimited Timers (Free Plan is capped at 3 timers per room)'); }}
            onSavePreset={() => saveTimerPreset(item)} />)}
        </div>
        <footer className="rundown-summary">
          <div><span>Total show</span><strong>{scheduleMetrics.formattedTotalPlanned}</strong></div>
          <div><span>Remaining</span><strong>{scheduleMetrics.formattedRemaining}</strong></div>
          <div><span>Segments</span><strong>{rundown.length}</strong></div>
        </footer>
        {timerPresets.storageError && <p role="alert" className="text-xs text-amber-300 p-4">{timerPresets.storageError}</p>}
      </section>

      <aside className="messages-column" aria-label="Presenter communication">
        <MessagesPanel key={roomId} collapsed={messagesCollapsed} onToggle={() => setMessagesCollapsed(value => !value)} />
        <ConnectionsPanel now={clockTick} />
        <div className="console-help"><Link2 size={14} /><p>Use Outputs to open a monitor or share this room with your crew.</p></div>
      </aside>
    </main>

    {(deleted || notice) && <div className="console-notice" role="status">
      <span>{notice || `“${deleted?.item.title}” deleted`}</span>
      {deleted && <button disabled={locked} onClick={() => {
        if (Date.now() > deleted.expires) { setDeleted(null); return; }
        if (restoreTimer(deleted.item, deleted.index, deleted.roomId)) { setDeleted(null); setNotice('Timer restored.'); }
        else setNotice('Cannot restore: this room has reached its timer limit.');
      }}><Undo2 size={15} />Undo</button>}
      <button aria-label="Dismiss notification" onClick={() => { setNotice(''); setDeleted(null); }}><X size={16} /></button>
    </div>}

    <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} roomName={roomName} />
    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onOpenPaywall={showPaywall} onCustomize={() => { setIsSettingsOpen(false); setCustomizeRole('viewer'); setIsCustomizeOutputOpen(true); }} />
    <ProPaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} featureName={paywallFeature} />
    <AuthModal isOpen={isAuthOpen} initialMode={authIntent === 'reset' ? 'reset' : authIntent === 'signup' ? 'register' : 'login'} onClose={() => { setIsAuthOpen(false); if (authIntent) { const url = new URL(window.location.href); url.searchParams.delete('auth'); window.history.replaceState({}, '', url); } }} />
    <AccountSettingsModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} onOpenPaywall={() => showPaywall('Shotimer Pro')} />
    <TimerSettingsModal isOpen={!!editingTimerId} timer={rundown.find(timer => timer.id === editingTimerId) || null}
      onClose={() => setEditingTimerId(null)} onUpdate={(id, updates) => { if (!locked) updateTimer(id, updates); }}
      onDuplicate={id => !locked && duplicateTimer(id)} onDelete={handleDelete}
      canDelete={!locked && rundown.length > 1 && !(editingTimerId === activeTimerId && ['running', 'paused'].includes(status))} onOpenPaywall={showPaywall} />
    <CustomizeOutputModal key={`${roomId}-${customizeRole}-${isCustomizeOutputOpen}`} isOpen={isCustomizeOutputOpen} onClose={() => setIsCustomizeOutputOpen(false)} initialRole={customizeRole} onOpenPaywall={showPaywall} />
    {resetScope && <ResetDialog scope={resetScope} onClose={() => setResetScope(null)} onComplete={() => { setDeleted(null); setIsAddingTimer(false); setEditingTimerId(null); }} />}
  </div>;
}
