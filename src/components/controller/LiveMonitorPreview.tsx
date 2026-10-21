import { useState, useEffect, useMemo } from 'react';
import { 
  Tv, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  EyeOff, 
  Bell, 
  Clock, 
  ExternalLink,
  Radio
} from 'lucide-react';
import type { TimerItem, FlashMessage, TimerStatus } from '../../types/timer';

interface LiveMonitorPreviewProps {
  activeTimer: TimerItem | undefined;
  timeRemaining: number;
  elapsedTime: number;
  targetDuration: number;
  overtimeSeconds: number;
  status: TimerStatus;
  blackout: boolean;
  activeMessage: FlashMessage | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  adjustTime: (seconds: number) => void;
  previousTimer: () => void;
  nextTimer: () => void;
  onLaunchStage?: () => void;
}

export default function LiveMonitorPreview({
  activeTimer,
  timeRemaining,
  elapsedTime,
  targetDuration,
  overtimeSeconds,
  status,
  blackout,
  activeMessage,
  start,
  pause,
  reset,
  adjustTime,
  previousTimer,
  nextTimer,
  onLaunchStage,
}: LiveMonitorPreviewProps) {
  const isRunning = status === 'running';
  const timerType = activeTimer?.type || 'countdown';
  const isCountup = timerType === 'countup';
  const isClock = timerType === 'clock';

  // Live wall clock for director
  const [wallClockStr, setWallClockStr] = useState('');
  const [timezoneName, setTimezoneName] = useState('');

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
      setTimezoneName(tz);
    } catch {
      setTimezoneName('Local');
    }

    const tickClock = () => {
      const now = new Date();
      setWallClockStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    tickClock();
    const interval = setInterval(tickClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format MM:SS with negative overtime sign
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

  // Threshold calculations
  const yellowThreshold = activeTimer?.thresholds?.yellowTime ?? 120;
  const redThreshold = activeTimer?.thresholds?.redTime ?? 30;

  let isOvertime = false;
  let colorClass = 'text-white';
  let barColorClass = 'bg-emerald-500 shadow-[0_0_12px_#10B981]';
  let statusBadge: string | null = null;
  let progressPercent = 0;

  if (isClock) {
    colorClass = 'text-white';
    statusBadge = 'WALL CLOCK';
    progressPercent = 100;
  } else if (isCountup) {
    isOvertime = elapsedTime > targetDuration;
    const remainingInCountup = Math.max(0, targetDuration - elapsedTime);
    progressPercent = Math.min(100, Math.max(0, (elapsedTime / (targetDuration || 1)) * 100));

    if (isOvertime) {
      colorClass = 'text-red-500 animate-pulse';
      barColorClass = 'bg-red-600 shadow-[0_0_15px_#EF4444]';
      statusBadge = 'OVERTIME';
    } else if (remainingInCountup <= redThreshold) {
      colorClass = 'text-red-400';
      barColorClass = 'bg-red-500 shadow-[0_0_12px_#EF4444]';
      statusBadge = 'CRITICAL';
    } else if (remainingInCountup <= yellowThreshold) {
      colorClass = 'text-amber-400';
      barColorClass = 'bg-amber-500 shadow-[0_0_12px_#F59E0B]';
      statusBadge = 'WRAP UP';
    }
  } else {
    // Countdown
    isOvertime = timeRemaining < 0;
    progressPercent = Math.min(100, Math.max(0, (timeRemaining / (targetDuration || 1)) * 100));

    if (isOvertime) {
      colorClass = 'text-red-500 animate-pulse';
      barColorClass = 'bg-red-600 shadow-[0_0_15px_#EF4444]';
      statusBadge = 'OVERTIME';
    } else if (timeRemaining <= redThreshold) {
      colorClass = 'text-red-400';
      barColorClass = 'bg-red-500 shadow-[0_0_12px_#EF4444]';
      statusBadge = 'CRITICAL';
    } else if (timeRemaining <= yellowThreshold) {
      colorClass = 'text-amber-400';
      barColorClass = 'bg-amber-500 shadow-[0_0_12px_#F59E0B]';
      statusBadge = 'WRAP UP';
    }
  }

  // Generate dynamic minute interval tick markers for the timeline
  const durationSec = targetDuration || activeTimer?.durationSeconds || 600;
  const timelineTicks = useMemo(() => {
    const ticks: { seconds: number; label: string; percent: number }[] = [];
    const totalMinutes = Math.ceil(durationSec / 60);

    let stepMinutes = 1;
    if (totalMinutes > 45) stepMinutes = 10;
    else if (totalMinutes > 20) stepMinutes = 5;
    else if (totalMinutes > 10) stepMinutes = 2;
    else stepMinutes = 1;

    for (let m = totalMinutes; m >= 0; m -= stepMinutes) {
      const s = m * 60;
      const pct = (s / durationSec) * 100;
      ticks.push({
        seconds: s,
        label: `${m}m`,
        percent: pct,
      });
    }

    // Ensure 0m is included
    if (!ticks.some(t => t.seconds === 0)) {
      ticks.push({ seconds: 0, label: '0m', percent: 0 });
    }

    return ticks;
  }, [durationSec]);

  // Display time for central preview monitor
  const currentDisplayTime = isClock 
    ? wallClockStr 
    : isCountup 
    ? formatTime(elapsedTime) 
    : formatTime(timeRemaining);

  return (
    <div className="bg-[#1C1C1C] rounded-xl border border-neutral-800 p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
      {/* Top Header of the Monitor Box */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Stage Monitor Preview</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Chip */}
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isRunning
              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
              : status === 'paused'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isRunning ? 'bg-red-500 animate-ping' : status === 'paused' ? 'bg-amber-400' : 'bg-neutral-500'
            }`} />
            {isRunning ? 'ON AIR' : status === 'paused' ? 'PAUSED' : 'STANDBY'}
          </span>

          {/* Quick Launch Viewer Button */}
          {onLaunchStage && (
            <button
              onClick={onLaunchStage}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Launch Stage Monitor in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 16:9 Confidence Monitor Screen Chassis */}
      <div className="relative aspect-video w-full bg-[#0B0C0E] border-2 border-neutral-800/90 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between p-3 select-none">
        {/* Stage Blackout Simulation Overlay */}
        {blackout ? (
          <div className="absolute inset-0 bg-[#000000] z-30 flex flex-col items-center justify-center gap-2 p-4">
            <EyeOff className="w-6 h-6 text-red-500/80 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase">
              Stage Blackout Active
            </span>
            <span className="text-[10px] text-neutral-600">Stage screen is currently blanked</span>
          </div>
        ) : (
          <>
            {/* Monitor In-Screen Top Status Bar */}
            <div className="flex items-center justify-between text-[11px] z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-bold tracking-wider text-amber-400 text-[10px]">SHOTIMER</span>
              </div>

              <div className="flex items-center gap-2 max-w-[65%] truncate">
                <span className="font-medium text-neutral-300 truncate">
                  {activeTimer?.title || 'No Active Timer'}
                </span>
                {statusBadge && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider text-white ${
                    statusBadge === 'OVERTIME' ? 'bg-red-600 animate-pulse' :
                    statusBadge === 'CRITICAL' ? 'bg-red-500' :
                    statusBadge === 'WRAP UP' ? 'bg-amber-500 text-slate-950 font-bold' :
                    'bg-blue-600'
                  }`}>
                    {statusBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Giant Central Tabular Numbers */}
            <div className="flex-1 flex flex-col items-center justify-center my-auto z-10">
              <div className={`tabular-numbers font-extrabold tracking-tight text-center leading-none text-4xl sm:text-5xl md:text-6xl drop-shadow-lg ${colorClass}`}>
                {currentDisplayTime}
              </div>

              {activeTimer?.speaker && (
                <div className="text-xs text-neutral-400 font-medium truncate max-w-[80%] mt-1">
                  {activeTimer.speaker}
                </div>
              )}

              {isOvertime && (
                <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-red-400 mt-1">
                  Overtime +{Math.floor(overtimeSeconds)}s
                </div>
              )}
            </div>

            {/* Stage Flash Message Banner Overlay */}
            {activeMessage && activeMessage.visible && (
              <div className={`absolute inset-x-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-lg border text-center shadow-2xl ${
                activeMessage.severity === 'danger'
                  ? 'bg-red-600 text-white border-white animate-pulse'
                  : activeMessage.severity === 'warning'
                  ? 'bg-amber-500 text-slate-950 border-white'
                  : 'bg-cyan-600 text-white border-white'
              }`}>
                <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider opacity-90 mb-0.5">
                  <Bell className="w-3 h-3" />
                  <span>Stage Message</span>
                </div>
                <div className="text-xs sm:text-sm font-black uppercase truncate px-1">
                  {activeMessage.text}
                </div>
              </div>
            )}

            {/* Monitor In-Screen Bottom Progress Bar */}
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-white/5 z-10">
              <div
                className={`h-full rounded-full transition-all duration-150 ${barColorClass}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Precision Timeline Bar with Minute Interval Ticks */}
      <div className="bg-[#141414] border border-neutral-800 rounded-lg p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Radio className={`w-3.5 h-3.5 ${isRunning ? 'text-red-500 animate-pulse' : 'text-neutral-500'}`} />
            <span className="text-[11px] text-neutral-300 font-sans font-semibold">
              {isRunning ? 'Broadcasting to Stage' : 'Stage Ready'}
            </span>
          </div>

          <div className="text-[11px] text-neutral-300 font-bold tabular-numbers">
            {formatTime(timeRemaining)} / {formatTime(durationSec)}
          </div>
        </div>

        {/* Timeline Track with Minute Ticks */}
        <div className="relative pt-1 pb-4">
          {/* Main Track Background */}
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden relative border border-neutral-700/50">
            {/* Active Filled Progress Bar */}
            <div 
              className={`h-full rounded-full transition-all duration-150 ${
                isOvertime ? 'bg-red-600' : progressPercent <= 20 ? 'bg-red-500' : progressPercent <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Minute Tick Labels along the Timeline */}
          <div className="relative w-full h-4 mt-1">
            {timelineTicks.map((tick, idx) => (
              <div
                key={`${tick.label}-${idx}`}
                className="absolute flex flex-col items-center -translate-x-1/2"
                style={{ left: `${tick.percent}%` }}
              >
                <div className="w-px h-1.5 bg-neutral-600 mb-0.5" />
                <span className="text-[9px] font-mono text-neutral-400 select-none">
                  {tick.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Transport Controls */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-center gap-2">
          {/* Previous Timer */}
          <button
            onClick={previousTimer}
            className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            title="Previous Timer (Left Arrow)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Quick -1m */}
          <button
            onClick={() => adjustTime(-60)}
            className="px-2.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-medium text-neutral-300 border border-neutral-700 transition-colors"
            title="Subtract 1 minute"
          >
            -1m
          </button>

          {/* Primary Play / Pause Button */}
          <button
            onClick={isRunning ? pause : start}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
            }`}
            title="Start / Pause Timer (Spacebar)"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>START</span>
              </>
            )}
          </button>

          {/* Quick +1m */}
          <button
            onClick={() => adjustTime(60)}
            className="px-2.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-medium text-neutral-300 border border-neutral-700 transition-colors"
            title="Add 1 minute"
          >
            +1m
          </button>

          {/* Quick +5m */}
          <button
            onClick={() => adjustTime(300)}
            className="px-2.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-medium text-neutral-300 border border-neutral-700 transition-colors"
            title="Add 5 minutes"
          >
            +5m
          </button>

          {/* Next Timer */}
          <button
            onClick={nextTimer}
            className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            title="Next Timer (Right Arrow)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Reset Timer */}
          <button
            onClick={reset}
            className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition-colors"
            title="Reset Timer (R key)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Info: Wall Clock & Timezone Status */}
      <div className="flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800/80 pt-2.5">
        <div className="flex items-center gap-1.5 truncate max-w-[60%]">
          <Clock className="w-3.5 h-3.5 text-neutral-500" />
          <span className="truncate text-[11px] text-neutral-400">{timezoneName}</span>
        </div>

        <div className="font-mono text-[11px] text-neutral-300 font-semibold tabular-numbers">
          {wallClockStr}
        </div>
      </div>
    </div>
  );
}
