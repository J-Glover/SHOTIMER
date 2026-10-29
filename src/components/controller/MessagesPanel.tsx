import { useRef, useState } from 'react';
import { Bell, BookmarkPlus, Library, MoreHorizontal } from 'lucide-react';
import ResetDialog from '../common/ResetDialog';
import { useTimerStore } from '../../store/useTimerStore';
import { isMessagePreset, useSavedPresets } from '../../hooks/useSavedPresets';
import type { MessagePreset } from '../../hooks/useSavedPresets';
import MessageEditor from './MessageEditor';
import type { MessageEditorHandle } from './MessageEditor';
import MessageText from '../outputs/MessageText';
import { normalizeMessageContent } from '../../utils/messageFormatting';
import MessagePresetLibrary from './MessagePresetLibrary';

const defaults: MessagePreset[] = [
  { text: '5 MIN LEFT', severity: 'info', isFlashing: false },
  { text: '2 MIN — WRAP UP', severity: 'warning', isFlashing: false },
  { text: 'STOP / TIME UP', severity: 'danger', isFlashing: true },
  { text: 'MIC CLOSER PLEASE', severity: 'info', isFlashing: false },
  { text: 'STANDBY', severity: 'info', isFlashing: false },
];
export default function MessagesPanel() {
  const key = useTimerStore(state => `${state.roomId}:${state.messageDraftVersion || ''}`);
  return <MessageComposer key={key} />;
}
function MessageComposer() {
  const activeMessage = useTimerStore(s => s.activeMessage);
  const setMessage = useTimerStore(s => s.setMessage);
  const clearMessage = useTimerStore(s => s.clearMessage);
  const connected = useTimerStore(s => s.cloudSyncStatus === 'connected');
  const [draft, setDraft] = useState<MessagePreset>({ text: '', severity: 'info', isFlashing: false });
  const [editorVersion, setEditorVersion] = useState(0);
  const editor = useRef<MessageEditorHandle>(null);
  const [feedback, setFeedback] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [library, setLibrary] = useState(false);
  const saved = useSavedPresets('shotimer_message_presets_v1', isMessagePreset);
  const visible = activeMessage?.visible;
  function loadPreset(preset: MessagePreset) { setDraft(structuredClone(preset)); setEditorVersion(value => value + 1); setFeedback(''); }
  function saveDraft() {
    const content = normalizeMessageContent(draft.text, draft.richText, true);
    if (!content.text) return;
    if (saved.items.length >= 20 && !saved.items.some(item => item.text === content.text)) { setFeedback('You can save up to 20 messages. Open the library to remove one.'); return; }
    if (saved.save([...saved.items.filter(item => item.text !== content.text), { ...draft, richText: undefined, ...content }])) setFeedback('Preset saved in this browser.');
  }
  return <section className="console-panel messages-panel" aria-label="Stage messages">
    <header className="panel-heading"><h2 className="flex items-center gap-2"><Bell size={16} />Stage messages</h2><details className="console-dropdown"><summary className="console-icon" aria-label="Message options"><MoreHorizontal size={16} /></summary><div className="console-menu message-options"><label className="form-label">Message layout<select className="console-input" value={draft.displayMode || 'with-timer'} onChange={event => setDraft(current => ({ ...current, displayMode: event.target.value as MessagePreset['displayMode'] }))}><option value="with-timer">Message + timer</option><option value="message-only">Message only</option></select></label><label className="customize-check">Flash 3 times<input type="checkbox" checked={draft.isFlashing} onChange={event => setDraft(current => ({ ...current, isFlashing: event.target.checked }))} /></label><p className="output-note">Draft changes stay here until Show on stage. Messages stay visible until cleared. Severity replaces word colours and keeps text weight.</p><hr /><button disabled={!connected} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setResetOpen(true); }}>Clear stage messages…</button></div></details></header>
    <div className="message-body">
      <div className="message-preset-picker"><label className="sr-only" htmlFor="message-preset">Choose a message preset</label><select id="message-preset" className="console-input" value="" onChange={event => { const [group, index] = event.target.value.split('-'); const preset = (group === 'saved' ? saved.items : defaults)[Number(index)]; if (preset) loadPreset(preset); }}><option value="">Choose a preset…</option><optgroup label="Quick messages">{defaults.map((preset, index) => <option key={preset.text} value={`quick-${index}`}>{preset.text}</option>)}</optgroup>{!!saved.items.length && <optgroup label="Your saved messages">{saved.items.map((preset, index) => <option key={preset.text} value={`saved-${index}`}>{preset.text}</option>)}</optgroup>}</select><button className="console-icon" aria-label={`Saved message library (${saved.items.length})`} title="Saved message library" onClick={() => setLibrary(true)}><Library size={16} /></button></div>
      <MessageEditor ref={editor} key={editorVersion} initialValue={draft} severity={draft.severity} onChange={content => setDraft(current => ({ ...current, richText: undefined, ...content }))} />
      <div className="message-severity" aria-label="Message severity">{(['info', 'warning', 'danger'] as const).map(severity => <button key={severity} aria-pressed={draft.severity === severity} className={`severity-button ${draft.severity === severity ? severity : ''}`} title={`Make the whole draft ${severity === 'info' ? 'white' : severity === 'warning' ? 'yellow' : 'red'}; keep text weight`} onClick={() => { editor.current?.resetAllTextColours(); setDraft(current => ({ ...current, severity })); }}>{severity}</button>)}</div>
      <p className="message-option-summary">{draft.displayMode === 'message-only' ? 'Message only' : 'Message + timer'}{draft.isFlashing ? ' · Flash 3 times' : ''} · Draft</p>
      {visible && <div className={`on-stage-message ${activeMessage.severity}`}><details><summary><span className="live-label">On stage</span><span className="cue-summary"><MessageText text={activeMessage.text} richText={activeMessage.richText} /></span></summary><p className="cue-expanded"><MessageText text={activeMessage.text} richText={activeMessage.richText} /></p></details><button className="console-button" disabled={!connected} onClick={clearMessage}>Clear stage message</button></div>}
      {(feedback || saved.storageError) && <p role="status" className="output-note">{saved.storageError || feedback}</p>}
    </div>
    <footer className="message-send"><button className="console-button primary" disabled={!connected || !draft.text.trim()} onClick={() => { setMessage(draft.text, draft.severity, draft.isFlashing, draft.displayMode || 'with-timer', draft.richText); setFeedback(''); }}>Show on stage</button><button className="console-icon" disabled={!draft.text.trim()} title="Save message preset" aria-label="Save message preset" onClick={saveDraft}><BookmarkPlus size={17} /></button></footer>
    {library && <MessagePresetLibrary items={saved.items} onChoose={loadPreset} onRemove={index => saved.save(saved.items.filter((_, current) => current !== index))} onClose={() => setLibrary(false)} />}
    {resetOpen && <ResetDialog scope="messages" onClose={() => setResetOpen(false)} />}
  </section>;
}
