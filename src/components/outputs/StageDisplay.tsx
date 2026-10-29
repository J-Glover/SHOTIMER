import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { FlashMessage, OutputViewConfig, OutputElementConfig } from '../../types/timer';
import type { OutputSnapshot } from '../../utils/outputModel';
import { clockLabel, outputConfig, timerReadout } from '../../utils/outputModel';
import { flashElapsed, stageLogo } from '../../utils/stagePresentation';
import FittedText from './FittedText';
import MessageText from './MessageText';
import { MESSAGE_SEVERITY_COLOURS } from '../../utils/messageFormatting';
import '../../styles/outputs.css';

function StageMessage({ message, now }: { message: FlashMessage; now: number }) {
  const [elapsed] = useState(() => flashElapsed(message.createdAt, now));
  return <div className={`stage-message ${message.severity} ${message.isFlashing ? 'message-flashing' : ''}`} style={{ animationDelay: `-${elapsed}ms`, color: MESSAGE_SEVERITY_COLOURS[message.severity] }}>
    <FittedText text={message.text} multiline contentKey={JSON.stringify(message.richText)}><MessageText text={message.text} richText={message.richText} /></FittedText>
  </div>;
}

export default function StageDisplay({ state, now, config = outputConfig(state, 'viewer'), clean = false }: {
  state: OutputSnapshot; now: number; config?: OutputViewConfig; clean?: boolean;
}) {
  const item = state.rundown.find(timer => timer.id === state.activeTimerId) || state.rundown[0];
  const next = state.rundown[state.rundown.indexOf(item) + 1];
  const readout = timerReadout(item, state, now);
  const message = state.activeMessage?.visible ? state.activeMessage : null;
  const messageOnly = message?.displayMode === 'message-only';
  const logo = !clean && !messageOnly ? stageLogo(config) : undefined;
  const elements = [...config.elements].filter(element => element.visible).sort((a, b) => a.order - b.order);
  const timerVisible = !!item && (clean || elements.some(element => element.type === 'timer'));
  const header = !item || clean || messageOnly ? [] : elements.filter(element => ['segmentTitle', 'speaker', 'speakerNotes', 'onAirIndicator'].includes(element.type));
  const footer = !item || clean || messageOnly ? [] : elements.filter(element => ['progressBar', 'timeOfDay', 'upNext', 'customText'].includes(element.type));
  const style = { backgroundColor: state.blackout ? config.blackoutColor : config.backgroundColor, fontFamily: config.fontFamily === 'Inter' ? 'var(--font-sans)' : 'var(--font-mono)' } as CSSProperties;
  function renderElement(element: OutputElementConfig) {
    switch (element.type) {
      case 'segmentTitle': return <h1 key={element.id} className="stage-title">{item?.title || 'Ready for the next segment'}</h1>;
      case 'speaker': return item?.speaker && <p key={element.id} className="stage-speaker">{item.speaker}</p>;
      case 'speakerNotes': return item?.notes && <p key={element.id} className="stage-notes">{item.notes}</p>;
      case 'onAirIndicator': return <p key={element.id} className={`stage-state ${readout.tone}`}>{readout.status}{readout.overtime ? ' · Overtime' : ''}</p>;
      case 'progressBar': return item?.type !== 'clock' && <div key={element.id} className="stage-progress" role="progressbar" aria-label="Segment progress" aria-valuenow={Math.round(readout.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span className={readout.tone} style={{ width: `${readout.progress * 100}%` }} /></div>;
      case 'timeOfDay': return item?.type !== 'clock' && <p key={element.id} className="stage-clock">{clockLabel(now)}</p>;
      case 'upNext': return <p key={element.id} className="stage-next">{next ? `Up next · ${next.title}${next.speaker ? ` · ${next.speaker}` : ''}` : 'End of rundown'}</p>;
      case 'customText': return element.customValue && <p key={element.id} className="stage-custom">{element.customValue}</p>;
      default: return null;
    }
  }
  if (state.blackout) return <div className="stage-output" style={style} aria-label="Stage display blacked out" />;
  return <div className={`stage-output ${clean ? 'clean' : ''} ${message ? 'has-message' : ''} ${messageOnly ? 'message-only' : ''}`} style={style} data-playback={state.status}>
    <div className="stage-content">
      {(logo || header.length > 0) && <header className={`stage-header ${logo ? 'has-logo' : ''}`}>
        {logo && <img className={`stage-logo ${logo.customProps?.size || 'medium'}`} src={logo.customValue} alt={logo.customProps?.name || 'Stage logo'} />}
        <div className="stage-heading">{header.map(renderElement)}</div>
      </header>}
      <div className="stage-main">
        {!item && !message && <p className="stage-empty">Waiting for a timer</p>}
        {!messageOnly && timerVisible && <div className={`stage-timer ${readout.tone} ${readout.blink ? 'overtime-blink' : ''}`}><FittedText text={readout.text} className="stage-digits" /></div>}
        {message && <StageMessage key={message.id} message={message} now={now} />}
      </div>
      {footer.length > 0 && <footer className="stage-footer">{footer.map(renderElement)}</footer>}
    </div>
  </div>;
}
