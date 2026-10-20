import { useTimerStore } from '../store/useTimerStore';
import { CheckCircle2, Clock, Play } from 'lucide-react';

interface AgendaViewProps {
  onBackToController?: () => void;
}

export default function AgendaView({ onBackToController }: AgendaViewProps) {
  const { roomName, rundown, activeTimerId, timeRemaining, status } = useTimerStore();

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}:${remainingSec.toString().padStart(2, '0')}`;
  };

  const activeIndex = rundown.findIndex((t) => t.id === activeTimerId);

  return (
    <div className="min-h-screen bg-[#141414] text-neutral-200 p-6 sm:p-10 max-w-4xl mx-auto flex flex-col gap-8 font-sans">
      <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-emerald-400">Live Schedule & Rundown</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{roomName}</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">Real-time schedule for presenters and crew</p>
        </div>

        {onBackToController && (
          <button
            onClick={onBackToController}
            className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors"
          >
            Back to Console
          </button>
        )}
      </header>

      {/* Agenda Timeline List */}
      <div className="flex flex-col gap-4">
        {rundown.map((item, idx) => {
          const isActive = item.id === activeTimerId;
          const isCompleted = activeIndex > idx;

          return (
            <div
              key={item.id}
              className={`p-5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-neutral-800/90 border-emerald-500 shadow-xl shadow-emerald-950/20'
                  : isCompleted
                  ? 'bg-[#181818]/60 border-neutral-800/60 opacity-60'
                  : 'bg-[#181818] border-neutral-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-neutral-500" />
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                        <Play className="w-3 h-3 text-neutral-950 fill-current ml-0.5" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] text-neutral-400 font-mono">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base sm:text-lg font-semibold ${isActive ? 'text-white' : 'text-neutral-200'}`}>
                        {item.title}
                      </h3>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Live Now ({status})
                        </span>
                      )}
                      {item.type && item.type !== 'countdown' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-800 text-neutral-400 border border-neutral-700">
                          {item.type === 'countup' ? 'Count-up' : 'Wall Clock'}
                        </span>
                      )}
                      {item.scheduledStartTime && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-800 text-amber-400 border border-neutral-700">
                          ⏰ {item.scheduledStartTime}
                        </span>
                      )}
                      {item.autoStartNext && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          ⚡ Linked
                        </span>
                      )}
                    </div>
                    {item.speaker && (
                      <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">{item.speaker}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-neutral-500 italic mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>

                {/* Duration or Active Remaining */}
                <div className="text-right">
                  {isActive ? (
                    <div className="tabular-numbers font-mono text-xl sm:text-2xl font-bold text-emerald-400">
                      {formatDuration(Math.max(0, Math.floor(timeRemaining)))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{formatDuration(item.durationSeconds)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
