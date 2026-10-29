const views = new Map([
  ['controller', 'Editor'], ['viewer', 'Stage Monitor'], ['agenda', 'Agenda'], ['moderator', 'Moderator'], ['overlay', 'OBS Overlay'],
]);

// Each installed shortcut keeps the room and view that the operator is using.
export function createAppManifest(params, appPath = '/app/') {
  const rawRoom = params.get('room') || 'room-1';
  const room = rawRoom.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'room-1';
  const view = views.has(params.get('view')) ? params.get('view') : 'controller';
  const identity = new URLSearchParams({ room, view });
  const launch = new URLSearchParams(identity);
  const access = params.get('access') || params.get('key');
  if (access && access.length <= 128) launch.set('access', access);
  return {
    id: `${appPath}?${identity}`,
    name: `Shotimer ${views.get(view)}`,
    short_name: view === 'viewer' ? 'Stage Timer' : 'Shotimer',
    description: 'Live event timer and production rundown',
    start_url: `${appPath}?${launch}`,
    scope: '/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    background_color: '#141414',
    theme_color: '#141414',
    icons: [
      { src: '/shotimer-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/shotimer-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}

export function serveAppManifest(req, res, next) {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname !== '/shotimer.webmanifest') { next?.(); return false; }
  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(createAppManifest(url.searchParams, host.startsWith('app.') ? '/' : '/app/')));
  return true;
}
