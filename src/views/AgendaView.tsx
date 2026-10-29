import { useOutputSnapshot } from '../hooks/useOutputSnapshot';
import { useWakeLock } from '../hooks/useWakeLock';
import { FullscreenButton } from '../components/common/FullscreenProvider';
import AgendaDisplay from '../components/outputs/AgendaDisplay';
import '../styles/controller.css';

export default function AgendaView({ onBackToController }: { onBackToController?: () => void }) {
  const { state, now } = useOutputSnapshot();
  useWakeLock(true);
  return <main className="output-page">
    <div className="output-toolbar"><span className="output-note">Read-only schedule · {state.cloudSyncStatus === 'connected' ? 'Cloud connected' : 'Local sync'}</span><div>
      <FullscreenButton />{onBackToController && <button className="console-button" onClick={onBackToController}>Controller</button>}
    </div></div>
    <AgendaDisplay state={state} now={now} />
  </main>;
}
