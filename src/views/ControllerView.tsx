import { useState, useEffect, useMemo } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  EyeOff, 
  Eye, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Tv, 
  Calendar, 
  MessageSquare, 
  Bell, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Copy,
  Music,
  QrCode,
  Settings,
  Sparkles,
  Zap,
  Link2,
  Unlink,
  Clock,
  Cloud,
  Sliders,
  FileText,
  Layers
} from 'lucide-react';
import { soundSynth } from '../audio/soundSynthesizer';
import type { ChimeStyle, TimerType, OutputRole } from '../types/timer';
import ShareModal from '../components/common/ShareModal';
import SettingsModal from '../components/common/SettingsModal';
import ProPaywallModal from '../components/common/ProPaywallModal';
import AuthModal from '../components/auth/AuthModal';
import AccountSettingsModal from '../components/account/AccountSettingsModal';
import LiveMonitorPreview from '../components/controller/LiveMonitorPreview';
import ScheduleDriftBadge from '../components/controller/ScheduleDriftBadge';
import TimerSettingsModal from '../components/controller/TimerSettingsModal';
import CustomizeOutputModal from '../components/controller/CustomizeOutputModal';
import { calculateScheduleMetrics } from '../utils/scheduleMath';

export default function ControllerView() {
  const {
    roomId,
    roomName,
    setRoomName,
    availableRooms,
    switchRoom,
    rundown,
    activeTimerId,
    status,
    timeRemaining,
    elapsedTime,
    targetDuration,
    overtimeSeconds,
    blackout,
    toggleBlackout,
    isAudioMuted,
    toggleMute,
    activeMessage,
    setMessage,
    clearMessage,
    start,
    pause,
    reset,
    adjustTime,
    selectTimer,
    nextTimer,
    previousTimer,
    addTimer,
    duplicateTimer,
    updateTimer,
    deleteTimer,
    reorderRundown,
    toggleAutoStartNext,
    isProUser,
    currentUser,
    cloudSyncStatus,
  } = useTimerStore();

  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [msgSeverity, setMsgSeverity] = useState<'info' | 'warning' | 'danger'>('info');
  const [msgFlashing, setMsgFlashing] = useState(false);
  const [isAddingTimer, setIsAddingTimer] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newDurationStr, setNewDurationStr] = useState('10:00');
  const [newTimerType, setNewTimerType] = useState<TimerType>('countdown');
  const [newAutoStartNext, setNewAutoStartNext] = useState(false);
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedChime, setSelectedChime] = useState<ChimeStyle>('soft_bell');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('auth');
      return p === 'login' || p === 'signup' || p === 'signin';
    }
    return false;
  });
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('Shotimer Pro');
  const [isCustomizeOutputOpen, setIsCustomizeOutputOpen] = useState(false);
  const [customizeRole, setCustomizeRole] = useState<OutputRole>('viewer');

  // Adaptive Monitor Rundown Layout: 'auto' | 'single' | 'two-tier'
  const [layoutPreference, setLayoutPreference] = useState<'auto' | 'single' | 'two-tier'>('auto');
  const [isWideMonitor, setIsWideMonitor] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 2100 : false
  );

  useEffect(() => {
    const checkWidth = () => {
      setIsWideMonitor(window.innerWidth >= 2100);
    };
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const activeRundownLayout = layoutPreference === 'auto' 
    ? (isWideMonitor ? 'single' : 'two-tier')
    : layoutPreference;

  const activeTimer = rundown.find((t) => t.id === activeTimerId) || rundown[0];
  const isRunning = status === 'running';

  // Format seconds into MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const absVal = Math.abs(Math.floor(totalSec));
    const hours = Math.floor(absVal / 3600);
    const mins = Math.floor((absVal % 3600) / 60);
    const secs = absVal % 60;
    const sign = totalSec < 0 ? '+' : '';

    if (hours > 0) {
      return `${sign}${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse "MM:SS" or "HH:MM:SS" into total seconds
  const parseDurationString = (str: string): number => {
    const parts = str.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(str, 10) || 600;
  };

  const handleCreateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const success = addTimer({
      title: newTitle.trim(),
      speaker: newSpeaker.trim(),
      durationSeconds: parseDurationString(newDurationStr),
      type: newTimerType,
      thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
      sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: selectedChime, volume: 0.8 },
      autoStartNext: newAutoStartNext,
      scheduledStartTime: newScheduledTime || undefined,
    });

    if (!success) {
      setPaywallFeature('Unlimited Timers (Free Plan is capped at 3 timers per room)');
      setIsPaywallOpen(true);
      return;
    }

    setNewTitle('');
    setNewSpeaker('');
    setNewDurationStr('10:00');
    setNewTimerType('countdown');
    setNewAutoStartNext(false);
    setNewScheduledTime('');
    setIsAddingTimer(false);
  };

  const handleCopyViewerLink = () => {
    const url = `${window.location.origin}/app/?room=${encodeURIComponent(roomId)}&view=viewer`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePlayChimeTest = () => {
    soundSynth.play(selectedChime);
  };

  // 1-second interval to keep wall-clock-anchored calculations freshly ticking
  const [clockTick, setClockTick] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const scheduleMetrics = useMemo(() => {
    return calculateScheduleMetrics({
      rundown,
      activeTimerId,
      timeRemaining,
      elapsedTime,
      targetDuration,
      status,
      startedAt: useTimerStore.getState().startedAt,
      referenceTime: new Date(clockTick),
    });
  }, [rundown, activeTimerId, timeRemaining, elapsedTime, targetDuration, status, clockTick]);

  return (
    <div className="min-h-screen bg-[#141414] text-neutral-200 flex flex-col font-sans select-none">
      {/* Top AV Director Header */}
      <header className="h-16 border-b border-neutral-800 bg-[#1C1C1C] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-white">SHOTIMER</span>
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-900 border border-neutral-800"
              title={
                cloudSyncStatus === 'connected'
                  ? 'Cloud Realtime WebSockets Active: Remote monitors & mobile devices synced in real time (<20ms)'
                  : cloudSyncStatus === 'connecting'
                  ? 'Connecting to Supabase Cloud...'
                  : 'Local broadcast sync active (tabs on this device)'
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                cloudSyncStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : cloudSyncStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-neutral-500'
              }`} />
              <span className={`hidden md:inline ${
                cloudSyncStatus === 'connected'
                  ? 'text-emerald-400'
                  : cloudSyncStatus === 'connecting'
                  ? 'text-amber-400'
                  : 'text-neutral-400'
              }`}>
                {cloudSyncStatus === 'connected' ? 'Cloud Live' : cloudSyncStatus === 'connecting' ? 'Connecting...' : 'Local Bus'}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-neutral-700 hidden sm:block" />

          {/* Room Switcher Dropdown (3 Free Rooms) & Editable Name */}
          <div className="flex items-center gap-2">
            <select
              value={roomId}
              onChange={(e) => switchRoom(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-xs font-semibold text-emerald-400 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
              title="Switch Stage Room"
            >
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id} className="bg-neutral-900 text-neutral-200">
                  {r.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="bg-transparent text-sm font-medium text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-800 px-2 py-1 rounded transition-colors border border-transparent focus:border-neutral-600 outline-none w-36 sm:w-48 hidden md:block"
              title="Click to rename active room"
            />
          </div>

          {/* Production Schedule Math & Over/Under Drift Badge (Director Live Tracker) */}
          <div className="hidden xl:flex items-center ml-2">
            <ScheduleDriftBadge metrics={scheduleMetrics} compact />
          </div>
        </div>

        {/* View Switchers & Stage Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Blackout Toggle */}
          <button
            onClick={toggleBlackout}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              blackout
                ? 'bg-red-600/20 text-red-400 border-red-500/40 hover:bg-red-600/30'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
            }`}
            title="Blackout Stage Monitor"
          >
            {blackout ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{blackout ? 'Blackout ON' : 'Blackout'}</span>
          </button>

          {/* Chime Sound Test */}
          <div className="hidden md:flex items-center bg-neutral-800 border border-neutral-700 rounded-lg p-0.5">
            <select
              value={selectedChime}
              onChange={(e) => setSelectedChime(e.target.value as ChimeStyle)}
              className="bg-transparent text-xs text-neutral-300 px-2 py-1 outline-none"
            >
              <option value="soft_bell" className="bg-neutral-800">Soft Bell</option>
              <option value="marimba" className="bg-neutral-800">Marimba</option>
              <option value="gong" className="bg-neutral-800">Deep Gong</option>
              <option value="digital_beep" className="bg-neutral-800">Alert Beep</option>
            </select>
            <button
              onClick={handlePlayChimeTest}
              className="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-neutral-700 rounded transition-colors"
              title="Test Chime Sound"
            >
              <Music className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Pro Upgrade / Badge Button */}
          {!isProUser ? (
            <button
              onClick={() => {
                setPaywallFeature('Shotimer Pro');
                setIsPaywallOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all active:scale-95"
              title="Upgrade to Pro"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">PRO</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setPaywallFeature('Pro License Active');
                setIsPaywallOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition-colors"
              title="Pro License Active"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRO ACTIVE</span>
            </button>
          )}

          {/* User Account / Cloud Dock */}
          {currentUser ? (
            <button
              onClick={() => setIsAccountOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors shadow-sm"
              title="Manage Account, Rooms & Cloud Sync"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden lg:inline max-w-[110px] truncate">{currentUser.displayName || currentUser.email}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Sign in to save custom rooms & sync to cloud"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloud Sign In</span>
            </button>
          )}

          {/* Settings Modal Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            title="Event Settings & Customization"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Share & QR Code Modal Button */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Share Links & QR Codes"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Share</span>
          </button>


          {/* Quick Copy Viewer Link */}
          <button
            onClick={handleCopyViewerLink}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Copy Confidence Monitor URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Viewer Link'}</span>
          </button>

          {/* Open Stage Monitor in New Window */}
          <a
            href={`/app/?room=${encodeURIComponent(roomId)}&view=viewer`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-colors"
            title="Open Fullscreen Stage Display in New Window"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Launch Stage</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </header>

      {/* Main Studio Body Grid - 3-Pane AV Director Console (Symmetrical Flanks) */}
      <div className="flex-1 w-full px-4 sm:px-6 py-4 grid grid-cols-1 xl:grid-cols-[minmax(380px,22%)_1fr_minmax(380px,22%)] 2xl:grid-cols-[minmax(480px,24%)_1fr_minmax(480px,24%)] gap-5">
        
        {/* Left Column: Live Monitor Preview & Transport Dashboard (Equal Flank) */}
        <div className="flex flex-col gap-5 min-w-0">
          <LiveMonitorPreview
            activeTimer={activeTimer}
            timeRemaining={timeRemaining}
            elapsedTime={elapsedTime}
            targetDuration={targetDuration}
            overtimeSeconds={overtimeSeconds}
            status={status}
            blackout={blackout}
            activeMessage={activeMessage}
            start={start}
            pause={pause}
            reset={reset}
            adjustTime={adjustTime}
            previousTimer={previousTimer}
            nextTimer={nextTimer}
            onLaunchStage={() => {
              const url = `/app/?view=viewer&room=${encodeURIComponent(roomId)}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            onOpenCustomize={(role) => {
              setCustomizeRole(role);
              setIsCustomizeOutputOpen(true);
            }}
            scheduleMetrics={scheduleMetrics}
          />
        </div>

        {/* Center Column: Event Rundown Playlist (Expansive Workspace) */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Rundown Playlist Section */}
          <div className="bg-[#1C1C1C] rounded-xl border border-neutral-800 p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Event Rundown ({rundown.length})</h3>
                <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                  <span>Planned: <strong className="text-neutral-300 font-mono">{scheduleMetrics.formattedTotalPlanned}</strong></span>
                  <span className="text-neutral-600">•</span>
                  <span>ETA: <strong className="text-amber-400 font-mono">{scheduleMetrics.formattedProjectedEnd}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Adaptive Layout Switcher Pill */}
                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5" title="Row Layout: Auto-adapts to monitor width (1080p Two-Tier vs 1440p Single-Line)">
                  <button
                    onClick={() => setLayoutPreference('auto')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      layoutPreference === 'auto'
                        ? 'bg-neutral-800 text-emerald-400 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title={`Auto: currently ${isWideMonitor ? '1440p+ Single-Line' : '1080p Two-Tier'}`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setLayoutPreference('single')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      layoutPreference === 'single'
                        ? 'bg-neutral-800 text-emerald-400 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Force Single-Line Row"
                  >
                    1-Row
                  </button>
                  <button
                    onClick={() => setLayoutPreference('two-tier')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      layoutPreference === 'two-tier'
                        ? 'bg-neutral-800 text-emerald-400 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Force Two-Tier Comfort Row"
                  >
                    2-Tier
                  </button>
                </div>

                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Free Tier: {rundown.length}/3 Timers
                </span>

                <button
                  onClick={() => {
                    if (!isProUser && rundown.length >= 3) {
                      setPaywallFeature('Unlimited Timers (Free Plan is capped at 3 timers per room)');
                      setIsPaywallOpen(true);
                      return;
                    }
                    setIsAddingTimer(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Timer</span>
                </button>
              </div>
            </div>

            {/* Quick Add Timer Form */}
            {isAddingTimer && (
              <form onSubmit={handleCreateTimer} className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Segment Title (e.g. Q&A Session)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Speaker (e.g. Dr. Vance)"
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value)}
                    className="w-full sm:w-36 bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="MM:SS"
                    value={newDurationStr}
                    onChange={(e) => setNewDurationStr(e.target.value)}
                    className="w-full sm:w-20 bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-xs text-center text-white placeholder-neutral-500 outline-none focus:border-emerald-500 font-mono"
                    title="Duration (MM:SS)"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 text-[11px]">Mode:</span>
                      <select
                        value={newTimerType}
                        onChange={(e) => setNewTimerType(e.target.value as TimerType)}
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300 outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="countdown">⏳ Countdown</option>
                        <option value="countup">⏱️ Count-up</option>
                        <option value="clock">🕒 Wall Clock</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 text-[11px]">Schedule:</span>
                      <input
                        type="time"
                        value={newScheduledTime}
                        onChange={(e) => setNewScheduledTime(e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-300 outline-none focus:border-emerald-500 font-mono"
                        title="Scheduled Clock Start (24h)"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 select-none">
                      <input
                        type="checkbox"
                        checked={newAutoStartNext}
                        onChange={(e) => setNewAutoStartNext(e.target.checked)}
                        className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0"
                      />
                      <span className="text-[11px]">Auto-advance to next</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                    >
                      Save Timer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingTimer(false)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Rundown Item List */}
            <div className="flex flex-col gap-2">
              {rundown.map((item, idx) => {
                const isActive = item.id === activeTimerId;
                const itemSched = scheduleMetrics.itemSchedules.get(item.id);
                return (
                  <div key={item.id} className="flex flex-col gap-1">
                    {activeRundownLayout === 'single' ? (
                      /* SINGLE-LINE BROADCAST ROW (1440p+ / Forced 1-Row) */
                      <div
                        className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border gap-2.5 sm:gap-3 transition-all ${
                          isActive
                            ? 'bg-neutral-800/90 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                            : 'bg-[#181818] border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Left Group: Play/Pause, Index, Title, Speaker, Notes Pill */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Play Button for Row */}
                          <button
                            onClick={() => {
                              if (isActive) {
                                if (isRunning) pause();
                                else start();
                              } else {
                                selectTimer(item.id);
                                start();
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors shrink-0 ${
                              isActive && isRunning
                                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-900/30'
                                : 'bg-neutral-800 hover:bg-emerald-600 text-neutral-300 hover:text-white'
                            }`}
                            title={isActive && isRunning ? 'Pause' : 'Start this timer'}
                          >
                            {isActive && isRunning ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>

                          {/* Segment Index */}
                          <span className="text-[11px] font-mono text-neutral-500 font-bold shrink-0">
                            #{idx + 1}
                          </span>

                          {/* Title input */}
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateTimer(item.id, { title: e.target.value })}
                            className="bg-transparent text-sm font-semibold text-white hover:bg-neutral-800/60 focus:bg-neutral-800 px-2 py-1 rounded outline-none flex-1 min-w-[120px] border border-transparent focus:border-neutral-600 transition-colors"
                            placeholder="Segment title..."
                          />

                          {/* Speaker input */}
                          <div className="w-28 sm:w-36 xl:w-44 shrink-0">
                            <input
                              type="text"
                              value={item.speaker}
                              placeholder="Speaker..."
                              onChange={(e) => updateTimer(item.id, { speaker: e.target.value })}
                              className="bg-transparent text-xs text-neutral-400 hover:bg-neutral-800/60 focus:bg-neutral-800 px-2 py-1 rounded outline-none w-full border border-transparent focus:border-neutral-600 transition-colors"
                            />
                          </div>

                          {/* Speaker Notes Indicator */}
                          {item.notes && (
                            <button
                              type="button"
                              onClick={() => setEditingTimerId(item.id)}
                              className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 rounded-md px-1.5 py-0.5 shrink-0 transition-colors"
                              title={`Speaker Cue: "${item.notes}" (Click to view/edit)`}
                            >
                              <FileText className="w-3 h-3 text-amber-400" />
                              <span className="hidden xl:inline text-[10px] font-medium max-w-[70px] truncate">Cue</span>
                            </button>
                          )}
                        </div>

                        {/* Right Group: Mode, Scheduled/Projected Start, Auto-Advance, Duration, Settings, Reorder, Delete */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {/* Mode selector */}
                          <select
                            value={item.type || 'countdown'}
                            onChange={(e) => updateTimer(item.id, { type: e.target.value as TimerType })}
                            className="bg-neutral-900 hover:bg-neutral-800 text-[11px] font-medium text-neutral-300 border border-neutral-700/80 rounded-md px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
                            title="Timer Mode"
                          >
                            <option value="countdown">⏳ Countdown</option>
                            <option value="countup">⏱️ Count-up</option>
                            <option value="clock">🕒 Wall Clock</option>
                          </select>

                          {/* Scheduled time input & Projected Time */}
                          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700/80 rounded-md px-2 py-1" title="Planned vs Projected Start Time">
                            <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                            <input
                              type="time"
                              value={item.scheduledStartTime || ''}
                              onChange={(e) => updateTimer(item.id, { scheduledStartTime: e.target.value || undefined })}
                              className="bg-transparent text-[11px] font-mono text-neutral-300 outline-none w-14 cursor-pointer"
                              title="Set Planned Start (HH:MM)"
                            />
                            {itemSched && (
                              <span 
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                  itemSched.isDelayed 
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' 
                                    : itemSched.status === 'past'
                                    ? 'bg-neutral-800/60 text-neutral-500 border-transparent line-through'
                                    : itemSched.status === 'current'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold'
                                    : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                }`}
                                title={
                                  itemSched.status === 'past'
                                    ? 'Segment completed'
                                    : itemSched.status === 'current'
                                    ? 'Active segment on stage'
                                    : `Projected Start: ${itemSched.projectedStartTime}${itemSched.isDelayed ? ` (+${Math.round(itemSched.delaySeconds / 60)}m behind schedule)` : ''}`
                                }
                              >
                                {itemSched.status === 'past' ? '✓ Done' : itemSched.status === 'current' ? '▶ Active' : `Est ${itemSched.projectedStartTime}`}
                              </span>
                            )}
                          </div>

                          {/* Auto-Advance Chain Link Toggle */}
                          <button
                            onClick={() => toggleAutoStartNext(item.id)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
                              item.autoStartNext
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                            title={item.autoStartNext ? 'Auto-Advance: ON (auto-starts next timer at 0:00)' : 'Auto-Advance: OFF (click to chain to next timer)'}
                          >
                            {item.autoStartNext ? <Link2 className="w-3 h-3 text-amber-400" /> : <Unlink className="w-3 h-3" />}
                            <span className="hidden xl:inline">{item.autoStartNext ? 'Auto' : 'Link'}</span>
                          </button>

                          {/* Duration input */}
                          <div className="flex items-center bg-neutral-900 border border-neutral-700/80 rounded-md p-0.5" title="Duration (MM:SS)">
                            <input
                              type="text"
                              value={formatTime(item.durationSeconds).replace('+', '')}
                              onChange={(e) => {
                                const parsed = parseDurationString(e.target.value);
                                if (parsed > 0) updateTimer(item.id, { durationSeconds: parsed });
                              }}
                              className="w-14 bg-transparent tabular-numbers font-mono text-xs text-center font-bold text-neutral-200 outline-none px-1 py-0.5 focus:text-white"
                            />
                          </div>

                          {/* Edit Timer Settings Modal Trigger */}
                          <button
                            onClick={() => setEditingTimerId(item.id)}
                            className="relative p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-colors"
                            title="Edit Timer Settings, Alerts & Cues"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            {(item.thresholds || item.sounds) && (
                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" title="Custom Settings Active" />
                            )}
                          </button>

                          {/* Reordering */}
                          <div className="flex items-center gap-0.5">
                            <button
                              disabled={idx === 0}
                              onClick={() => reorderRundown(idx, idx - 1)}
                              className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-20 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === rundown.length - 1}
                              onClick={() => reorderRundown(idx, idx + 1)}
                              className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-20 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => deleteTimer(item.id)}
                            disabled={rundown.length <= 1}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 transition-colors"
                            title="Delete Timer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* TWO-TIER COMFORT CARD (1080p / Forced 2-Tier) */
                      <div
                        className={`flex flex-col p-3 rounded-xl border gap-2.5 transition-all ${
                          isActive
                            ? 'bg-neutral-800/90 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                            : 'bg-[#181818] border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Top Tier: Play, Index, Full Title, Speaker, Cue, Duration & Quick Actions */}
                        <div className="flex items-center justify-between gap-3">
                          {/* Left Group: Play/Pause, Segment #, Title, Speaker, Cue Pill */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {/* Play Button for Row */}
                            <button
                              onClick={() => {
                                if (isActive) {
                                  if (isRunning) pause();
                                  else start();
                                } else {
                                  selectTimer(item.id);
                                  start();
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors shrink-0 ${
                                isActive && isRunning
                                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-900/30'
                                  : 'bg-neutral-800 hover:bg-emerald-600 text-neutral-300 hover:text-white'
                              }`}
                              title={isActive && isRunning ? 'Pause' : 'Start this timer'}
                            >
                              {isActive && isRunning ? (
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              )}
                            </button>

                            {/* Segment Index */}
                            <span className="text-[11px] font-mono text-neutral-500 font-bold shrink-0">
                              #{idx + 1}
                            </span>

                            {/* Title with full width */}
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateTimer(item.id, { title: e.target.value })}
                              className="bg-transparent text-sm sm:text-base font-semibold text-white hover:bg-neutral-800/60 focus:bg-neutral-800 px-2 py-1 rounded outline-none flex-1 min-w-[140px] border border-transparent focus:border-neutral-600 transition-colors"
                              placeholder="Segment title..."
                            />

                            {/* Speaker input */}
                            <div className="w-36 sm:w-44 shrink-0">
                              <input
                                type="text"
                                value={item.speaker}
                                placeholder="Speaker name..."
                                onChange={(e) => updateTimer(item.id, { speaker: e.target.value })}
                                className="bg-transparent text-xs text-neutral-400 hover:bg-neutral-800/60 focus:bg-neutral-800 px-2 py-1 rounded outline-none w-full border border-transparent focus:border-neutral-600 transition-colors"
                              />
                            </div>

                            {/* Speaker Cue Badge */}
                            {item.notes && (
                              <button
                                type="button"
                                onClick={() => setEditingTimerId(item.id)}
                                className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 rounded-md px-1.5 py-0.5 shrink-0 transition-colors"
                                title={`Speaker Cue: "${item.notes}" (Click to view/edit)`}
                              >
                                <FileText className="w-3 h-3 text-amber-400" />
                                <span className="text-[10px] font-medium max-w-[80px] truncate">Cue</span>
                              </button>
                            )}
                          </div>

                          {/* Top Tier Right Group: Duration Input & Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Duration input */}
                            <div className="flex items-center bg-neutral-900 border border-neutral-700/80 rounded-lg p-0.5" title="Duration (MM:SS)">
                              <input
                                type="text"
                                value={formatTime(item.durationSeconds).replace('+', '')}
                                onChange={(e) => {
                                  const parsed = parseDurationString(e.target.value);
                                  if (parsed > 0) updateTimer(item.id, { durationSeconds: parsed });
                                }}
                                className="w-16 bg-transparent tabular-numbers font-mono text-xs text-center font-bold text-neutral-200 outline-none px-1 py-1 focus:text-white"
                              />
                            </div>

                            {/* Edit Timer Settings Modal Trigger */}
                            <button
                              onClick={() => setEditingTimerId(item.id)}
                              className="relative p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-colors"
                              title="Edit Timer Settings, Alerts & Cues"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              {(item.thresholds || item.sounds) && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" title="Custom Settings Active" />
                              )}
                            </button>

                            {/* Reordering */}
                            <div className="flex items-center gap-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => reorderRundown(idx, idx - 1)}
                                className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-20 transition-colors"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                disabled={idx === rundown.length - 1}
                                onClick={() => reorderRundown(idx, idx + 1)}
                                className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-20 transition-colors"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => deleteTimer(item.id)}
                              disabled={rundown.length <= 1}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 transition-colors"
                              title="Delete Timer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Tier: Mode, Scheduled & Projected Time, Auto-Advance Link & Sound Indicator */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-neutral-800/80 text-xs">
                          <div className="flex items-center flex-wrap gap-2">
                            {/* Mode selector */}
                            <select
                              value={item.type || 'countdown'}
                              onChange={(e) => updateTimer(item.id, { type: e.target.value as TimerType })}
                              className="bg-neutral-900 hover:bg-neutral-800 text-[11px] font-medium text-neutral-300 border border-neutral-700/80 rounded-md px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
                              title="Timer Mode"
                            >
                              <option value="countdown">⏳ Countdown</option>
                              <option value="countup">⏱️ Count-up</option>
                              <option value="clock">🕒 Wall Clock</option>
                            </select>

                            {/* Scheduled time input & Projected Time */}
                            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700/80 rounded-md px-2 py-1" title="Planned vs Projected Start Time">
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <input
                                type="time"
                                value={item.scheduledStartTime || ''}
                                onChange={(e) => updateTimer(item.id, { scheduledStartTime: e.target.value || undefined })}
                                className="bg-transparent text-[11px] font-mono text-neutral-300 outline-none w-14 cursor-pointer"
                                title="Set Planned Start (HH:MM)"
                              />
                              {itemSched && (
                                <span 
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                    itemSched.isDelayed 
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' 
                                      : itemSched.status === 'past'
                                      ? 'bg-neutral-800/60 text-neutral-500 border-transparent line-through'
                                      : itemSched.status === 'current'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold'
                                      : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                  }`}
                                  title={
                                    itemSched.status === 'past'
                                      ? 'Segment completed'
                                      : itemSched.status === 'current'
                                      ? 'Active segment on stage'
                                      : `Projected Start: ${itemSched.projectedStartTime}${itemSched.isDelayed ? ` (+${Math.round(itemSched.delaySeconds / 60)}m behind schedule)` : ''}`
                                  }
                                >
                                  {itemSched.status === 'past' ? '✓ Done' : itemSched.status === 'current' ? '▶ Active' : `Est ${itemSched.projectedStartTime}`}
                                </span>
                              )}
                            </div>

                            {/* Auto-Advance Chain Link Toggle */}
                            <button
                              onClick={() => toggleAutoStartNext(item.id)}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
                                item.autoStartNext
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                              }`}
                              title={item.autoStartNext ? 'Auto-Advance: ON (auto-starts next timer at 0:00)' : 'Auto-Advance: OFF (click to chain to next timer)'}
                            >
                              {item.autoStartNext ? <Link2 className="w-3 h-3 text-amber-400" /> : <Unlink className="w-3 h-3" />}
                              <span>{item.autoStartNext ? 'Auto-Advance ON' : 'Link Next'}</span>
                            </button>
                          </div>

                          {/* Chime & Warning Summary Tag */}
                          <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 ml-auto">
                            {item.thresholds && (
                              <span title={`Yellow: ${Math.round(item.thresholds.yellowTime/60)}m | Red: ${item.thresholds.redTime}s`}>
                                ⚠️ {Math.round(item.thresholds.yellowTime / 60)}m / {item.thresholds.redTime}s
                              </span>
                            )}
                            {item.sounds && (
                              <span className="capitalize" title={`Chime Style: ${item.sounds.chimeStyle.replace('_', ' ')}`}>
                                🔔 {item.sounds.chimeStyle.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Visual Connector for Auto-Advance Chain */}
                    {item.autoStartNext && idx < rundown.length - 1 && (
                      <div className="flex items-center gap-1.5 pl-6 py-0.5 text-[10px] text-amber-400/90 font-mono">
                        <span className="w-2 h-2 border-l border-b border-amber-500/60 inline-block -mt-1 ml-1" />
                        <span>↳ Linked: Auto-advances to "{rundown[idx + 1]?.title}"</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show Timing Summary Bar */}
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 font-sans">Total Show:</span>
                <span className="text-neutral-200 font-semibold">{scheduleMetrics.formattedTotalPlanned}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 font-sans">Remaining:</span>
                <span className="text-amber-400 font-semibold">{scheduleMetrics.formattedRemaining}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 font-sans">Projected Finish:</span>
                <span className="text-emerald-400 font-bold">{scheduleMetrics.formattedProjectedEnd}</span>
                {scheduleMetrics.hasScheduleAnchors && scheduleMetrics.formattedPlannedEnd !== '--:--' && (
                  <span className="text-neutral-500 line-through text-[11px]" title={`Planned finish was ${scheduleMetrics.formattedPlannedEnd}`}>
                    ({scheduleMetrics.formattedPlannedEnd})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stage Flash Messages & Presenter Cues (Equal Flank) */}
        <div className="flex flex-col gap-5 min-w-0">
          <div className="bg-[#1C1C1C] rounded-xl border border-neutral-800 p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Stage Message</h3>
              </div>
              {activeMessage && activeMessage.visible && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Visible On Stage
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-400">
              Display an alert banner directly on the presenter confidence monitor.
            </p>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { text: '5 MIN LEFT', sev: 'info' as const },
                { text: '2 MIN - WRAP UP', sev: 'warning' as const },
                { text: 'STOP / TIME UP', sev: 'danger' as const },
                { text: 'MIC CLOSER PLEASE', sev: 'info' as const },
                { text: 'STANDBY', sev: 'info' as const },
              ].map((preset) => (
                <button
                  key={preset.text}
                  onClick={() => {
                    setCustomMsg(preset.text);
                    setMsgSeverity(preset.sev);
                    setMessage(preset.text, preset.sev, preset.sev === 'danger');
                  }}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 border border-neutral-700 transition-colors"
                >
                  {preset.text}
                </button>
              ))}
            </div>

            {/* Custom Text Area */}
            <textarea
              rows={3}
              placeholder="Type custom note for speaker..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="w-full bg-[#141414] border border-neutral-700 rounded-lg p-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-emerald-500 resize-none"
            />

            {/* Severity and Flash Controls */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {(['info', 'warning', 'danger'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setMsgSeverity(sev)}
                    className={`px-2 py-1 rounded capitalize font-medium transition-colors ${
                      msgSeverity === sev
                        ? sev === 'danger'
                          ? 'bg-red-600 text-white'
                          : sev === 'warning'
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-cyan-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={msgFlashing}
                  onChange={(e) => setMsgFlashing(e.target.checked)}
                  className="rounded bg-neutral-800 border-neutral-700 text-emerald-500"
                />
                <span>Flash Strobe</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  if (customMsg.trim()) {
                    setMessage(customMsg, msgSeverity, msgFlashing);
                  }
                }}
                disabled={!customMsg.trim()}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md transition-colors"
              >
                Show on Stage
              </button>

              {activeMessage && activeMessage.visible && (
                <button
                  onClick={clearMessage}
                  className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-red-400 text-xs font-semibold border border-neutral-700 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Connected Views Links Box */}
          <div className="bg-[#1C1C1C] rounded-xl border border-neutral-800 p-5 flex flex-col gap-3 shadow-xl">
            <h4 className="text-xs uppercase font-semibold tracking-wider text-neutral-400">Direct Role Links</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const url = `/app/?view=viewer&room=${encodeURIComponent(roomId)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] hover:bg-neutral-800 text-neutral-300 text-xs border border-neutral-800 transition-colors text-left"
                title="Launch Stage Monitor in new tab (keeps Controller open)"
              >
                <div className="flex items-center gap-2.5">
                  <Tv className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">Stage Monitor View</div>
                    <div className="text-[11px] text-neutral-500">For stage displays & confidence TVs</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  const url = `/app/?view=agenda&room=${encodeURIComponent(roomId)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] hover:bg-neutral-800 text-neutral-300 text-xs border border-neutral-800 transition-colors text-left"
                title="Launch Agenda Rundown in new tab (keeps Controller open)"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">Agenda Rundown View</div>
                    <div className="text-[11px] text-neutral-500">For backstage crew & attendees</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  const url = `/app/?view=moderator&room=${encodeURIComponent(roomId)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] hover:bg-neutral-800 text-neutral-300 text-xs border border-neutral-800 transition-colors text-left"
                title="Launch Moderator View in new tab (keeps Controller open)"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold text-white">Moderator View</div>
                    <div className="text-[11px] text-neutral-500">Stage assistant cue notes & Q&A</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  const url = `/app/?view=overlay&room=${encodeURIComponent(roomId)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] hover:bg-neutral-800 text-neutral-300 text-xs border border-neutral-800 transition-colors text-left"
                title="Launch OBS Broadcast Overlay in new tab"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-semibold text-white">OBS Broadcast Overlay</div>
                    <div className="text-[11px] text-neutral-500">Transparent overlay for OBS & vMix</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Share & QR Code Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomName={roomName}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenPaywall={(feat) => {
          setPaywallFeature(feat);
          setIsPaywallOpen(true);
        }}
      />

      {/* Pro Paywall Gate Modal */}
      <ProPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        featureName={paywallFeature}
      />

      {/* Cloud Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Account Settings & Custom Rooms Modal */}
      <AccountSettingsModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onOpenPaywall={() => {
          setPaywallFeature('Shotimer Pro');
          setIsPaywallOpen(true);
        }}
      />

      {/* Dedicated Timer Wrap-Up & Alert Thresholds Modal */}
      <TimerSettingsModal
        isOpen={!!editingTimerId}
        timer={rundown.find((t) => t.id === editingTimerId) || null}
        onClose={() => setEditingTimerId(null)}
        onUpdate={updateTimer}
        onDuplicate={duplicateTimer}
        onDelete={deleteTimer}
        canDelete={rundown.length > 1}
        onOpenPaywall={(feat) => {
          setPaywallFeature(feat);
          setIsPaywallOpen(true);
        }}
      />

      {/* Customize Output Studio Modal (Stagetimer.io Parity) */}
      <CustomizeOutputModal
        isOpen={isCustomizeOutputOpen}
        onClose={() => setIsCustomizeOutputOpen(false)}
        initialRole={customizeRole}
        onOpenPaywall={(feat) => {
          setPaywallFeature(feat);
          setIsPaywallOpen(true);
        }}
      />
    </div>
  );
}
