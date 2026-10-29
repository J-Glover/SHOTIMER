import type { MessageTextRun } from '../../types/timer';
import { contentRuns, messageRunStyle } from '../../utils/messageFormatting';

export default function MessageText({ text, richText }: { text: string; richText?: MessageTextRun[] }) {
  return <>{contentRuns({ text, richText }).map((run, index) => <span key={index} style={messageRunStyle(run)}>{run.text}</span>)}</>;
}
