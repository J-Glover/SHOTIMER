// Local visual regression fixture. Imports the real display; no store, live room or cloud connection.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StageDisplay from '../../src/components/outputs/StageDisplay';
import { DEFAULT_OUTPUT_CUSTOMIZATION } from '../../src/types/timer';
import type { TimerItem, FlashMessage } from '../../src/types/timer';
import type { OutputSnapshot } from '../../src/utils/outputModel';
import { prepareStageLogo } from '../../src/utils/logoUpload';
import '../../src/index.css';

const timer: TimerItem = { id: 'visual-test', order: 0, title: 'Opening & Welcome', speaker: 'Alex Morgan', notes: 'These internal notes must stay hidden by default.', durationSeconds: 600, type: 'countdown', thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true }, sounds: { soundOnYellow: false, soundOnRed: false, soundOnFinish: false, chimeStyle: 'soft_bell', volume: 0 }, autoStartNext: false };
export default function Fixture() {
  const [scene, setScene] = useState('normal');
  const [portrait, setPortrait] = useState(false);
  const [clean, setClean] = useState(false);
  const [source, setSource] = useState('');
  const [size, setSize] = useState('medium');
  const [result, setResult] = useState('');
  const config = structuredClone(DEFAULT_OUTPUT_CUSTOMIZATION.viewer);
  Object.assign(config.elements.find(element => element.type === 'logo')!, { visible: !!source, customValue: source, customProps: { size, name: 'Sample event logo' } });
  const messages: Record<string, string> = { short: 'HELLO', long: 'Please welcome our next speaker. After the presentation, we will take questions from the audience. Thank you for keeping to the schedule.', only: 'WRAP UP' };
  const message: FlashMessage | null = messages[scene] ? { id: scene, text: messages[scene], severity: scene === 'only' ? 'danger' : 'info', visible: true, isFlashing: false, createdAt: 0, displayMode: scene === 'only' ? 'message-only' : 'with-timer' } : null;
  const state: OutputSnapshot = { roomId: 'isolated-fixture', roomName: 'Visual checks', rundown: [{ ...timer, type: scene === 'clock' ? 'clock' : 'countdown' }], activeTimerId: timer.id, status: 'paused', timeRemaining: scene === 'overtime' ? -125 : 495, elapsedTime: scene === 'overtime' ? 725 : 105, targetDuration: 600, overtimeSeconds: scene === 'overtime' ? 125 : 0, activeMessage: message, blackout: scene === 'blackout', startedAt: null, theme: { darkMode: true, oledBlack: false, accentColor: '#10b981', fontFamily: 'mono', showProgressBar: true, showTimeOfDay: false, showUpNext: false } };
  async function sampleLogo() {
    try { const blob = await (await fetch('/shotimer-icon-192.png')).blob(); setSource(await prepareStageLogo(new File([blob], 'sample-event.png', { type: 'image/png' }))); setResult('Sample logo prepared by the upload pipeline.'); }
    catch (error) { setResult(String(error)); }
  }
  function check() {
    const fits = [...document.querySelectorAll<HTMLElement>('.stage-fit')].every(box => { const text = box.firstElementChild as HTMLElement; return text.scrollWidth <= box.clientWidth + 1 && text.scrollHeight <= box.clientHeight + 1; });
    const timer = document.querySelector('.stage-timer')?.getBoundingClientRect();
    const message = document.querySelector('.stage-message')?.getBoundingClientRect();
    const separate = !timer || !message || timer.bottom <= message.top;
    const image = document.querySelector<HTMLImageElement>('.stage-logo');
    setResult(fits && separate && (!image || (image.complete && image.naturalWidth > 0)) ? 'PASS · text fits, timer/message do not overlap, logo decodes.' : 'FAIL · inspect the display.');
  }
  return <main style={{ minHeight: '100dvh', background: '#303030', color: '#eee', fontFamily: 'sans-serif' }}>
    <div style={{ padding: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}><strong>Isolated stage display</strong><label>Scene <select style={{ background: '#202020', padding: 6 }} value={scene} onChange={event => { setScene(event.target.value); setResult(''); }}>{[['normal', 'Normal timer'], ['short', 'Short message'], ['long', 'Long message'], ['only', 'Message only'], ['overtime', 'Overtime'], ['clock', 'Wall clock'], ['blackout', 'Blackout']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><input type="checkbox" checked={portrait} onChange={event => { setPortrait(event.target.checked); setResult(''); }} /> Portrait phone</label><label><input type="checkbox" checked={clean} onChange={event => setClean(event.target.checked)} /> Timer only</label><button onClick={sampleLogo}>Load sample logo</button><label>Logo size <select style={{ background: '#202020' }} value={size} onChange={event => setSize(event.target.value)}>{['small', 'medium', 'large'].map(value => <option key={value}>{value}</option>)}</select></label><button onClick={check}>Check layout</button><output aria-live="polite">{result}</output></div>
    <div style={{ position: 'relative', width: portrait ? 'min(390px, 100vw)' : '100%', height: 'calc(100dvh - 100px)', maxHeight: portrait ? 780 : undefined, margin: '0 auto' }}><StageDisplay state={state} now={new Date('2026-10-28T14:30:00').getTime()} config={config} clean={clean} /></div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
