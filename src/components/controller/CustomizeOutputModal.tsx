import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useOutputSnapshot } from '../../hooks/useOutputSnapshot';
import { useTimerStore } from '../../store/useTimerStore';
import { DEFAULT_OUTPUT_CUSTOMIZATION } from '../../types/timer';
import type { OutputRole, OutputCustomizationMap, OutputElementType, OutputViewConfig } from '../../types/timer';
import { OUTPUT_ROLES, SUPPORTED_ELEMENTS } from '../../utils/outputModel';
import { getOutputUrl } from '../../utils/outputLinks';
import StageDisplay from '../outputs/StageDisplay';
import AgendaDisplay from '../outputs/AgendaDisplay';
import ModeratorSummary from '../outputs/ModeratorSummary';
import { prepareStageLogo } from '../../utils/logoUpload';
import ResetDialog from '../common/ResetDialog';

interface Props { isOpen: boolean; onClose: () => void; initialRole?: OutputRole; onOpenPaywall?: (feature: string) => void }
const labels: Record<OutputElementType, string> = { timer: 'Timer / schedule', segmentTitle: 'Segment title', speaker: 'Speaker name', speakerNotes: 'Speaker notes', progressBar: 'Progress bar', timeOfDay: 'Time of day', upNext: 'Up next', onAirIndicator: 'Playback / schedule status', customText: 'Custom text', logo: 'Logo' };
export default function CustomizeOutputModal(props: Props) { return props.isOpen ? <CustomizerSession {...props} /> : null; }

