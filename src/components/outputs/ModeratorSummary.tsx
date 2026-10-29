import type { OutputViewConfig } from '../../types/timer';
import type { OutputSnapshot } from '../../utils/outputModel';
import { clockLabel, elementVisible, outputConfig, timerReadout } from '../../utils/outputModel';
import '../../styles/outputs.css';

export default function ModeratorSummary({ state, now, config = outputConfig(state, 'moderator') }: { state: OutputSnapshot; now: number; config?: OutputViewConfig }) {
  const index = state.rundown.findIndex(timer => timer.id === state.activeTimerId);
  const item = state.rundown[index] || state.rundown[0];
  const next = state.rundown[state.rundown.indexOf(item) + 1];
  const readout = timerReadout(item, state, now);
  return <section className="moderator-summary console-panel" style={{ backgroundColor: config.backgroundColor, fontFamily: config.fontFamily === 'JetBrains Mono' ? 'var(--font-mono)' : 'var(--font-sans)' }} aria-label="Current stage segment">
    <div className="moderator-current"><div className="min-w-0"><p className="output-eyebrow">{readout.status}</p><h2>{item?.title || 'No segment selected'}</h2>{item?.speaker && <p className="text-neutral-400 text-sm mt-1">{item.speaker}</p>}</div>
      {item && elementVisible(config, 'timer') && <div className={`moderator-time ${readout.tone}`}><small>{readout.label}</small><strong>{readout.text}</strong></div>}
    </div>
    {elementVisible(config, 'speakerNotes') && <div className="moderator-notes"><h3>Speaker notes</h3><p>{item?.notes || 'No notes for this segment.'}</p></div>}
    {elementVisible(config, 'upNext') && <p className="output-note">{next ? `Up next · ${next.title}${next.speaker ? ` · ${next.speaker}` : ''}` : 'End of rundown'}</p>}
    {elementVisible(config, 'timeOfDay') && <time className="output-note">{clockLabel(now)}</time>}
    {config.elements.filter(element => element.type === 'customText' && element.visible && element.customValue).map(element => <p className="output-note" key={element.id}>{element.customValue}</p>)}
  </section>;
}
