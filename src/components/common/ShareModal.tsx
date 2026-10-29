import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useTimerStore } from '../../store/useTimerStore';
import { getOutputUrl } from '../../utils/outputLinks';
import type { ActiveView } from '../../types/timer';
import { rotateRoomLinks, storedCredentials } from '../../services/liveSync';
import { OUTPUT_ROLES } from '../../utils/outputModel';

interface Props { isOpen: boolean; onClose: () => void; roomName: string }
export default function ShareModal(props: Props) { return props.isOpen ? <SharingSession {...props} /> : null; }
function readSetting(key: string, fallback: string) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function SharingSession({ onClose, roomName }: Props) {
  const roomId = useTimerStore(state => state.roomId);
  const [, refreshLinks] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [role, setRole] = useState<ActiveView>('viewer');
  const [lan, setLan] = useState(() => readSetting('shotimer_use_lan_ip', '') === 'true');
  const [ip, setIp] = useState(() => readSetting('shotimer_lan_ip', '192.168.0.151'));
  const [ipDraft, setIpDraft] = useState(ip);
  const [qr, setQr] = useState({ url: '', data: '' });
  const [qrError, setQrError] = useState('');
  const [feedback, setFeedback] = useState('');
  const linkInput = useRef<HTMLInputElement>(null);
  const ref = useDialogFocus(true, onClose);
  const localhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const base = localhost && lan ? `${window.location.protocol}//${ip}${window.location.port ? `:${window.location.port}` : ''}` : window.location.origin;
  const url = getOutputUrl(roomId, role, base);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#141414', light: '#ffffff' } })
      .then(data => { if (!cancelled) { setQr({ url, data }); setQrError(''); } })
      .catch(() => { if (!cancelled) setQrError('QR code could not be generated. You can still copy or open the link.'); });
    return () => { cancelled = true; };
  }, [url]);
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setFeedback('Link copied.'); }
    catch { linkInput.current?.focus(); linkInput.current?.select(); setFeedback('Automatic copy is unavailable. The link is selected; copy it manually.'); }
  }
  function saveNetwork() {
    const pieces = ipDraft.trim().split('.');
    if (pieces.length !== 4 || pieces.some(piece => !/^\d{1,3}$/.test(piece) || Number(piece) > 255)) { setFeedback('Enter your computer’s IPv4 address, for example 192.168.0.151.'); return; }
    const nextIp = pieces.map(Number).join('.');
    setIp(nextIp); setLan(true); setFeedback('Wi-Fi address applied to this link.');
    try { localStorage.setItem('shotimer_lan_ip', nextIp); localStorage.setItem('shotimer_use_lan_ip', 'true'); } catch { /* The current link still works. */ }
  }
  return <div ref={ref} role="dialog" aria-modal="true" aria-label="Share this room" tabIndex={-1} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><section className="app-dialog-panel console-panel w-full max-w-lg p-5 flex flex-col gap-5">
    <header className="flex justify-between items-start gap-3"><div><h2 className="text-base font-semibold">Share this room</h2><p className="output-note mt-1">{roomName}</p></div><button className="console-icon" onClick={onClose} aria-label="Close sharing"><X size={18} /></button></header>
    <label className="form-label">Choose a view<select className="console-input" value={role} onChange={event => { setRole(event.target.value as ActiveView); setFeedback(''); }}>
      {OUTPUT_ROLES.map(output => <option key={output.id} value={output.id} disabled={!output.available}>{output.label}{!output.available ? ' · Coming soon' : ''}</option>)}<option value="controller">Controller</option>
    </select></label>
    <p className="output-note">{role === 'controller' ? 'This link opens full room controls. Share it only with your operators.' : role === 'moderator' ? 'This link opens speaker notes and tools for sending messages to the stage.' : 'This link opens a display view without playback controls.'} Access is checked by the live server. Changing the view in the address cannot upgrade this link’s permissions. Anyone holding a link can use its granted access.</p>
    {!url && <p role="alert" className="draft-warning">Protected links are available to the originating room manager once the live server is connected. Ask that manager to share a link.</p>}
    {url && <div className="self-center bg-white p-2 rounded-md">{qr.url === url ? <img src={qr.data} alt={`QR code for ${role} in ${roomName}`} width={220} height={220} /> : <div className="w-52 h-52 flex items-center justify-center text-neutral-600 text-xs">{qrError ? 'QR unavailable' : 'Generating QR…'}</div>}</div>}
    {qrError && <p role="alert" className="text-xs text-red-300">{qrError}</p>}
    <label className="form-label">Room link<input ref={linkInput} className="console-input font-mono text-xs" readOnly value={url} onFocus={event => event.currentTarget.select()} /></label>
    <div className="flex gap-2"><button className="console-button primary flex-1" disabled={!url || rotating} onClick={copy}><Copy size={15} />Copy link</button><a className="console-button flex-1" href={url || undefined} aria-disabled={!url || rotating} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Open view</a></div>
    {storedCredentials(roomId)?.manager && <details><summary className="text-xs cursor-pointer">Replace all sharing links…</summary><p className="output-note my-3">Disconnects existing shared screens and operators. They will need new links. This manager stays connected.</p><button className="console-button" disabled={rotating} onClick={async () => { setRotating(true); try { const persisted = await rotateRoomLinks(roomId); refreshLinks(value => value + 1); setFeedback(persisted ? 'Previous links revoked. Share the new links to reconnect your screens.' : 'Links replaced. Browser storage could not save them; copy the new links before closing this session.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Links could not be replaced.'); } finally { setRotating(false); } }}>Replace links and disconnect shared screens</button></details>}
    {localhost && <details><summary className="text-xs text-neutral-400 cursor-pointer">Development: connect a phone on Wi-Fi</summary><div className="mt-3 flex flex-col gap-3"><p className="output-note">Use your computer’s local IPv4 address. The phone must reach the same Shotimer server. A phone cannot connect to your computer using localhost.</p><input className="console-input" aria-label="Computer IPv4 address" value={ipDraft} onChange={event => setIpDraft(event.target.value)} /><div className="flex gap-2"><button className="console-button" onClick={saveNetwork}>Use Wi-Fi address</button><button className="console-button" onClick={() => { setLan(false); try { localStorage.setItem('shotimer_use_lan_ip', 'false'); } catch { /* Session only. */ } }}>Use localhost</button></div></div></details>}
    <p role="status" className="output-note">{feedback}</p>
  </section></div>;
}
