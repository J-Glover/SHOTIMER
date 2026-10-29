import { useEffect, useRef } from 'react';

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], summary, [tabindex="0"]';

export function useDialogFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const candidates = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(element => element.getClientRects().length > 0);
    if (!dialog.contains(document.activeElement)) (candidates()[0] || dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Tab') return;
      // Only the frontmost dialog handles keys when a paywall opens above settings.
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
      const top = dialogs.sort((a, b) => Number(getComputedStyle(a).zIndex) - Number(getComputedStyle(b).zIndex)).at(-1);
      if (top !== dialog) return;
      if (event.key === 'Escape') {
        const menu = dialog.querySelector<HTMLDetailsElement>('details[open]');
        if (menu) { menu.open = false; menu.querySelector<HTMLElement>('summary')?.focus(); event.preventDefault(); event.stopImmediatePropagation(); return; }
        event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); return;
      }
      if (event.key !== 'Tab') return;
      const fields = candidates();
      const first = fields[0];
      const last = fields.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last! : first).focus();
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
