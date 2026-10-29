import { useEffect } from 'react';

// Put menus into the browser's top layer so bounded scrolling panels cannot clip them.
export function useConsoleMenus() {
  useEffect(() => {
    const position = (details: HTMLDetailsElement) => {
      const trigger = details.querySelector('summary');
      const menu = details.querySelector<HTMLElement>(':scope > .console-menu');
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Number(menu.dataset.menuWidth) || 270, window.innerWidth - 24);
      menu.style.width = `${width}px`;
      menu.style.position = 'fixed'; menu.style.margin = '0'; menu.style.right = 'auto'; menu.style.bottom = 'auto';
      menu.style.maxHeight = `${Math.max(120, window.innerHeight - 32)}px`; menu.style.overflowY = 'auto';
      menu.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      menu.style.top = `${rect.bottom + 6}px`;
      const height = menu.getBoundingClientRect().height;
      menu.style.top = `${rect.bottom + height + 12 <= window.innerHeight ? rect.bottom + 6 : Math.max(12, rect.top - height - 6)}px`;
    };
    const toggled = (event: Event) => {
      if (!(event.target instanceof HTMLDetailsElement) || !event.target.classList.contains('console-dropdown')) return;
      const details = event.target;
      const menu = details.querySelector<HTMLElement>(':scope > .console-menu');
      if (!menu) return;
      if (details.open) {
        menu.dataset.menuWidth ||= String(Math.round(menu.getBoundingClientRect().width) || 270);
        menu.setAttribute('popover', 'manual');
        menu.showPopover?.(); position(details);
      } else { menu.hidePopover?.(); }
    };
    const reposition = () => document.querySelectorAll<HTMLDetailsElement>('details.console-dropdown[open]').forEach(position);
    document.addEventListener('toggle', toggled, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('toggle', toggled, true); window.removeEventListener('resize', reposition); document.removeEventListener('scroll', reposition, true); };
  }, []);
}
