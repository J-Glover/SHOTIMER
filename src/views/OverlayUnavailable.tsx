import { getOutputUrl } from '../utils/outputLinks';
import { useTimerStore } from '../store/useTimerStore';
import '../styles/controller.css';
export default function OverlayUnavailable() {
  const roomId = useTimerStore(state => state.roomId);
  const viewerUrl = getOutputUrl(roomId, 'viewer');
  const controllerUrl = getOutputUrl(roomId, 'controller');
  return <main className="min-h-dvh flex items-center justify-center p-6"><section className="console-panel max-w-md p-7 flex flex-col gap-4"><p className="output-eyebrow">Coming soon</p><h1 className="text-xl font-semibold">OBS overlay</h1><p className="text-sm text-neutral-400 leading-relaxed">The broadcast overlay is not available in this MVP. Your stage monitor and event schedule are ready to use.</p>{viewerUrl && <a className="console-button primary" href={viewerUrl}>Open stage monitor</a>}{controllerUrl && <a className="console-button" href={controllerUrl}>Return to controller</a>}</section></main>;
}