function CustomizerSession({ onClose, initialRole = 'viewer', onOpenPaywall }: Props) {
  const { state, now } = useOutputSnapshot();
  const [role, setRole] = useState<OutputRole>(initialRole === 'overlay' ? 'viewer' : initialRole);
  const [draft, setDraft] = useState<OutputCustomizationMap>(() => structuredClone(state.outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION));
  const [baseline, setBaseline] = useState(() => structuredClone(state.outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION));
  const [sessionRoom] = useState(state.roomId);
  const [uploading, setUploading] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadGeneration = useRef(0);
  useEffect(() => () => { uploadGeneration.current++; }, []);
  const [portrait, setPortrait] = useState(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const [applied, setApplied] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const dirtyRoles = OUTPUT_ROLES.filter(output => output.available && JSON.stringify(draft[output.id]) !== JSON.stringify(baseline[output.id])).map(output => output.id);
  const close = () => { if (dirtyRoles.length) setDiscard(true); else onClose(); };
  const dialogRef = useDialogFocus(true, close);
  const config = draft[role];
  function update(changes: Partial<OutputViewConfig>) { setDraft(current => ({ ...current, [role]: { ...current[role], ...changes } })); setApplied(false); setDiscard(false); setError(''); }
  function toggle(type: OutputElementType, visible: boolean) {
    const exists = config.elements.some(element => element.type === type);
    update({ elements: exists ? config.elements.map(element => element.type === type ? { ...element, visible } : element) : [...config.elements, { id: `${role}-${type}`, type, label: labels[type], order: config.elements.length, visible, customValue: '' }] });
  }
  function apply() {
    const latest = useTimerStore.getState();
    if (uploading) return;
    if (latest.roomId !== sessionRoom) { setError('The room changed. Close and reopen customization.'); return; }
    if (dirtyRoles.some(id => JSON.stringify(latest.outputCustomization[id]) !== JSON.stringify(baseline[id]))) { setError('An output changed on another console. Reload that output before applying your draft.'); return; }
    try {
      const updates = Object.fromEntries(dirtyRoles.map(id => [id, structuredClone(draft[id])])) as Partial<OutputCustomizationMap>;
      latest.applyOutputConfigs(updates);
      const saved = useTimerStore.getState().outputCustomization;
      setBaseline(structuredClone(saved)); setDraft(structuredClone(saved)); setApplied(true); setDiscard(false); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Changes could not be saved in this browser. Your live output has not been replaced.'); }
  }
  async function uploadLogo(file?: File) {
    if (!file || !state.isProUser) return;
    const generation = ++uploadGeneration.current;
    setUploading(true); setError('');
    try {
      const source = await prepareStageLogo(file);
      if (generation !== uploadGeneration.current) return;
      if (useTimerStore.getState().roomId !== sessionRoom || !useTimerStore.getState().isProUser) throw Error('Room or Pro access changed. Reopen customization before uploading.');
      setDraft(current => {
        const config = current.viewer;
        const logo = config.elements.find(element => element.type === 'logo');
        const replacement = { ...(logo || { id: 'el-logo', type: 'logo' as const, label: 'Stage logo', order: 8 }), visible: true, customValue: source, customProps: { size: logo?.customProps?.size || 'medium', name: file.name.slice(0, 80) } };
        return { ...current, viewer: { ...config, elements: logo ? config.elements.map(element => element.type === 'logo' ? replacement : element) : [...config.elements, replacement] } };
      });
      setApplied(false); setDiscard(false);
    } catch (reason) { if (generation === uploadGeneration.current) setError(reason instanceof Error ? reason.message : 'The logo could not be prepared.'); }
    finally { if (generation === uploadGeneration.current) setUploading(false); }
  }
  const customText = config.elements.find(element => element.type === 'customText');
  const logo = config.elements.find(element => element.type === 'logo');
  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Customize output" tabIndex={-1} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6">
    <section className="customize-dialog">
      <header className="customize-header"><div><h2 className="text-base font-semibold">Customize output</h2><p className="output-note mt-1">{state.roomName} · Preview changes before applying them to connected screens.</p></div><button className="console-icon" onClick={close} aria-label="Close customization"><X size={18} /></button></header>
      <div className="customize-body"><div className="customize-canvas">
        <div className="customize-tabs" role="tablist" aria-label="Output type">{OUTPUT_ROLES.map(output => <button key={output.id} role="tab" aria-selected={role === output.id} disabled={!output.available} className="console-button" onClick={() => { setRole(output.id); setError(''); }}>{output.label}{!output.available ? ' · Coming soon' : ''}</button>)}</div>
        <div className="flex justify-between items-center gap-2 flex-wrap mb-3"><label className="text-xs text-neutral-400 flex items-center gap-2">Preview screen<select className="console-input !w-auto !text-xs" value={portrait ? 'portrait' : 'landscape'} onChange={event => setPortrait(event.target.value === 'portrait')}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>{getOutputUrl(state.roomId, role) && <a className="console-button" href={getOutputUrl(state.roomId, role)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Open live output</a>}</div>
        <div className={`output-preview ${portrait ? 'portrait' : 'landscape'}`} aria-label="Draft output preview">{role === 'viewer' ? <StageDisplay state={state} now={now} config={config} /> : role === 'agenda' ? <AgendaDisplay state={state} now={now} config={config} /> : <ModeratorSummary state={state} now={now} config={config} />}</div>
        <p className="output-note mt-3">This is the same display used by the live output. Screen shape affects this preview only. Fullscreen keeps this layout; the separate Timer only switch hides details and branding on that device.</p>
        {role === 'moderator' && <p className="output-note mt-2">The message composer stays available to moderators; these settings control the stage summary.</p>}
      </div><aside className="customize-sidebar">
        <div><h3 className="console-label mb-2">Visible content</h3>{SUPPORTED_ELEMENTS[role].filter(type => type !== 'customText').map(type => {
          const element = config.elements.find(value => value.type === type);
          return <label className="customize-check" key={type}>{labels[type]}<input type="checkbox" checked={element?.visible ?? true} onChange={event => toggle(type, event.target.checked)} /></label>;
        })}</div>
        {role === 'viewer' && <section className="flex flex-col gap-3"><div className="flex justify-between items-center gap-2"><h3 className="console-label">Top-left logo · Pro</h3>{!state.isProUser && <button className="text-xs text-amber-300 underline" onClick={() => onOpenPaywall?.('Stage logo upload')}>Unlock preview</button>}</div>
          <p className="output-note">PNG, JPG or WebP, up to 2 MB. Transparent PNG or WebP works best. Saved per room when you Apply.</p>
          <input ref={uploadInput} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={event => { void uploadLogo(event.target.files?.[0]); event.target.value = ''; }} />
          <button className="console-button" disabled={!state.isProUser || uploading} onClick={() => uploadInput.current?.click()}>{uploading ? 'Preparing logo…' : !state.isProUser ? 'Logo upload · Pro only' : logo?.customValue ? 'Replace logo' : 'Upload logo'}</button>
          {logo?.customValue && <fieldset disabled={!state.isProUser || uploading} className="flex flex-col gap-2 disabled:opacity-50"><label className="customize-check">Show logo<input type="checkbox" checked={logo.visible} onChange={event => toggle('logo', event.target.checked)} /></label><label className="form-label">Logo size<select className="console-input" value={logo.customProps?.size || 'medium'} onChange={event => update({ elements: config.elements.map(element => element.type === 'logo' ? { ...element, customProps: { ...element.customProps, size: event.target.value } } : element) })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label><button className="console-button" onClick={() => update({ elements: config.elements.map(element => element.type === 'logo' ? { ...element, visible: false, customValue: '', customProps: {} } : element) })}>Remove logo</button></fieldset>}
          <p className="output-note">Branding stays clear of the timer. Message-only mode and blackout hide the logo.</p>
        </section>}
        <div><div className="flex items-center justify-between gap-2 mb-3"><h3 className="console-label">Appearance</h3>{!state.isProUser && <button className="text-xs text-amber-300 underline" onClick={() => onOpenPaywall?.('Custom output appearance')}>Pro preview</button>}</div>
          {!state.isProUser && <p className="output-note mb-3">Basic content switches are free. Custom colours, fonts and layout order are reserved for Pro.</p>}
          <fieldset disabled={!state.isProUser} className="flex flex-col gap-3 disabled:opacity-50">
            <label className="form-label">Background<input aria-label="Output background" type="color" className="w-full h-9" value={config.backgroundColor} onChange={event => update({ backgroundColor: event.target.value })} /></label>
            {role === 'viewer' && <label className="form-label">Blackout colour<input aria-label="Blackout colour" type="color" className="w-full h-9" value={config.blackoutColor} onChange={event => update({ blackoutColor: event.target.value })} /></label>}
            <label className="form-label">Font<select className="console-input" value={config.fontFamily === 'Inter' ? 'Inter' : 'JetBrains Mono'} onChange={event => update({ fontFamily: event.target.value })}><option>Inter</option><option>JetBrains Mono</option></select></label>
            <label className="customize-check">Custom text<input type="checkbox" checked={customText?.visible ?? false} onChange={event => toggle('customText', event.target.checked)} /></label>
            {customText?.visible && <textarea className="console-input" aria-label="Custom output text" maxLength={200} value={customText.customValue || ''} onChange={event => update({ elements: config.elements.map(element => element.id === customText.id ? { ...element, customValue: event.target.value } : element) })} />}
            {role === 'viewer' && <div><p className="console-label mb-2">Content order</p>{[...config.elements].filter(element => element.visible && SUPPORTED_ELEMENTS.viewer.includes(element.type)).sort((a, b) => a.order - b.order).map(element => <div className="flex items-center gap-1 py-1" key={element.id}><span className="text-xs flex-1">{labels[element.type]}</span>{([-1, 1] as const).map(direction => <button key={direction} className="console-icon" aria-label={`Move ${labels[element.type]} ${direction < 0 ? 'up' : 'down'}`} onClick={() => { const elements = [...config.elements].sort((a, b) => a.order - b.order); const index = elements.findIndex(value => value.id === element.id); const target = index + direction; if (target < 0 || target >= elements.length) return; [elements[index], elements[target]] = [elements[target], elements[index]]; update({ elements: elements.map((value, order) => ({ ...value, order })) }); }}>{direction < 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button>)}</div>)}</div>}
          </fieldset>
        </div>
        <p className="output-note">The timer stays central and the logo stays top-left. Header and footer items keep their own space. Free-position canvas editing is not available.</p>
        <button className="console-button" onClick={() => update(structuredClone(DEFAULT_OUTPUT_CUSTOMIZATION[role]))}>Preview defaults for this output</button>
        {role === 'viewer' && <button className="console-button" disabled={uploading || !!dirtyRoles.length} title={dirtyRoles.length ? 'Apply or discard your draft changes first' : 'Review and reset the live stage appearance'} onClick={() => setResetOpen(true)}>Reset live stage appearance…</button>}
        <button className="console-button" disabled={uploading} onClick={() => { const latest = useTimerStore.getState().outputCustomization[role]; setBaseline(current => ({ ...current, [role]: structuredClone(latest) })); setDraft(current => ({ ...current, [role]: structuredClone(latest) })); setError(''); setDiscard(false); }}>Reload this output from live</button>
      </aside></div>
      <footer className="customize-footer"><div role="status" className="text-xs text-neutral-400">{error ? <span className="text-red-300">{error}</span> : discard ? <span className="text-amber-300">Discard your unapplied changes?</span> : applied ? 'Applied to this room. Remote screens update when connected.' : dirtyRoles.length ? `${dirtyRoles.length} output draft${dirtyRoles.length > 1 ? 's' : ''} · Live screens unchanged` : 'No unapplied changes'}</div><div className="flex gap-2"><button className="console-button" onClick={discard ? onClose : close}>{discard ? 'Discard changes' : 'Cancel'}</button><button className="console-button primary" disabled={!dirtyRoles.length || uploading} onClick={apply}>Apply to live screens</button></div></footer>
    </section>
    {resetOpen && <ResetDialog scope="appearance" onClose={() => setResetOpen(false)} onComplete={() => { const current = structuredClone(useTimerStore.getState().outputCustomization); setBaseline(current); setDraft(structuredClone(current)); setApplied(true); }} />}
  </div>;
}
