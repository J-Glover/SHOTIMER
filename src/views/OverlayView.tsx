import { useTimerStore } from '../store/useTimerStore';

export default function OverlayView() {
  const { rundown, activeTimerId, timeRemaining, blackout, activeMessage } = useTimerStore();
  const activeTimer = rundown.find((t) => t.id === activeTimerId) || rundown[0];

  if (blackout) return null;

  const formatTime = (totalSec: number) => {
    const absVal = Math.abs(Math.floor(totalSec));
    const mins = Math.floor(absVal / 60);
    const secs = absVal % 60;
    const sign = totalSec < 0 ? '+' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOvertime = timeRemaining < 0;
  const isWarning = timeRemaining <= (activeTimer?.thresholds?.yellowTime ?? 120);
  const isAlert = timeRemaining <= (activeTimer?.thresholds?.redTime ?? 30);

  let textColor = 'text-white';
  if (isOvertime || isAlert) textColor = 'text-red-400';
  else if (isWarning) textColor = 'text-amber-400';

  return (
    <div className="fixed inset-0 bg-transparent p-6 flex flex-col justify-end select-none pointer-events-none">
      {/* On-Screen Flash Message Lower Third */}
      {activeMessage && activeMessage.visible && (
        <div className="mb-4 self-center bg-red-600/95 text-white px-8 py-3 rounded-xl border-2 border-white shadow-2xl font-bold text-2xl uppercase tracking-wider animate-pulse">
          {activeMessage.text}
        </div>
      )}

      {/* Broadcast Lower Third Bar */}
      <div className="self-start bg-neutral-900/90 backdrop-blur-md border border-neutral-700/80 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-white font-bold text-lg leading-tight">{activeTimer?.title}</span>
          {activeTimer?.speaker && (
            <span className="text-neutral-400 text-xs font-medium">{activeTimer.speaker}</span>
          )}
        </div>

        <div className="h-8 w-px bg-neutral-700" />

        <div className={`tabular-numbers font-mono font-bold text-3xl tracking-tight ${textColor}`}>
          {formatTime(timeRemaining)}
        </div>
      </div>
    </div>
  );
}
