import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { FlashMessage, MessageColour } from '../../types/timer';
import { MESSAGE_COLOURS, MESSAGE_SEVERITY_COLOURS } from '../../utils/messageFormatting';
import type { MessageSelectionColour } from '../../utils/messageFormatting';

interface Props { value: MessageSelectionColour; disabled: boolean; severity: FlashMessage['severity']; onChange: (colour: MessageColour | null) => void }
export default function MessageColourPalette({ value, disabled, severity, onChange }: Props) {
  const inherited = MESSAGE_SEVERITY_COLOURS[severity];
  return <div className="message-colour-palette" role="group" aria-label="Selected text colour">
    <div className="message-colour-heading"><span>Text colour</span><span className="message-colour-status" aria-live="polite">{value === 'mixed' ? 'Mixed colours' : !value ? 'Select text first' : value === 'default' ? 'Default' : value[0].toUpperCase() + value.slice(1)}</span></div>
    <div className="message-colour-swatches">
      <button type="button" className="message-colour-default" disabled={disabled} aria-label="Use default message colour" aria-pressed={value === 'default'} title="Use the Info, Warning or Danger colour; keep bold formatting" onClick={() => onChange(null)}><span className="message-colour-pot" style={{ '--swatch-colour': inherited } as CSSProperties} aria-hidden="true">{value === 'default' && <Check size={14} strokeWidth={3} />}</span><span>Default</span></button>
      {(Object.keys(MESSAGE_COLOURS) as MessageColour[]).map(colour => <button key={colour} type="button" className="message-colour-swatch" disabled={disabled} aria-label={`Colour selected text ${colour}`} aria-pressed={value === colour} title={`${colour[0].toUpperCase() + colour.slice(1)} text`} onClick={() => onChange(colour)}><span className="message-colour-pot" style={{ '--swatch-colour': MESSAGE_COLOURS[colour], '--swatch-tick': colour === 'blue' ? '#ffffff' : '#141414' } as CSSProperties} aria-hidden="true">{value === colour && <Check size={14} strokeWidth={3} />}</span></button>)}
    </div>
  </div>;
}
