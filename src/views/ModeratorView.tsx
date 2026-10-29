import { useOutputSnapshot } from '../hooks/useOutputSnapshot';
import { useWakeLock } from '../hooks/useWakeLock';
import { FullscreenButton } from '../components/common/FullscreenProvider';
import ModeratorSummary from '../components/outputs/ModeratorSummary';
import MessagesPanel from '../components/controller/MessagesPanel';
import '../styles/controller.css';

export default function ModeratorView({ onBackToController }: { onBackToController?: () => void }) {
  const { state, now } = useOutputSnapshot();
  useWakeLock(true);
  return <main className="output-page">
    <header className="output-page-heading"><div><p className="output-eyebrow">{state.roomName}</p><h1>Stage cues & messages</h1></div><div className="flex gap-2 flex-wrap">
      <FullscreenButton />{onBackToController && <button className="console-button" onClick={onBackToController}>Controller</button>}
    </div></header>
    <div className="moderator-layout"><ModeratorSummary state={state} now={now} /><MessagesPanel key={state.roomId} /></div>
    <p className="output-note mt-5">Messages are sent to the stage only when you choose Show on stage. Audience question submissions are not available in this version.</p>
  </main>;
}
