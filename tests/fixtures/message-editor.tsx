// This fixture never imports the timer store or transmits messages to live rooms.
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import MessageEditor from '../../src/components/controller/MessageEditor';
import type { MessageEditorHandle } from '../../src/components/controller/MessageEditor';
import StageDisplay from '../../src/components/outputs/StageDisplay';
import { normalizeMessageContent } from '../../src/utils/messageFormatting';
import type { MessageContent } from '../../src/utils/messageFormatting';
import { restoreMessageSelection } from '../../src/utils/messageEditorDOM';
import type { OutputSnapshot } from '../../src/utils/outputModel';
import type { FlashMessage, TimerItem } from '../../src/types/timer';
import '../../src/index.css';

const timer: TimerItem = { id: 'fixture', title: 'Local formatting preview', speaker: 'No live room connected', durationSeconds: 600, order: 0, type: 'countdown', autoStartNext: false, thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: false }, sounds: { soundOnYellow: false, soundOnRed: false, soundOnFinish: false, chimeStyle: 'soft_bell', volume: 0 } };
export default function Fixture() {
  const [initial] = useState<MessageContent>({ text: 'Hello world' });
  const [draft, setDraft] = useState(initial);
  const editorHandle = useRef<MessageEditorHandle>(null);
  const [severity, setSeverity] = useState<FlashMessage['severity']>('info');
  const latest = useRef(initial);
  const [message, setMessage] = useState<FlashMessage | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [result, setResult] = useState('');
  const update = (content: MessageContent) => { latest.current = content; setDraft(content); };
  const tick = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  async function runChecks() {
    try {
      const editor = document.querySelector<HTMLElement>('[role="textbox"]')!;
      const button = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
      restoreMessageSelection(editor, { start: 0, end: 5 }); await tick();
      button('Bold selected text').click(); await tick();
      if (latest.current.richText?.[0].bold !== true) throw Error('Bold selection failed');
      button('Uppercase selected text').click(); await tick();
      if (latest.current.text !== 'HELLO world') throw Error('Uppercase selection failed');
      button('Colour selected text red').click(); await tick();
      if (latest.current.richText?.[0].colour !== 'red') throw Error('Colour selection failed');
      button('Undo message edit').click(); await tick();
      if (latest.current.richText?.[0].colour) throw Error('Undo failed');
      button('Redo message edit').click(); await tick();
      if (latest.current.richText?.[0].colour !== 'red') throw Error('Redo failed');
      button('Use default message colour').click(); await tick();
      if (latest.current.richText?.[0].colour || latest.current.richText?.[0].bold !== true) throw Error('Default colour changed bold formatting');
      button('Undo message edit').click(); await tick();
      restoreMessageSelection(editor, { start: 0, end: latest.current.text.length }); await tick();
      if (document.querySelector('.message-colour-status')?.textContent !== 'Mixed colours') throw Error('Mixed selection status missing');
      if (document.querySelector('.message-colour-swatches [aria-pressed="true"]')) throw Error('Mixed colours selected a single colour pot');
      const beforeOverride = latest.current.text;
      document.querySelector<HTMLButtonElement>('[data-severity="info"]')!.click(); await tick();
      if (latest.current.text !== beforeOverride || latest.current.richText?.some(run => run.colour)) throw Error('Info did not override all word colours');
      if (latest.current.richText?.[0].bold !== true) throw Error('Info removed bold');
      button('Colour selected text blue').click(); await tick();
      document.querySelector<HTMLButtonElement>('[data-severity="danger"]')!.click(); await tick();
      if (latest.current.richText?.some(run => run.colour)) throw Error('Danger did not override blue');
      document.querySelector<HTMLButtonElement>('[data-severity="info"]')!.click(); await tick();
      if (message) throw Error('Draft unexpectedly sent');
      const safe = normalizeMessageContent(latest.current.text, latest.current.richText, true);
      setMessage({ ...safe, id: 'local', severity: 'info', isFlashing: false, visible: true, createdAt: 0 }); await tick();
      const fits = [...document.querySelectorAll<HTMLElement>('.stage-fit')].every(box => { const text = box.firstElementChild as HTMLElement; return text.scrollWidth <= box.clientWidth + 1 && text.scrollHeight <= box.clientHeight + 1; });
      if (!fits) throw Error('Rendered text overflows');
      setResult('PASS · colour pots, whole-message Info/Danger overrides, bold preserved, undo/redo and fitted local output.');
    } catch (error) { setResult(`FAIL · ${String(error)}`); }
  }
  const state: OutputSnapshot = { roomId: 'fixture', roomName: 'Isolated fixture', rundown: [timer], activeTimerId: timer.id, status: 'paused', targetDuration: 600, timeRemaining: 495, elapsedTime: 105, overtimeSeconds: 0, startedAt: null, activeMessage: message, blackout: false, theme: { darkMode: true, oledBlack: false, accentColor: '#10b981', fontFamily: 'mono', showProgressBar: true, showTimeOfDay: false, showUpNext: false } };
  return <main style={{ padding: 24, background: '#141414', color: '#eee', minHeight: '100dvh', fontFamily: 'sans-serif' }}><h1>Isolated message editor checks</h1><p style={{ margin: '10px 0', fontSize: 13 }}>Formatting here stays on this page. No live rooms or cloud connection.</p><div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 24 }}><section style={{ width: 400, maxWidth: '100%' }}><MessageEditor ref={editorHandle} initialValue={initial} severity={severity} onChange={update} /><div style={{ display: 'flex', gap: 12, marginTop: 12 }}>{(['info', 'warning', 'danger'] as const).map(value => <button key={value} data-severity={value} onClick={() => { editorHandle.current?.resetAllTextColours(); setSeverity(value); }}>{value}</button>)}</div><div style={{ display: 'flex', gap: 12, margin: '16px 0', flexWrap: 'wrap' }}><button onClick={() => { const safe = normalizeMessageContent(draft.text, draft.richText, true); setMessage({ ...safe, id: 'local', severity: 'info', visible: true, isFlashing: false, createdAt: 0 }); }}>Show locally</button><button onClick={runChecks}>Run checks from initial text</button><label><input type="checkbox" checked={portrait} onChange={event => setPortrait(event.target.checked)} />Portrait preview</label></div><output role="status">{result}</output></section><section style={{ position: 'relative', width: portrait ? 390 : 850, maxWidth: '100%', height: portrait ? 700 : 480 }}><StageDisplay state={state} now={10000} /></section></div></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
