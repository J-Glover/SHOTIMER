import type { MessageTextRun } from '../types/timer';
import { MESSAGE_COLOURS, contentRuns, messageRunStyle, runsContent } from './messageFormatting';
import type { MessageContent, TextSelection } from './messageFormatting';

// Read supported text/marks only. Raw editor HTML is never stored or broadcast.
export function readMessageEditor(root: HTMLElement, selection: Selection | null) {
  const runs: MessageTextRun[] = [];
  let length = 0;
  let anchor: number | undefined;
  let focus: number | undefined;
  const add = (text: string, marks: Omit<MessageTextRun, 'text'>) => { if (text) { runs.push({ text, ...marks }); length += text.length; } };
  const boundary = (node: Node, offset: number) => {
    if (selection?.anchorNode === node && selection.anchorOffset === offset) anchor = length;
    if (selection?.focusNode === node && selection.focusOffset === offset) focus = length;
  };
  const block = (node: Node) => node instanceof HTMLElement && ['DIV', 'P', 'LI'].includes(node.tagName);
  function walk(node: Node, inherited: Omit<MessageTextRun, 'text'>) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (selection?.anchorNode === node) anchor = length + Math.min(selection.anchorOffset, text.length);
      if (selection?.focusNode === node) focus = length + Math.min(selection.focusOffset, text.length);
      add(text, inherited); return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'SVG'].includes(node.tagName)) return;
    const marks = { ...inherited };
    if (node.dataset.bold === 'true' || node.tagName === 'B' || node.tagName === 'STRONG') marks.bold = true;
    if (node.dataset.bold === 'false') marks.bold = false;
    const colour = node.dataset.colour === 'amber' ? 'yellow' : node.dataset.colour;
    if (colour && Object.hasOwn(MESSAGE_COLOURS, colour)) marks.colour = colour as MessageTextRun['colour'];
    if (node.tagName === 'BR') {
      // Browsers use a trailing BR as a caret placeholder after a real line break.
      if ((node.parentNode?.childNodes.length === 1) || (!node.nextSibling && node.previousSibling instanceof HTMLElement && node.previousSibling.tagName === 'BR')) return;
      add('\n', marks); return;
    }
    const children = [...node.childNodes];
    children.forEach((child, index) => {
      if (block(child) && index > 0 && !block(children[index - 1])) add('\n', inherited);
      boundary(node, index);
      walk(child, marks);
      boundary(node, index + 1);
      if (block(child) && index < children.length - 1) add('\n', inherited);
    });
    if (!children.length) boundary(node, 0);
  }
  walk(root, {});
  const content = runsContent(runs);
  const from = Math.min(anchor ?? length, content.text.length);
  const to = Math.min(focus ?? length, content.text.length);
  return { content, rawLength: length, selection: { start: Math.min(from, to), end: Math.max(from, to) } };
}

export function paintMessageEditor(root: HTMLElement, content: MessageContent) {
  const nodes = contentRuns(content).map(run => {
    if (run.bold === undefined && !run.colour) return document.createTextNode(run.text);
    const span = document.createElement('span');
    if (run.bold !== undefined) span.dataset.bold = String(run.bold);
    if (run.colour) span.dataset.colour = run.colour;
    const style = messageRunStyle(run);
    if (style.fontWeight) span.style.fontWeight = String(style.fontWeight);
    if (style.color) span.style.color = style.color;
    span.textContent = run.text;
    return span;
  });
  root.replaceChildren(...nodes);
}

export function restoreMessageSelection(root: HTMLElement, selection: TextSelection) {
  const length = root.textContent?.length || 0;
  const start = Math.max(0, Math.min(selection.start, length));
  const end = Math.max(start, Math.min(selection.end, length));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  const point = (offset: number): [Node, number] => {
    let remaining = offset;
    for (const node of nodes) { if (remaining <= node.length) return [node, remaining]; remaining -= node.length; }
    return [root, root.childNodes.length];
  };
  const range = document.createRange();
  range.setStart(...point(start)); range.setEnd(...point(end));
  root.focus({ preventScroll: true });
  const selected = document.getSelection();
  selected?.removeAllRanges(); selected?.addRange(range);
}
