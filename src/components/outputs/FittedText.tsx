import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

// Fit the actual rendered text, including long cues and hour-format clocks, to its space.
export default function FittedText({ text, className = '', multiline = false, children, contentKey = '' }: { text: string; className?: string; multiline?: boolean; children?: ReactNode; contentKey?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const container = box.current;
    const span = content.current;
    if (!container || !span) return;
    let frame = 0;
    let disposed = false;
    const fit = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        let low = 1;
        let high = Math.min(height, 900);
        for (let i = 0; i < 12; i++) {
          const size = (low + high) / 2;
          span.style.fontSize = `${size}px`;
          if (span.scrollWidth <= width && span.scrollHeight <= height) low = size;
          else high = size;
        }
        span.style.fontSize = `${Math.max(1, Math.floor(low))}px`;
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    fit();
    void document.fonts?.ready.then(fit);
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); };
  }, [text, multiline, contentKey]);
  return <div ref={box} className={`stage-fit ${multiline ? 'multiline' : ''} ${className}`}><span ref={content}>{children ?? text}</span></div>;
}
