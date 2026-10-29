import type { OutputViewConfig } from '../../types/timer';
import type { OutputSnapshot } from '../../utils/outputModel';
import { clockLabel, elementVisible, formatOutputTime, outputConfig, timerReadout } from '../../utils/outputModel';
import { calculateScheduleMetrics } from '../../utils/scheduleMath';
import '../../styles/outputs.css';

export default function AgendaDisplay({ state, now, config = outputConfig(state, 'agenda') }: { state: OutputSnapshot; now: number; config?: OutputViewConfig }) {
  const metrics = calculateScheduleMetrics({ ...state, referenceTime: new Date(now) });
  const activeIndex = state.rundown.findIndex(timer => timer.id === state.activeTimerId);
  return <div className="agenda-display" style={{ backgroundColor: config.backgroundColor, fontFamily: config.fontFamily === 'JetBrains Mono' ? 'var(--font-mono)' : 'var(--font-sans)' }}>
    <header className="output-page-heading"><div><p className="output-eyebrow">Event schedule</p><h1>{state.roomName}</h1></div>
      {elementVisible(config, 'timeOfDay') && <time className="output-wall-clock">{clockLabel(now)}</time>}
    </header>
    {elementVisible(config, 'onAirIndicator') && <div className="schedule-summary"><span className={metrics.driftStatus === 'over' ? 'text-amber-300' : ''}>{!state.rundown.length ? 'No timers' : metrics.driftStatus === 'not_started' ? 'Not started' : metrics.driftStatus === 'on_time' ? 'On time' : `${metrics.formattedDrift} ${metrics.driftStatus === 'over' ? 'behind' : 'ahead'}`}</span><span>Estimated finish <strong>{metrics.formattedProjectedEnd}</strong></span></div>}
    {!state.rundown.length && <p className="output-note py-8">No segments have been added to this room.</p>}
    {elementVisible(config, 'timer') && <ol className="agenda-list">{state.rundown.map((item, index) => {
      const active = index === activeIndex;
      const previous = index < activeIndex;
      const schedule = metrics.itemSchedules.get(item.id);
      const readout = timerReadout(item, state, now);
      return <li className={`agenda-item ${active ? 'selected' : previous ? 'previous' : ''}`} key={item.id}>
        <div className="agenda-start"><span>{item.scheduledStartTime || schedule?.projectedStartTime || '—'}</span><small>{item.scheduledStartTime ? 'Planned' : 'Estimated'}</small></div>
        <div className="agenda-segment"><h2>{item.title}</h2>{item.speaker && <p>{item.speaker}</p>}<span className="agenda-state">{active ? readout.status : previous ? 'Earlier segment' : 'Upcoming'}{item.type === 'countup' ? ' · Count up' : item.type === 'clock' ? ' · Wall clock' : ''}</span></div>
        <div className={`agenda-time ${active ? readout.tone : ''}`}><strong>{active ? readout.text : formatOutputTime(item.durationSeconds)}</strong><small>{active ? readout.label : 'Duration'}</small></div>
      </li>;
    })}</ol>}
    {config.elements.filter(element => element.type === 'customText' && element.visible && element.customValue).map(element => <p className="output-note" key={element.id}>{element.customValue}</p>)}
    <footer className="output-note">Total show {metrics.formattedTotalPlanned} · Remaining {metrics.formattedRemaining}</footer>
  </div>;
}
