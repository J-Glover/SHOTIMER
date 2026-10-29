import { DEFAULT_OUTPUT_CUSTOMIZATION } from '../types/timer';
import type { OutputCustomizationMap, OutputViewConfig, OutputElementConfig, OutputRole } from '../types/timer';

export const MAX_LOGO_DATA_LENGTH = 65536;
export const MESSAGE_FLASH_MS = 2400;
export function safeLogoSource(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_LOGO_DATA_LENGTH && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export function stageLogo(config: OutputViewConfig) {
  const logo = config.elements.find(element => element.type === 'logo');
  return logo?.visible && safeLogoSource(logo.customValue) ? logo : undefined;
}
export function flashElapsed(createdAt: number, now: number) {
  return Math.min(MESSAGE_FLASH_MS, Math.max(0, now - createdAt));
}

// Only migrate an untouched legacy stage layout. Keep deliberate visibility/order edits.
export function migrateStageConfig(config: OutputViewConfig): OutputViewConfig {
  if (config.stageLayoutVersion === 1) return config;
  const defaults = DEFAULT_OUTPUT_CUSTOMIZATION.viewer;
  const legacy = defaults.elements.map(element => ['speakerNotes', 'onAirIndicator', 'timeOfDay', 'upNext'].includes(element.type) ? { ...element, visible: true, ...(element.type === 'onAirIndicator' ? { label: 'On Air Indicator' } : {}) } : element);
  const untouched = JSON.stringify(config.elements) === JSON.stringify(legacy);
  return { ...config, stageLayoutVersion: 1, elements: untouched ? structuredClone(defaults.elements) : config.elements };
}

export function normalizeOutputCustomization(input: unknown): OutputCustomizationMap {
  const result = structuredClone(DEFAULT_OUTPUT_CUSTOMIZATION);
  if (!input || typeof input !== 'object') return result;
  for (const role of Object.keys(result) as OutputRole[]) {
    const raw = (input as Record<string, unknown>)[role];
    if (!raw || typeof raw !== 'object') continue;
    const value = role === 'viewer' ? migrateStageConfig(raw as OutputViewConfig) : raw as OutputViewConfig;
    const config = result[role];
    if (typeof value.backgroundColor === 'string' && /^(#[\da-f]{6}|transparent)$/i.test(value.backgroundColor)) config.backgroundColor = value.backgroundColor;
    if (typeof value.blackoutColor === 'string' && /^(#[\da-f]{6}|transparent)$/i.test(value.blackoutColor)) config.blackoutColor = value.blackoutColor;
    if (typeof value.fontFamily === 'string' && value.fontFamily.length <= 80) config.fontFamily = value.fontFamily;
    if (['16:9', '4:3', '9:16', '21:9'].includes(value.aspectRatio)) config.aspectRatio = value.aspectRatio;
    if (Array.isArray(value.elements)) {
      const types = new Set(DEFAULT_OUTPUT_CUSTOMIZATION.viewer.elements.map(element => element.type));
      const seen = new Set<string>();
      config.elements = value.elements.slice(0, 20).filter(element => element && types.has(element.type) && !seen.has(element.type) && !!seen.add(element.type)).map((element, index): OutputElementConfig => ({
        id: typeof element.id === 'string' ? element.id.slice(0, 80) : `${role}-${index}`,
        type: element.type, label: typeof element.label === 'string' ? element.label.slice(0, 80) : element.type,
        visible: element.visible === true,
        order: Number.isFinite(element.order) ? element.order : index,
        ...(element.type === 'logo' ? { customValue: safeLogoSource(element.customValue) ? element.customValue : '', customProps: { size: ['small', 'medium', 'large'].includes(element.customProps?.size) ? element.customProps?.size : 'medium', name: typeof element.customProps?.name === 'string' ? element.customProps.name.slice(0, 80) : 'Stage logo' } }
          : typeof element.customValue === 'string' ? { customValue: element.customValue.slice(0, 200) } : {}),
      }));
    }
    if (role === 'viewer') config.stageLayoutVersion = 1;
  }
  return result;
}

export function guardLogoChanges(current: OutputCustomizationMap, next: OutputCustomizationMap, isPro: boolean) {
  if (isPro) return;
  for (const role of Object.keys(next) as OutputRole[]) {
    const before = current[role].elements.find(element => element.type === 'logo');
    const after = next[role].elements.find(element => element.type === 'logo');
    if (!after?.customValue) continue; // Removing branding is always allowed.
    if (!after.visible && after.customValue === before?.customValue) continue;
    if (after.customValue !== before?.customValue || after.visible !== before?.visible ||
        (after.customProps?.size || 'medium') !== (before?.customProps?.size || 'medium')) throw Error('Logo upload and branding changes require Pro preview access.');
  }
}
