import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Bold, CaseUpper, CaseLower, Eraser, Undo2, Redo2, MoreHorizontal } from 'lucide-react';
import { MESSAGE_TEXT_LIMIT, changeMessageCase, contentRuns, formatMessageSelection, insertMessageText, normalizeMessageContent, sliceMessageRuns, messageSelectionColour } from '../../utils/messageFormatting';
import type { MessageContent, TextSelection } from '../../utils/messageFormatting';
import type { FlashMessage } from '../../types/timer';
import MessageColourPalette from './MessageColourPalette';
import { paintMessageEditor, readMessageEditor, restoreMessageSelection } from '../../utils/messageEditorDOM';
import '../../styles/messageEditor.css';

interface Snapshot { content: MessageContent; selection: TextSelection }
export interface MessageEditorHandle { resetAllTextColours: () => void }
interface Props { initialValue: MessageContent; severity: FlashMessage['severity']; onChange: (value: MessageContent) => void; ref?: Ref<MessageEditorHandle> }
export default function MessageEditor({ initialValue, severity, onChange, ref }: Props) {
  const [initial] = useState(() => normalizeMessageContent(initialValue.text, initialValue.richText));
  const [content, setContent] = useState(initial);
  const [selected, setSelected] = useState<TextSelection>({ start: 0, end: 0 });
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [notice, setNotice] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const model = useRef(initial);
  const selection = useRef<TextSelection>({ start: 0, end: 0 });
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const beforeInput = useRef<Snapshot>({ content: initial, selection: { start: 0, end: 0 } });
  const composing = useRef(false);
  useLayoutEffect(() => {
    const editor = root.current;
    if (!editor) return;
    paintMessageEditor(editor, initial);
    const track = () => {
      if (document.activeElement !== editor && !editor.contains(document.activeElement)) return;
      const current = document.getSelection();
      if (!current?.anchorNode || !current.focusNode || !editor.contains(current.anchorNode) || !editor.contains(current.focusNode)) return;
      const range = readMessageEditor(editor, current).selection;
      selection.current = range;
      setSelected(previous => previous.start === range.start && previous.end === range.end ? previous : range);
    };
    document.addEventListener('selectionchange', track);
    return () => document.removeEventListener('selectionchange', track);
  }, [initial]);
  function snapshot(): Snapshot { return { content: model.current, selection: { ...selection.current } }; }
  function publish(value: MessageContent, range: TextSelection) {
    model.current = value; selection.current = range;
    setContent(value); setSelected(range);
    if (root.current) { paintMessageEditor(root.current, value); restoreMessageSelection(root.current, range); }
    setHistoryState({ undo: !!past.current.length, redo: !!future.current.length });
    onChange(value);
  }
  function commit(value: MessageContent, range: TextSelection, previous = snapshot()) {
    if (JSON.stringify(value) !== JSON.stringify(model.current)) {
      past.current = [...past.current.slice(-99), previous]; future.current = [];
    }
    publish(value, range); setNotice('');
  }
  function readInput() {
    if (!root.current || composing.current) return;
    const next = readMessageEditor(root.current, document.getSelection());
    if (next.rawLength > MESSAGE_TEXT_LIMIT) {
      publish(model.current, beforeInput.current.selection);
      setNotice('Messages can contain up to 500 characters. Shorten the message before adding more.');
      return;
    }
    commit(next.content, next.selection, beforeInput.current);
  }
  function undo(redo = false) {
    const from = redo ? future : past;
    const to = redo ? past : future;
    const entry = from.current.pop();
    if (!entry) return;
    to.current.push(snapshot()); publish(entry.content, entry.selection); setNotice('');
  }
  function format(patch: Parameters<typeof formatMessageSelection>[2]) {
    const range = selection.current;
    if (range.end <= range.start) { setNotice('Select the words you want to format, or choose Select all.'); return; }
    commit(formatMessageSelection(model.current, range, patch), range);
  }
  function changeCase(mode: 'upper' | 'lower') {
    const range = selection.current;
    if (range.end <= range.start) return;
    try { const next = changeMessageCase(model.current, range, mode); commit(next.content, next.selection); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'The case change could not be applied.'); }
  }
  function selectAll() {
    const range = { start: 0, end: model.current.text.length };
    selection.current = range; setSelected(range);
    if (root.current) restoreMessageSelection(root.current, range);
  }
  useImperativeHandle(ref, () => ({
    resetAllTextColours: () => commit(formatMessageSelection(model.current, { start: 0, end: model.current.text.length }, { colour: null }), selection.current),
  }));
  const selectedRuns = sliceMessageRuns(contentRuns(content), selected.start, selected.end);
  const hasSelection = selected.end > selected.start;
  const allBold = hasSelection && selectedRuns.every(run => run.bold === true);
  const allNormal = hasSelection && selectedRuns.every(run => run.bold === false);
  const colour = messageSelectionColour(content, selected);
  return <div className="message-editor">
    <div className="message-editor-label"><span id="message-draft-label">Message draft</span><span>{content.text.length}/{MESSAGE_TEXT_LIMIT}</span></div>
    <div ref={root} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-labelledby="message-draft-label" aria-describedby="message-format-help" data-placeholder="Write a cue for the presenter…" spellCheck className={`message-editor-input ${severity}`}
      onBeforeInput={event => {
        beforeInput.current = snapshot();
        const type = (event.nativeEvent as InputEvent).inputType;
        if (type === 'historyUndo' || type === 'historyRedo') { event.preventDefault(); undo(type === 'historyRedo'); }
      }}
      onInput={readInput}
      onCompositionStart={() => { beforeInput.current = snapshot(); composing.current = true; }}
      onCompositionEnd={() => { composing.current = false; readInput(); }}
      onPaste={event => { event.preventDefault(); if (composing.current) return; const next = insertMessageText(model.current, selection.current, event.clipboardData.getData('text/plain')); commit(next.content, next.selection); }}
      onDrop={event => { event.preventDefault(); setNotice('Paste text into the message draft to insert it.'); }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (!(event.ctrlKey || event.metaKey)) return;
        const key = event.key.toLowerCase();
        if (key === 'z') { event.preventDefault(); undo(event.shiftKey); }
        else if (key === 'y') { event.preventDefault(); undo(true); }
        else if (key === 'b') { event.preventDefault(); format({ bold: !allBold }); }
        else if (key === 'a') { event.preventDefault(); selectAll(); }
      }} />
    <div className="message-format-controls" onPointerDown={event => { if (event.target instanceof Element && event.target.closest('button')) event.preventDefault(); }}>
    <div className="message-format-toolbar" role="group" aria-label="Message text formatting">
      <button type="button" title="Select the whole message" disabled={!content.text} onClick={selectAll}>Select all</button>
      <button type="button" title="Bold selected text (Ctrl+B)" aria-label="Bold selected text" aria-pressed={allBold} disabled={!hasSelection} onClick={() => format({ bold: !allBold })}><Bold size={15} /></button>
      <button type="button" title="Normal weight for selected text" aria-pressed={allNormal} disabled={!hasSelection} onClick={() => format({ bold: false })}>Normal</button>
      <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo message edit" disabled={!historyState.undo} onClick={() => undo()}><Undo2 size={15} /></button>
      <button type="button" title="Redo (Ctrl+Y)" aria-label="Redo message edit" disabled={!historyState.redo} onClick={() => undo(true)}><Redo2 size={15} /></button>
      <details className="console-dropdown"><summary className="console-icon" aria-label="More text tools" title="More text tools"><MoreHorizontal size={15} /></summary><div className="console-menu" onClick={event => { if ((event.target as HTMLElement).closest('button')) event.currentTarget.closest('details')?.removeAttribute('open'); }}>
        <button type="button" aria-label="Uppercase selected text" disabled={!hasSelection} onClick={() => changeCase('upper')}><CaseUpper size={18} />Uppercase</button>
        <button type="button" aria-label="Lowercase selected text" disabled={!hasSelection} onClick={() => changeCase('lower')}><CaseLower size={18} />Lowercase</button>
        <button type="button" aria-label="Clear selected text formatting" disabled={!hasSelection} onClick={() => format({ clear: true })}><Eraser size={15} />Clear formatting</button>
      </div></details>
    </div>
    <MessageColourPalette value={colour} disabled={!hasSelection} severity={severity} onChange={value => format({ colour: value })} />
    </div>
    <p id="message-format-help" className="message-format-help">{hasSelection ? 'Colour pots format selected words.' : 'Select words or Select all to format.'}</p>
    {notice && <p role="status" className="message-format-help text-amber-300">{notice}</p>}
  </div>;
}
