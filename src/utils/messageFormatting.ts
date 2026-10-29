import type { FlashMessage, MessageColour, MessageTextRun } from '../types/timer';

export const MESSAGE_TEXT_LIMIT = 500;
export const MESSAGE_COLOURS: Record<MessageColour, string> = { white: '#ffffff', red: '#ff0000', green: '#00ff00', blue: '#0000ff', yellow: '#ffff00' };
export const MESSAGE_SEVERITY_COLOURS: Record<FlashMessage['severity'], string> = { info: MESSAGE_COLOURS.white, warning: MESSAGE_COLOURS.yellow, danger: MESSAGE_COLOURS.red };
export interface TextSelection { start: number; end: number }
export interface MessageContent { text: string; richText?: MessageTextRun[] }
function cleanText(value: string) {
  // Remove unprintable controls while retaining tabs and line breaks.
  // eslint-disable-next-line no-control-regex
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}
export function limitedText(text: string, limit = MESSAGE_TEXT_LIMIT) { return text.slice(0, Math.max(0, limit)).replace(/[\ud800-\udbff]$/, ''); }
export function mergeMessageRuns(runs: MessageTextRun[]): MessageTextRun[] {
  const result: MessageTextRun[] = [];
  for (const raw of runs) {
    const text = cleanText(raw.text);
    if (!text) continue;
    const legacyColour: unknown = raw.colour;
    const colour = legacyColour === 'amber' ? 'yellow' : legacyColour;
    const run: MessageTextRun = { text, ...(typeof raw.bold === 'boolean' ? { bold: raw.bold } : {}), ...(typeof colour === 'string' && Object.hasOwn(MESSAGE_COLOURS, colour) ? { colour: colour as MessageColour } : {}) };
    const previous = result.at(-1);
    if (previous && previous.bold === run.bold && previous.colour === run.colour) previous.text += text;
    else result.push(run);
  }
  return result;
}
export function sliceMessageRuns(runs: MessageTextRun[], start: number, end: number): MessageTextRun[] {
  let offset = 0;
  const result: MessageTextRun[] = [];
  for (const run of runs) {
    const from = Math.max(0, start - offset);
    const to = Math.min(run.text.length, end - offset);
    if (to > from) result.push({ ...run, text: run.text.slice(from, to) });
    offset += run.text.length;
  }
  return mergeMessageRuns(result);
}
export function normalizeMessageContent(text: unknown, richText?: unknown, trim = false): MessageContent {
  const rawText = typeof text === 'string' ? cleanText(text) : '';
  const bounded = limitedText(rawText);
  let runs: MessageTextRun[] = [{ text: bounded }];
  if (Array.isArray(richText) && richText.length <= MESSAGE_TEXT_LIMIT && richText.every(run => run && typeof run === 'object' && typeof run.text === 'string' && run.text.length <= MESSAGE_TEXT_LIMIT)) {
    const safe = mergeMessageRuns(richText);
    if (safe.map(run => run.text).join('') === rawText) runs = sliceMessageRuns(safe, 0, bounded.length);
  }
  const start = trim ? bounded.length - bounded.trimStart().length : 0;
  const end = trim ? bounded.trimEnd().length : bounded.length;
  runs = sliceMessageRuns(runs, start, Math.max(start, end));
  const result = runs.map(run => run.text).join('');
  return { text: result, ...(runs.some(run => typeof run.bold === 'boolean' || run.colour) ? { richText: runs } : {}) };
}
export function contentRuns(content: MessageContent): MessageTextRun[] {
  const safe = normalizeMessageContent(content.text, content.richText);
  return safe.richText || (safe.text ? [{ text: safe.text }] : []);
}
export function isMessageRichText(text: string, raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  const migrated = raw.map(run => run && typeof run === 'object' && run.colour === 'amber' ? { ...run, colour: 'yellow' } : run);
  return JSON.stringify(normalizeMessageContent(text, raw).richText || []) === JSON.stringify(migrated);
}
export function runsContent(runs: MessageTextRun[]): MessageContent {
  const merged = mergeMessageRuns(runs);
  return normalizeMessageContent(merged.map(run => run.text).join(''), merged);
}
export function formatMessageSelection(content: MessageContent, selection: TextSelection, patch: { bold?: boolean; colour?: MessageColour | null; clear?: boolean }): MessageContent {
  const runs = contentRuns(content);
  if (selection.end <= selection.start) return content;
  const middle = sliceMessageRuns(runs, selection.start, selection.end).map(run => {
    if (patch.clear) return { text: run.text };
    const next = { ...run, ...(patch.bold !== undefined ? { bold: patch.bold } : {}) };
    if (patch.colour === null) delete next.colour;
    else if (patch.colour) next.colour = patch.colour;
    return next;
  });
  return runsContent([...sliceMessageRuns(runs, 0, selection.start), ...middle, ...sliceMessageRuns(runs, selection.end, content.text.length)]);
}
export type MessageSelectionColour = MessageColour | 'default' | 'mixed' | null;
export function messageSelectionColour(content: MessageContent, selection: TextSelection): MessageSelectionColour {
  const selected = sliceMessageRuns(contentRuns(content), selection.start, selection.end);
  if (!selected.length) return null;
  return selected.every(run => run.colour === selected[0].colour) ? selected[0].colour || 'default' : 'mixed';
}
export function changeMessageCase(content: MessageContent, selection: TextSelection, mode: 'upper' | 'lower') {
  const runs = contentRuns(content);
  const middle = sliceMessageRuns(runs, selection.start, selection.end).map(run => ({ ...run, text: mode === 'upper' ? run.text.toUpperCase() : run.text.toLowerCase() }));
  const length = middle.reduce((sum, run) => sum + run.text.length, 0);
  if (content.text.length - (selection.end - selection.start) + length > MESSAGE_TEXT_LIMIT) throw Error('That case change would exceed the 500-character limit. Shorten the message first.');
  return { content: runsContent([...sliceMessageRuns(runs, 0, selection.start), ...middle, ...sliceMessageRuns(runs, selection.end, content.text.length)]), selection: { start: selection.start, end: selection.start + length } };
}
export function insertMessageText(content: MessageContent, selection: TextSelection, text: string) {
  const runs = contentRuns(content);
  const available = MESSAGE_TEXT_LIMIT - content.text.length + selection.end - selection.start;
  const inserted = limitedText(cleanText(text), available);
  let offset = 0;
  const marks = runs.find(run => { offset += run.text.length; return offset >= selection.start; });
  return { content: runsContent([...sliceMessageRuns(runs, 0, selection.start), { ...marks, text: inserted }, ...sliceMessageRuns(runs, selection.end, content.text.length)]), selection: { start: selection.start + inserted.length, end: selection.start + inserted.length } };
}
export function messageRunStyle(run: MessageTextRun) {
  return { ...(typeof run.bold === 'boolean' ? { fontWeight: run.bold ? 700 : 400 } : {}), ...(run.colour ? { color: MESSAGE_COLOURS[run.colour] } : {}) };
}
