import { DEFAULT_OUTPUT_CUSTOMIZATION } from '../types/timer';
import type { RoomState, OutputViewConfig } from '../types/timer';

export type ResetScope = 'timing' | 'restart' | 'rundown' | 'messages' | 'appearance' | 'room';
export interface ResetOptions {
  roomId: string;
  resetAppearance?: boolean;
  removeLogo?: boolean;
  expectedRundown?: string;
  expectedActiveTimerId?: string | null;
  expectedMessageId?: string | null;
  expectedOutputs?: string;
  expectedResetRevision?: number;
}
export function defaultStageAppearance(current: OutputViewConfig, removeLogo = false): OutputViewConfig {
  const result = structuredClone(DEFAULT_OUTPUT_CUSTOMIZATION.viewer);
  const logo = current.elements.find(element => element.type === 'logo');
  if (logo && !removeLogo) result.elements = result.elements.map(element => element.type === 'logo' ? structuredClone(logo) : element);
  return result;
}
export function roomResetPatch(state: RoomState, scope: ResetScope, options: ResetOptions, now: number): Partial<RoomState> {
  if (state.roomId !== options.roomId) throw Error('The room changed. Close this dialog and review the intended room.');
  if (options.expectedResetRevision !== undefined && options.expectedResetRevision !== (state.resetRevision || 0)) throw Error('This room was reset elsewhere. Close this dialog and review its current state.');
  if (options.expectedRundown !== undefined && options.expectedRundown !== JSON.stringify(state.rundown)) throw Error('The rundown changed while this dialog was open. Close it and review the updated room.');
  if (options.expectedActiveTimerId !== undefined && options.expectedActiveTimerId !== state.activeTimerId) throw Error('The selected timer changed. Close this dialog and review the current timer.');
  if (options.expectedMessageId !== undefined && options.expectedMessageId !== (state.activeMessage?.id || null)) throw Error('A different message is now on stage. Close this dialog and review it before clearing.');
  if (options.expectedOutputs !== undefined && options.expectedOutputs !== JSON.stringify(state.outputCustomization)) throw Error('The display settings changed. Close this dialog and review them again.');
  const revision = Math.max(now, (state.resetRevision || 0) + 1);
  const patch: Partial<RoomState> = { resetRevision: revision };
  if (scope === 'messages' || scope === 'room') Object.assign(patch, { activeMessage: null, messageDraftVersion: String(revision) });
  if (['timing', 'restart', 'rundown', 'room'].includes(scope)) {
    const rundown = scope === 'rundown' || scope === 'room' ? [] : state.rundown;
    const selected = scope === 'timing' ? rundown.find(item => item.id === state.activeTimerId) || rundown[0] : rundown[0];
    Object.assign(patch, { rundown, activeTimerId: selected?.id || null, status: 'stopped', startedAt: null, pausedAt: null, showStartedAt: null, targetDuration: selected?.durationSeconds || 0, timeRemaining: selected?.durationSeconds || 0, elapsedTime: 0, overtimeSeconds: 0, scheduledStartsArmed: false });
    if (scope !== 'timing') patch.rundownResetVersion = String(revision);
  }
  if (scope === 'appearance') patch.outputCustomization = { ...(state.outputCustomization || structuredClone(DEFAULT_OUTPUT_CUSTOMIZATION)), viewer: defaultStageAppearance(state.outputCustomization?.viewer || DEFAULT_OUTPUT_CUSTOMIZATION.viewer, options.removeLogo) };
  if (scope === 'room') {
    patch.blackout = false;
    if (options.resetAppearance) patch.outputCustomization = structuredClone(DEFAULT_OUTPUT_CUSTOMIZATION);
  }
  return patch;
}
