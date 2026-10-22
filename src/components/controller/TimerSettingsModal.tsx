import { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Sliders, 
  Volume2, 
  FileText, 
  AlertTriangle, 
  Music, 
  Copy, 
  Trash2, 
  Save, 
  Link2,
  Unlink,
  Check,
  Target
} from 'lucide-react';
import type { TimerItem, TimerType, ChimeStyle } from '../../types/timer';
import { soundSynth } from '../../audio/soundSynthesizer';

interface TimerSettingsModalProps {
  isOpen: boolean;
  timer: TimerItem | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<TimerItem>) => void;
  onDuplicate: (id: string) => boolean;
  onDelete: (id: string) => void;
  canDelete: boolean;
  onOpenPaywall?: (feature: string) => void;
}

export default function TimerSettingsModal({
  isOpen,
  timer,
  onClose,
  onUpdate,
  onDuplicate,
  onDelete,
  canDelete,
  onOpenPaywall,
}: TimerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'timing' | 'alerts' | 'audio' | 'notes'>('timing');

  // Form states
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [type, setType] = useState<TimerType>('countdown');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [autoStartNext, setAutoStartNext] = useState(false);
  const [notes, setNotes] = useState('');

  // Finish At calculator
  const [finishAtTime, setFinishAtTime] = useState('');
  const [finishAtFeedback, setFinishAtFeedback] = useState('');

  // Thresholds
  const [yellowTime, setYellowTime] = useState(120);
  const [redTime, setRedTime] = useState(30);
  const [overtimeBlink, setOvertimeBlink] = useState(true);

  // Sounds
  const [soundOnYellow, setSoundOnYellow] = useState(true);
  const [soundOnRed, setSoundOnRed] = useState(true);
  const [soundOnFinish, setSoundOnFinish] = useState(true);
  const [chimeStyle, setChimeStyle] = useState<ChimeStyle>('soft_bell');
  const [volume, setVolume] = useState(0.8);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state whenever timer changes or modal opens
  useEffect(() => {
    if (timer) {
      setTitle(timer.title || '');
      setSpeaker(timer.speaker || '');
      setType(timer.type || 'countdown');
      
      const totalSec = timer.durationSeconds || 600;
      setDurationMinutes(Math.floor(totalSec / 60));
      setDurationSeconds(totalSec % 60);

      setScheduledStartTime(timer.scheduledStartTime || '');
      setAutoStartNext(!!timer.autoStartNext);
      setNotes(timer.notes || '');

      setYellowTime(timer.thresholds?.yellowTime ?? 120);
      setRedTime(timer.thresholds?.redTime ?? 30);
      setOvertimeBlink(timer.thresholds?.overtimeBlink ?? true);

      setSoundOnYellow(timer.sounds?.soundOnYellow ?? true);
      setSoundOnRed(timer.sounds?.soundOnRed ?? true);
      setSoundOnFinish(timer.sounds?.soundOnFinish ?? true);
      setChimeStyle(timer.sounds?.chimeStyle ?? 'soft_bell');
      setVolume(timer.sounds?.volume ?? 0.8);

      setFinishAtTime('');
      setFinishAtFeedback('');
      setSavedSuccess(false);
    }
  }, [timer, isOpen]);

  if (!isOpen || !timer) return null;

  // Handle Finish At Wall-Clock Calculation
  const handleCalculateFinishAt = () => {
    if (!finishAtTime) return;
    const [targetH, targetM] = finishAtTime.split(':').map((v) => parseInt(v, 10));
    if (isNaN(targetH) || isNaN(targetM)) return;

    let baseH = 0;
    let baseM = 0;

    if (scheduledStartTime) {
      const [sh, sm] = scheduledStartTime.split(':').map((v) => parseInt(v, 10));
      baseH = sh;
      baseM = sm;
    } else {
      const now = new Date();
      baseH = now.getHours();
      baseM = now.getMinutes();
    }

    let diffMinutes = targetH * 60 + targetM - (baseH * 60 + baseM);
    if (diffMinutes < 0) {
      // Wraps around midnight
      diffMinutes += 24 * 60;
    }

    if (diffMinutes <= 0) {
      setFinishAtFeedback('Target time must be in the future.');
      return;
    }

    setDurationMinutes(diffMinutes);
    setDurationSeconds(0);
    setFinishAtFeedback(`Duration set to ${diffMinutes}m to finish at ${finishAtTime}.`);
  };

  const handleAuditionSound = () => {
    soundSynth.play(chimeStyle);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const totalSec = Math.max(1, durationMinutes * 60 + durationSeconds);

    onUpdate(timer.id, {
      title: title.trim() || 'Untitled Segment',
      speaker: speaker.trim(),
      type,
      durationSeconds: totalSec,
      scheduledStartTime: scheduledStartTime || undefined,
      autoStartNext,
      notes: notes.trim(),
      thresholds: {
        yellowTime,
        redTime,
        overtimeBlink,
      },
      sounds: {
        soundOnYellow,
        soundOnRed,
        soundOnFinish,
        chimeStyle,
        volume,
      },
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  const handleDuplicate = () => {
    const success = onDuplicate(timer.id);
    if (!success && onOpenPaywall) {
      onOpenPaywall('Unlimited Timers (Free Plan is capped at 3 timers)');
    } else {
      onClose();
    }
  };

  const handleDelete = () => {
    if (!canDelete) return;
    onDelete(timer.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-[#181818] border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-[#1C1C1C]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Timer Settings</h3>
              <p className="text-xs text-neutral-400 truncate max-w-xs sm:max-w-md">
                {title || 'Untitled Segment'} {speaker ? `• ${speaker}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-b border-neutral-800 bg-[#141414] px-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('timing')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'timing'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timing & Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'alerts'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alert Thresholds</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'audio'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Chimes & Sounds</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'notes'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Speaker Cues</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-sm text-neutral-300">
          {/* TAB 1: TIMING & MODE */}
          {activeTab === 'timing' && (
            <div className="space-y-4">
              {/* Segment Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Segment Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Keynote Presentation"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Speaker Name</label>
                  <input
                    type="text"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Timer Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Timer Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('countdown')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      type === 'countdown'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>⏳ Countdown</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Target to 00:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('countup')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      type === 'countup'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>⏱️ Count-up</span>
                    <span className="text-[10px] text-neutral-400 font-normal">00:00 to Target</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('clock')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      type === 'clock'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>🕒 Wall Clock</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Live Time of Day</span>
                  </button>
                </div>
              </div>

              {/* Duration Inputs & Quick Presets (Only relevant if not wall clock) */}
              {type !== 'clock' && (
                <div className="space-y-2 bg-[#121212] border border-neutral-800 p-3.5 rounded-xl">
                  <label className="block text-xs font-medium text-neutral-300">Target Duration</label>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-white text-sm outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-neutral-400 font-medium">min</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={durationSeconds}
                        onChange={(e) => setDurationSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-white text-sm outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-neutral-400 font-medium">sec</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                      {[5, 10, 15, 20, 30, 45].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setDurationMinutes(preset);
                            setDurationSeconds(0);
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                            durationMinutes === preset && durationSeconds === 0
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                        >
                          {preset}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* "Finish At" Wall Clock Mode Calculator */}
                  <div className="pt-2 border-t border-neutral-800/80 mt-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        <span>Finish At Specific Clock Time:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={finishAtTime}
                          onChange={(e) => setFinishAtTime(e.target.value)}
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-neutral-200 outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleCalculateFinishAt}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                        >
                          Calculate Duration
                        </button>
                      </div>
                    </div>
                    {finishAtFeedback && (
                      <p className="text-[11px] text-amber-400 font-medium">{finishAtFeedback}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Scheduled Start Time & Auto-Advance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Scheduled Start (24h Wall Clock)
                  </label>
                  <input
                    type="time"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-500">Triggers automatic start at this time</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Auto-Advance (Chain Link)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoStartNext(!autoStartNext)}
                    className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${
                      autoStartNext
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {autoStartNext ? <Link2 className="w-3.5 h-3.5 text-amber-400" /> : <Unlink className="w-3.5 h-3.5" />}
                      <span>Auto-Start Next Segment</span>
                    </span>
                    <span className={`text-[10px] font-bold ${autoStartNext ? 'text-amber-400' : 'text-neutral-500'}`}>
                      {autoStartNext ? 'ENABLED' : 'OFF'}
                    </span>
                  </button>
                  <span className="text-[10px] text-neutral-500">Auto-starts next timer when 0:00 is reached</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALERT THRESHOLDS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Warning (Yellow) Threshold */}
              <div className="bg-[#121212] border border-neutral-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Warning Alert (Yellow / Wrap-Up)
                    </label>
                  </div>
                  <span className="font-mono text-xs text-neutral-300 font-bold">
                    {yellowTime === 0 ? 'Disabled' : `${Math.floor(yellowTime / 60)}m ${yellowTime % 60}s remaining`}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Confidence monitor numbers and border switch to amber to warn speaker to wrap up.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  {[
                    { label: 'Off', sec: 0 },
                    { label: '1m', sec: 60 },
                    { label: '2m', sec: 120 },
                    { label: '3m', sec: 180 },
                    { label: '5m', sec: 300 },
                  ].map((preset) => (
                    <button
                      key={preset.sec}
                      type="button"
                      onClick={() => setYellowTime(preset.sec)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
                        yellowTime === preset.sec
                          ? 'bg-amber-500 text-neutral-950 font-bold'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={yellowTime}
                      onChange={(e) => setYellowTime(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-center font-mono text-xs text-white outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-neutral-500">sec</span>
                  </div>
                </div>
              </div>

              {/* Danger (Red) Threshold */}
              <div className="bg-[#121212] border border-neutral-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <label className="text-xs font-bold text-red-400 uppercase tracking-wide">
                      Critical Alert (Red / Danger)
                    </label>
                  </div>
                  <span className="font-mono text-xs text-neutral-300 font-bold">
                    {redTime === 0 ? 'Disabled' : `${Math.floor(redTime / 60)}m ${redTime % 60}s remaining`}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Confidence monitor turns urgent red when time is critically low.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  {[
                    { label: 'Off', sec: 0 },
                    { label: '15s', sec: 15 },
                    { label: '30s', sec: 30 },
                    { label: '1m', sec: 60 },
                    { label: '2m', sec: 120 },
                  ].map((preset) => (
                    <button
                      key={preset.sec}
                      type="button"
                      onClick={() => setRedTime(preset.sec)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
                        redTime === preset.sec
                          ? 'bg-red-500 text-white font-bold'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={redTime}
                      onChange={(e) => setRedTime(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-center font-mono text-xs text-white outline-none focus:border-red-500"
                    />
                    <span className="text-xs text-neutral-500">sec</span>
                  </div>
                </div>
              </div>

              {/* Overtime Flash Behavior */}
              <div className="bg-[#121212] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Overtime Pulse / Flash</h4>
                  <p className="text-xs text-neutral-400">
                    Flash red numbers continuously when speaker talks beyond 00:00.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={overtimeBlink}
                  onChange={(e) => setOvertimeBlink(e.target.checked)}
                  className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO & CHIMES */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="bg-[#121212] border border-neutral-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-200">Segment Chime Sound</label>
                  <button
                    type="button"
                    onClick={handleAuditionSound}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-medium transition-colors"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Audition Chime</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'soft_bell', label: 'Soft Bell' },
                    { id: 'marimba', label: 'Marimba' },
                    { id: 'gong', label: 'Deep Gong' },
                    { id: 'digital_beep', label: 'Alert Beep' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setChimeStyle(style.id as ChimeStyle)}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        chimeStyle === style.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Triggers */}
              <div className="bg-[#121212] border border-neutral-800 p-4 rounded-xl space-y-2.5">
                <h4 className="text-xs font-semibold text-white mb-1">When Should Sounds Play?</h4>

                <label className="flex items-center justify-between text-xs cursor-pointer py-1 border-b border-neutral-800">
                  <span className="text-neutral-300">Play chime when Warning (Yellow) is reached</span>
                  <input
                    type="checkbox"
                    checked={soundOnYellow}
                    onChange={(e) => setSoundOnYellow(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer py-1 border-b border-neutral-800">
                  <span className="text-neutral-300">Play beep when Danger (Red) is reached</span>
                  <input
                    type="checkbox"
                    checked={soundOnRed}
                    onChange={(e) => setSoundOnRed(e.target.checked)}
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <span className="text-neutral-300">Play gong when Finished (0:00)</span>
                  <input
                    type="checkbox"
                    checked={soundOnFinish}
                    onChange={(e) => setSoundOnFinish(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Volume Slider */}
              <div className="bg-[#121212] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Chime Volume</h4>
                  <span className="text-[11px] text-neutral-500 font-mono">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-36 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SPEAKER CUES & NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Speaker Notes / Teleprompter Cues
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter talking points, sponsor thank yous, or stage cues for this speaker..."
                  rows={6}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white text-xs outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs text-neutral-400">
                💡 <strong>Production Tip:</strong> Notes entered here will be transmitted to the{' '}
                <span className="text-neutral-200">Moderator Portal</span> and appear on the stage display when speaker cues are enabled.
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-[#1C1C1C] flex items-center justify-between gap-3">
          {/* Duplicate / Delete Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDuplicate}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
              title="Duplicate this timer configuration"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Duplicate</span>
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-600/20 text-neutral-400 hover:text-red-400 text-xs font-medium border border-neutral-700 hover:border-red-500/40 flex items-center gap-1.5 transition-colors"
                title="Delete this timer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>

          {/* Cancel & Save */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Apply Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
