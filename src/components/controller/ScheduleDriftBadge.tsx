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
  let labelText = !metrics.totalPlannedSeconds ? 'NO TIMERS' : metrics.hasStarted ? 'ON TIME' : 'NOT STARTED';

  if (driftStatus === 'over') {
    statusBadgeStyle = 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm shadow-red-950/40';
    icon = <TrendingUp className="w-3.5 h-3.5 text-red-400 animate-pulse" />;
    labelText = `${formattedDrift} OVER`;
  } else if (driftStatus === 'under') {
    statusBadgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950/40';
    icon = <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
    labelText = `${formattedDrift} UNDER`;
  }

  return (
    <details className="console-dropdown timing-breakdown">
      <summary
        aria-label="Show timing breakdown"
        className={`flex items-center flex-wrap gap-2.5 bg-[#141414] hover:bg-[#181818] border border-neutral-800 hover:border-neutral-700 rounded-lg p-2.5 transition-all cursor-pointer select-none group ${compact ? 'text-xs' : ''}`}
        title="Click to view detailed Show Timing Breakdown"
      >
        {/* Over/Under Pill */}
        <div className={`flex items-center shrink-0 whitespace-nowrap gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${statusBadgeStyle}`}>
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

        </div>

        <ChevronDown className="w-3.5 h-3.5 text-neutral-500 ml-auto transition-transform group-open:rotate-180" />
      </summary>

      {/* Dropdown / Details Popover */}
        <div className="console-menu timing-menu text-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show Timing Math</span>
            </div>
            <button 
              aria-label="Close timing breakdown"
              onClick={(e) => { const details = e.currentTarget.closest('details'); if (details) { details.open = false; details.querySelector('summary')?.focus(); } }}
              className="text-neutral-400 hover:text-white timing-close"
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
                {driftStatus === 'not_started' ? 'Not started' : `${formattedDrift} (${driftStatus === 'over' ? 'Behind' : driftStatus === 'under' ? 'Ahead' : 'On time'})`}
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
              {driftStatus === 'not_started' ? (
                <>Timing has not started. ETA is an estimate using the selected segment and remaining rundown. Planned start times are kept; Over/Under begins when you start a timer.</>
              ) : driftStatus === 'over' ? (
                <>The projected finish is <strong>{Math.ceil(Math.abs(driftSeconds) / 60)}m</strong> later than the planned finish. Review remaining durations or reset show timing for a fresh run.</>
              ) : driftStatus === 'under' ? (
                <>The projected finish is <strong>{Math.ceil(Math.abs(driftSeconds) / 60)}m</strong> earlier than the planned finish. This compares the schedule, rather than counting unused timer minutes.</>
              ) : (
                <>The projected finish is within 20 seconds of the planned finish.</>
              )}
            </p>
          </div>
        </div>
    </details>
  );
}
