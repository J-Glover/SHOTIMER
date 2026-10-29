import { useRef, useState } from 'react';
import { Bell, ChevronDown, BookmarkPlus, X, MoreHorizontal } from 'lucide-react';
import ResetDialog from '../common/ResetDialog';
import { useTimerStore } from '../../store/useTimerStore';
import { isMessagePreset, useSavedPresets } from '../../hooks/useSavedPresets';
import type { MessagePreset } from '../../hooks/useSavedPresets';
import MessageEditor from './MessageEditor';
import type { MessageEditorHandle } from './MessageEditor';
import MessageText from '../outputs/MessageText';
import { normalizeMessageContent } from '../../utils/messageFormatting';

const defaults: MessagePreset[] = [
  { text: '5 MIN LEFT', severity: 'info', isFlashing: false },
  { text: '2 MIN — WRAP UP', severity: 'warning', isFlashing: false },
  { text: 'STOP / TIME UP', severity: 'danger', isFlashing: true },
  { text: 'MIC CLOSER PLEASE', severity: 'info', isFlashing: false },
  { text: 'STANDBY', severity: 'info', isFlashing: false },
];

export default function MessagesPanel({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const key = useTimerStore(state => `${state.roomId}:${state.messageDraftVersion || ''}`);
  return <MessageComposer key={key} collapsed={collapsed} onToggle={onToggle} />;
}
function MessageComposer({ collapsed, onToggle }: { collapsed: boolean; onToggle?: () => void }) {
  const activeMessage = useTimerStore(s => s.activeMessage);
  const setMessage = useTimerStore(s => s.setMessage);
  const clearMessage = useTimerStore(s => s.clearMessage);
  const roomId = useTimerStore(s => s.roomId);
  const [draft, setDraft] = useState<MessagePreset>({ text: '', severity: 'info', isFlashing: false });
  const [editorVersion, setEditorVersion] = useState(0);
  const editor = useRef<MessageEditorHandle>(null);
  const [feedback, setFeedback] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const saved = useSavedPresets('shotimer_message_presets_v1', isMessagePreset);
  const visible = activeMessage?.visible;
  function loadPreset(preset: MessagePreset) { setDraft(structuredClone(preset)); setEditorVersion(value => value + 1); setFeedback(''); }
  function saveDraft() {
    const content = normalizeMessageContent(draft.text, draft.richText, true);
    const text = content.text;
    if (!text) return;
    if (saved.items.length >= 20 && !saved.items.some(item => item.text === text)) {
      setFeedback('You can save up to 20 messages. Remove one to make space.'); return;
    }
    saved.save([...saved.items.filter(item => item.text !== text), { ...draft, richText: undefined, ...content }]);
    setFeedback('');
  }
  return <section className="console-panel messages-panel" aria-label="Stage messages">
    {onToggle ? <button className="panel-heading w-full text-left" aria-expanded={!collapsed} onClick={onToggle}>
      <span className="flex items-center gap-2"><Bell size={16} /><span>Stage messages</span></span>
      <span className="flex items-center gap-2">
        {visible && <span className="live-label">On stage</span>}
        <ChevronDown size={16} className={collapsed ? '-rotate-90' : ''} />
      </span>
    </button> : <h2 className="panel-heading"><span className="flex items-center gap-2"><Bell size={16} />Stage messages</span>{visible && <span className="live-label">On stage</span>}</h2>}
    {!collapsed && <div className="panel-body flex flex-col gap-4" key={roomId}>
      <div className="flex items-start gap-2"><p className="text-xs text-neutral-400 leading-relaxed flex-1">Choose a preset or write a message, then show it on stage.</p><details className="console-dropdown"><summary className="console-icon" aria-label="Stage message actions"><MoreHorizontal size={16} /></summary><div className="console-menu"><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setResetOpen(true); }}>Clear stage messages…</button></div></details></div>
      <div className="flex flex-wrap gap-2" aria-label="Message presets">
        {defaults.map(preset => <button key={preset.text} className="console-button text-xs" onClick={() => loadPreset(preset)}>{preset.text}</button>)}
      </div>
      {!!saved.items.length && <div>
        <p className="console-label mb-2">Your messages</p>
        <div className="flex flex-col gap-1.5">
          {saved.items.map(preset => <div key={preset.text} className="saved-message">
            <button title={preset.text} onClick={() => loadPreset(preset)}><MessageText text={preset.text} richText={preset.richText} /></button>
            <button className="console-icon" aria-label={`Remove saved message ${preset.text}`} onClick={() => saved.save(saved.items.filter(item => item.text !== preset.text))}><X size={14} /></button>
          </div>)}
        </div>
      </div>}
      <MessageEditor ref={editor} key={editorVersion} initialValue={draft} severity={draft.severity} onChange={content => setDraft(current => ({ ...current, richText: undefined, ...content }))} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" aria-label="Message severity">
          {(['info', 'warning', 'danger'] as const).map(severity => <button key={severity} aria-pressed={draft.severity === severity}
            className={`severity-button ${draft.severity === severity ? severity : ''}`} title={`Make the whole draft ${severity === 'info' ? 'white' : severity === 'warning' ? 'yellow' : 'red'}; replace word colours and keep bold`} onClick={() => { editor.current?.resetAllTextColours(); setDraft(current => ({ ...current, severity })); }}>{severity}</button>)}
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" checked={draft.isFlashing} onChange={e => setDraft({ ...draft, isFlashing: e.target.checked })} />Flash 3 times</label>
      </div>
      <label className="form-label">Message layout<select className="console-input" value={draft.displayMode || 'with-timer'} onChange={event => setDraft({ ...draft, displayMode: event.target.value as MessagePreset['displayMode'] })}><option value="with-timer">Large message + smaller timer</option><option value="message-only">Message only (fills screen)</option></select></label>
      <p className="text-xs text-neutral-400 leading-relaxed">Messages stay visible until cleared. Flashing stops after three pulses.</p>
      <div className="flex gap-2">
        <button className="console-button primary flex-1" disabled={!draft.text.trim()} onClick={() => { setMessage(draft.text, draft.severity, draft.isFlashing, draft.displayMode || 'with-timer', draft.richText); setFeedback(''); }}>Show on stage</button>
        <button className="console-icon" disabled={!draft.text.trim()} title="Save message preset" aria-label="Save message preset" onClick={saveDraft}><BookmarkPlus size={17} /></button>
      </div>
      {visible && <div className={`on-stage-message ${activeMessage.severity}`}>
        <p className="console-label mb-2">Currently on stage</p>
        <p className="text-sm break-words whitespace-pre-wrap"><MessageText text={activeMessage.text} richText={activeMessage.richText} /></p>
        <p className="text-xs text-neutral-400 mt-2">{activeMessage.displayMode === 'message-only' ? 'Message only' : 'Message with timer'}</p>
        <button className="console-button mt-3 w-full" onClick={clearMessage}>Clear stage message</button>
      </div>}
      {(feedback || saved.storageError) && <p role="status" className="text-xs text-amber-300">{saved.storageError || feedback}</p>}
    </div>}
    {resetOpen && <ResetDialog scope="messages" onClose={() => setResetOpen(false)} />}
  </section>;
}
