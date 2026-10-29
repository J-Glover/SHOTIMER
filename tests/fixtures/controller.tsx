import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '../../src/index.css';

export function LayoutReport() {
  const [report, setReport] = useState('');
  function check() {
    const selectors = ['.console-header', '.monitor-card .transport-primary', '.rundown-summary', '.messages-panel .message-send', '.screens-button', '.console-menu:popover-open'];
    const values = selectors.map(selector => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element || !element.getClientRects().length) return `${selector}: hidden`;
      const rect = element.getBoundingClientRect();
      return `${selector}: ${rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1 ? 'fits' : 'OUTSIDE'} (${Math.round(rect.top)}–${Math.round(rect.bottom)})`;
    });
    setReport(`${innerWidth} × ${innerHeight}; body ${document.documentElement.scrollWidth} × ${document.documentElement.scrollHeight}\n${values.join('\n')}`);
  }
  return <div style={{ position: 'fixed', bottom: 4, right: 4, zIndex: 100, maxWidth: 'calc(100vw - 8px)', maxHeight: '35dvh', overflow: 'auto', fontSize: 11, color: '#fff', background: '#151515' }}><button onClick={check}>Check layout</button>{report && <><pre style={{ whiteSpace: 'pre-wrap' }}>{report}</pre><button onClick={() => setReport('')}>Close report</button></>}</div>;
}

if (!import.meta.env.VITE_CONTROLLER_FIXTURE) {
  createRoot(document.getElementById('root')!).render(<p>Run npm run preview:controller to use the isolated controller fixture.</p>);
} else {
  const params = new URLSearchParams(location.search);
  const timer = (index: number) => ({ id: `fixture-${index}`, order: index, title: ['Opening and welcome to the annual production conference', 'Panel discussion: the future of live production', 'Closing remarks and audience questions'][index % 3], speaker: ['Alex Morgan', 'Casey and the production panel', 'Jordan Taylor'][index % 3], notes: 'Fixture speaker cue', durationSeconds: 600, type: 'countdown', scheduledStartTime: index === 0 ? '20:00' : undefined, autoStartNext: false, thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true }, sounds: { soundOnYellow: false, soundOnRed: false, soundOnFinish: false, chimeStyle: 'soft_bell', volume: .8 } });
  const variant = params.has('long') ? 'long' : 'normal';
  if (sessionStorage.getItem('shotimer_fixture_seeded') !== variant) {
    localStorage.removeItem('shotimer_live_access_room-1');
    localStorage.setItem('shotimer_rundown_room-1', JSON.stringify(Array.from({ length: params.has('long') ? 40 : 3 }, (_, index) => timer(index))));
    localStorage.setItem('shotimer_rundown_room-2', '[]');
    localStorage.setItem('shotimer_room_controls_room-1', JSON.stringify({ scheduledStartsArmed: false }));
    localStorage.setItem('shotimer_timer_presets_v1', '[]');
    localStorage.setItem('shotimer_is_pro', String(params.has('long')));
    localStorage.setItem('shotimer_message_presets_v1', JSON.stringify(Array.from({ length: 20 }, (_, index) => ({ text: `Saved cue ${index + 1} — please welcome our next speaker`, severity: 'info', isFlashing: false }))));
    sessionStorage.setItem('shotimer_fixture_seeded', variant);
  }
  const { default: App } = await import('../../src/App');
  const { useTimerStore } = await import('../../src/store/useTimerStore');
  if (params.has('cue')) {
    const send = () => useTimerStore.getState().setMessage('PLEASE WRAP UP — THE NEXT SPEAKER IS READY. Thank you for a wonderful presentation and please hand back to the moderator.', 'warning', false);
    if (useTimerStore.getState().cloudSyncStatus === 'connected') send();
    else { const unsub = useTimerStore.subscribe(state => { if (state.cloudSyncStatus === 'connected') { unsub(); send(); } }); }
  }
  createRoot(document.getElementById('root')!).render(<><App /><LayoutReport /></>);
}
