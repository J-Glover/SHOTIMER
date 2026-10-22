import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Flag, 
  Info, 
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import type { ScheduleMetrics } from '../../utils/scheduleMath';

interface ScheduleDriftBadgeProps {
  metrics: ScheduleMetrics;
  compact?: boolean;
}

export default function ScheduleDriftBadge({ metrics, compact = false }: ScheduleDriftBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const {
    driftStatus,
    driftSeconds,
    formattedDrift,
    formattedProjectedEnd,
    formattedPlannedEnd,
    formattedTotalPlanned,
    formattedRemaining,
    hasScheduleAnchors,
  } = metrics;

  // Visual styling based on drift status
  let statusBadgeStyle = 'bg-neutral-800 text-neutral-300 border-neutral-700/80';
  let icon = <Clock className="w-3.5 h-3.5 text-neutral-400" />;
  let labelText = 'ON TIME';

  if (driftStatus === 'over') {
    statusBadgeStyle = 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm shadow-red-950/40';
    icon = <TrendingUp className="w-3.5 h-3.5 text-red-400 animate-pulse" />;
    labelText = `${formattedDrift} OVER`;
  } else if (driftStatus === 'under') {
    statusBadgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950/40';
    icon = <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
    labelText = `${formattedDrift} UNDER`;
  }

  if (compact) {
    return (
      <div 
        onClick={() => setShowDetails(!showDetails)}
        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold cursor-pointer select-none transition-all hover:scale-[1.02] active:scale-95 ${statusBadgeStyle}`}
        title="Production Schedule Status - Click for breakdown"
      >
        {icon}
        <span>{labelText}</span>
        <span className="text-[10px] text-neutral-400 font-sans border-l border-neutral-700/60 pl-1.5 ml-0.5">
          ETA {formattedProjectedEnd}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2.5 bg-[#141414] hover:bg-[#181818] border border-neutral-800 hover:border-neutral-700 rounded-lg p-2.5 transition-all cursor-pointer select-none group"
        title="Click to view detailed Show Timing Breakdown"
      >
        {/* Over/Under Pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${statusBadgeStyle}`}>
          {icon}
          <span>{labelText}</span>
        </div>

        {/* Schedule Summary Data */}
        <div className="flex items-center gap-3 text-xs divide-x divide-neutral-800 text-neutral-300">
          <div className="flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-400 font-sans">ETA:</span>
            <span className="font-mono font-semibold text-white">{formattedProjectedEnd}</span>
            {hasScheduleAnchors && formattedPlannedEnd !== '--:--' && (
              <span className="text-[11px] text-neutral-500 line-through font-mono">
                {formattedPlannedEnd}
              </span>
            )}
          </div>

          <div className="pl-3 hidden sm:flex items-center gap-1.5 text-neutral-400">
            <span>Left:</span>
            <span className="font-mono text-neutral-200 font-medium">{formattedRemaining}</span>
            <span className="text-neutral-600">/</span>
            <span className="font-mono text-neutral-400">{formattedTotalPlanned}</span>
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 ml-auto transition-transform ${showDetails ? 'rotate-180 text-amber-400' : 'group-hover:text-neutral-300'}`} />
      </div>

      {/* Dropdown / Details Popover */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1A1A1A] border border-neutral-700 rounded-xl shadow-2xl p-4 z-50 text-xs flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show Timing Math</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDetails(false); }}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Metric Rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
              <span className="text-neutral-400">Current Over/Under Drift:</span>
              <span className={`font-mono font-bold ${
                driftStatus === 'over' ? 'text-red-400' : driftStatus === 'under' ? 'text-emerald-400' : 'text-neutral-300'
              }`}>
                {formattedDrift} ({driftStatus === 'over' ? 'Behind' : driftStatus === 'under' ? 'Ahead' : 'On Time'})
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
              <span className="text-neutral-400">Projected Finish (ETA):</span>
              <span className="font-mono font-bold text-amber-300">{formattedProjectedEnd}</span>
            </div>

            {hasScheduleAnchors && (
              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Planned Schedule Finish:</span>
                <span className="font-mono text-neutral-300">{formattedPlannedEnd}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
              <span className="text-neutral-400">Show Time Remaining:</span>
              <span className="font-mono text-neutral-200">{formattedRemaining}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-400">Total Planned Show Length:</span>
              <span className="font-mono text-neutral-400">{formattedTotalPlanned}</span>
            </div>
          </div>

          {/* Explanatory Helper Box */}
          <div className="bg-[#111111] border border-neutral-800 rounded-lg p-2.5 text-[11px] text-neutral-400 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {driftStatus === 'over' ? (
                <>Speakers have run <strong>{Math.ceil(Math.abs(driftSeconds) / 60)}m</strong> over schedule. Trim upcoming segment times using the <code className="text-amber-300">-1m</code> buttons to bring the show back on time.</>
              ) : driftStatus === 'under' ? (
                <>You have banked <strong>{Math.ceil(Math.abs(driftSeconds) / 60)}m</strong> of spare time. The event will finish ahead of the original plan.</>
              ) : (
                <>The event is running exactly according to your planned durations and schedule.</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
