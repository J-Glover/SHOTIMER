import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import type { MessagePreset } from '../../hooks/useSavedPresets';
import MessageText from '../outputs/MessageText';

export default function MessagePresetLibrary({ items, onChoose, onRemove, onClose }: { items: MessagePreset[]; onChoose: (preset: MessagePreset) => void; onRemove: (index: number) => void; onClose: () => void }) {
  const ref = useDialogFocus(true, onClose);
  return <div ref={ref} className="screen-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Saved message library" tabIndex={-1}><section className="screen-dialog app-dialog-panel"><header><div><h2>Saved messages</h2><p className="output-note">Choosing a message loads your draft. Use Show on stage to send it.</p></div><button className="console-icon" aria-label="Close saved messages" onClick={onClose}><X size={18} /></button></header><div className="preset-library-list">{!items.length && <p className="output-note">Save a draft with the bookmark button to keep it in this browser.</p>}{items.map((preset, index) => <div className="saved-message" key={preset.text}><button onClick={() => { onChoose(preset); onClose(); }}><MessageText text={preset.text} richText={preset.richText} /></button><button className="console-icon" aria-label={`Remove saved message ${preset.text}`} onClick={() => onRemove(index)}><X size={15} /></button></div>)}</div></section></div>;
}
