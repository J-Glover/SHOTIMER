import { useState, useEffect } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { Maximize2, Minimize2, EyeOff, Bell, Sun } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';

export default function ViewerView() {
  const isWakeLocked = useWakeLock(true);
  const {
    rundown,
    activeTimerId,
    timeRemaining,
    elapsedTime,
    targetDuration,
    overtimeSeconds,
    blackout,
    activeMessage,
    theme,
    roomId,
    cloudSyncStatus,
  } = useTimerStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [showControls, setShowControls] = useState(false);

  const activeTimer = rundown.find((t) => t.id === activeTimerId) || rundown[0];
  const activeIndex = rundown.findIndex((t) => t.id === activeTimerId);
  const nextTimer = activeIndex >= 0 && activeIndex < rundown.length - 1 ? rundown[activeIndex + 1] : null;

  // Format time of day clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const timerType = activeTimer?.type || 'countdown';
  const isCountup = timerType === 'countup';
  const isClock = timerType === 'clock';

  const yellowThreshold = activeTimer?.thresholds?.yellowTime ?? 120;
  const redThreshold = activeTimer?.thresholds?.redTime ?? 30;

  // Determine stage alert coloring & progress
  let isOvertime = false;
  let colorClass = 'text-white glow-green';
  let barColorClass = 'bg-emerald-500 shadow-[0_0_20px_#10B981]';
  let statusBadge = null;
  let progressPercent = 0;

  if (isClock) {
    colorClass = 'text-white drop-shadow-2xl';
    statusBadge = 'WALL CLOCK';
    progressPercent = 100;
  } else if (isCountup) {
    isOvertime = elapsedTime > targetDuration;
    const remainingInCountup = Math.max(0, targetDuration - elapsedTime);
    progressPercent = Math.min(100, Math.max(0, (elapsedTime / (targetDuration || 1)) * 100));

    if (isOvertime) {
      colorClass = 'text-red-500 glow-red animate-stage-pulse';
      barColorClass = 'bg-red-600 shadow-[0_0_25px_#EF4444]';
      statusBadge = 'OVERTIME';
    } else if (remainingInCountup <= redThreshold) {
      colorClass = 'text-red-400 glow-red';
      barColorClass = 'bg-red-500 shadow-[0_0_20px_#EF4444]';
      statusBadge = 'CRITICAL';
    } else if (remainingInCountup <= yellowThreshold) {
      colorClass = 'text-amber-400 glow-amber';
      barColorClass = 'bg-amber-500 shadow-[0_0_20px_#F59E0B]';
      statusBadge = 'WRAP UP';
    }
  } else {
    // Countdown
    isOvertime = timeRemaining < 0;
    progressPercent = Math.min(100, Math.max(0, (timeRemaining / (targetDuration || 1)) * 100));

    if (isOvertime) {
      colorClass = 'text-red-500 glow-red animate-stage-pulse';
      barColorClass = 'bg-red-600 shadow-[0_0_25px_#EF4444]';
      statusBadge = 'OVERTIME';
    } else if (timeRemaining <= redThreshold) {
      colorClass = 'text-red-400 glow-red';
      barColorClass = 'bg-red-500 shadow-[0_0_20px_#EF4444]';
      statusBadge = 'CRITICAL';
    } else if (timeRemaining <= yellowThreshold) {
      colorClass = 'text-amber-400 glow-amber';
      barColorClass = 'bg-amber-500 shadow-[0_0_20px_#F59E0B]';
      statusBadge = 'WRAP UP';
    }
  }

  // Format MM:SS with negative support
  const formatDisplayTime = (totalSec: number) => {
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

  if (blackout) {
    return (
      <div 
        className="fixed inset-0 bg-[#000000] flex flex-col items-center justify-center cursor-none z-50"
        onMouseMove={() => setShowControls(true)}
      >
        <div className="text-white/20 text-sm tracking-widest uppercase flex items-center gap-2">
          <EyeOff className="w-4 h-4" />
          <span>Stage Blackout Active</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 ${theme.oledBlack ? 'bg-[#000000]' : 'bg-[#181818]'} text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onMouseMove={() => {
        setShowControls(true);
        clearTimeout((window as any)._ctlTimer);
        (window as any)._ctlTimer = setTimeout(() => setShowControls(false), 3000);
      }}
    >
      {/* Top Bar: Current Segment Title & Presenter */}
      <header className="flex items-center justify-between z-20">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white drop-shadow-md">
              {activeTimer?.title || 'Stage Segment'}
            </h1>
            {statusBadge && (
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg ${
                statusBadge === 'OVERTIME' ? 'bg-red-600/90 animate-pulse' :
                statusBadge === 'CRITICAL' ? 'bg-red-500/90' :
                statusBadge === 'WRAP UP' ? 'bg-amber-500/90 text-neutral-950' :
                'bg-blue-600/80'
              }`}>
                {statusBadge}
              </span>
            )}
            {activeTimer?.autoStartNext && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ⚡ Auto-Advance
              </span>
            )}
            {activeTimer?.scheduledStartTime && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                ⏰ {activeTimer.scheduledStartTime}
              </span>
            )}
          </div>
          {activeTimer?.speaker && (
            <p className="text-base sm:text-2xl text-neutral-400 font-light mt-1">
              {activeTimer.speaker}
            </p>
          )}
          {activeTimer?.notes && (
            <div className="mt-2 max-w-2xl bg-neutral-900/90 border border-neutral-700/60 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm text-amber-300/90 font-medium drop-shadow-md">
              💡 {activeTimer.notes}
            </div>
          )}
        </div>

        {/* Fullscreen & View controls (auto-hiding) */}
        <div className={`transition-opacity duration-300 flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/90 border border-white/10 text-xs font-medium text-neutral-300">
            <span className={`w-2 h-2 rounded-full ${
              cloudSyncStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : cloudSyncStatus === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-neutral-500'
            }`} />
            <span className="font-mono text-[11px] text-neutral-400">{roomId}</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 ml-0.5">
              {cloudSyncStatus === 'connected' ? 'Live' : cloudSyncStatus === 'connecting' ? 'Syncing...' : 'Local'}
            </span>
          </div>

          {isWakeLocked && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/90 text-emerald-400 border border-white/10 text-xs font-medium">
              <Sun className="w-3.5 h-3.5" />
              <span>Awake</span>
            </div>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors border border-white/10"
            title="Toggle Fullscreen (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Center: Massive Edge-to-Edge Confidence Monitor Digits */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-2 z-10">
        <div className={`tabular-numbers font-bold text-center leading-none tracking-tight ${colorClass} text-[18vw] sm:text-[22vw] lg:text-[24vw] drop-shadow-2xl`}>
          {isClock ? currentTimeStr : isCountup ? formatDisplayTime(elapsedTime) : formatDisplayTime(timeRemaining)}
        </div>

        {isOvertime && (
          <div className="text-red-400 text-sm sm:text-xl font-semibold uppercase tracking-widest mt-2">
            Overtime: +{Math.floor(overtimeSeconds)}s
          </div>
        )}
      </div>

      {/* Prominent Stage Flash Message Banner */}
      {activeMessage && activeMessage.visible && (
        <div 
          className={`absolute inset-x-8 top-1/2 -translate-y-1/2 z-40 p-8 sm:p-12 rounded-2xl shadow-2xl border-4 text-center ${
            activeMessage.severity === 'danger'
              ? 'bg-red-600 text-white border-white animate-flash-strobe'
              : activeMessage.severity === 'warning'
              ? 'bg-amber-500 text-slate-950 border-white'
              : 'bg-cyan-600 text-white border-white'
          }`}
        >
          <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-bold uppercase tracking-widest opacity-90 mb-2">
            <Bell className="w-5 h-5 animate-bounce" />
            DIRECTOR MESSAGE
          </div>
          <div className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight drop-shadow-lg uppercase">
            {activeMessage.text}
          </div>
        </div>
      )}

      {/* Bottom Area: Progress Bar + Time of Day & Next Segment */}
      <footer className="w-full flex flex-col gap-4 z-20">
        {/* Stage Progress Bar (toggleable) */}
        {theme.showProgressBar && (
          <div className="w-full h-4 sm:h-5 bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className={`h-full rounded-full transition-all duration-200 ${barColorClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Footer Meta: Clock & Next Segment */}
        <div className="flex items-center justify-between text-sm sm:text-xl text-neutral-400 font-light">
          <div className="tabular-numbers font-mono">
            {currentTimeStr}
          </div>

          {theme.showUpNext && nextTimer ? (
            <div className="flex items-center gap-2 truncate text-right">
              <span className="text-neutral-500 hidden sm:inline">Up Next:</span>
              <span className="text-neutral-200 font-normal truncate">
                {nextTimer.title} {nextTimer.speaker ? `(${nextTimer.speaker})` : ''}
              </span>
            </div>
          ) : (
            <div className="text-neutral-500 text-xs sm:text-base">
              End of Rundown
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
