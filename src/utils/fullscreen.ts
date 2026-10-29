type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void | Promise<void>;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };

export function fullscreenElement(doc: Document): Element | null {
  const source = doc as FullscreenDocument;
  return source.fullscreenElement || source.webkitFullscreenElement || null;
}

export async function requestAppFullscreen(doc: Document): Promise<boolean> {
  const source = doc as FullscreenDocument;
  const target = source.documentElement as FullscreenElement;
  if (typeof target.requestFullscreen === 'function' && source.fullscreenEnabled !== false) {
    await target.requestFullscreen({ navigationUI: 'hide' });
    return true;
  }
  if (typeof target.webkitRequestFullscreen === 'function' && source.webkitFullscreenEnabled !== false) {
    await target.webkitRequestFullscreen();
    return true;
  }
  return false;
}

export async function exitAppFullscreen(doc: Document): Promise<void> {
  if (!fullscreenElement(doc)) return;
  const source = doc as FullscreenDocument;
  if (typeof source.exitFullscreen === 'function') await source.exitFullscreen();
  else if (typeof source.webkitExitFullscreen === 'function') await source.webkitExitFullscreen();
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
