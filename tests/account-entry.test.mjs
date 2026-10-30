import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const oauthCalls = [];
globalThis.__shotimerAuthTest = {
  auth: {
    signInWithOAuth: async options => { oauthCalls.push(options); return { error: null }; },
    getSession: async () => { throw Error('Storage unavailable'); },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
};
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  plugins: [{
    name: 'isolated-auth-client',
    enforce: 'pre',
    load(id) {
      if (id.replaceAll('\\', '/').endsWith('/src/lib/supabase.ts')) return 'export const supabase = globalThis.__shotimerAuthTest; export const isSupabaseConfigured = true; export const supabaseUrl = "https://auth.example.test"; export const supabaseAnonKey = "test-publishable-key";';
    },
  }],
});
const { needsApplication, mountApplication } = await vite.ssrLoadModule('/src/utils/applicationEntry.ts');
const { dashboardAccess, oauthReturnError } = await vite.ssrLoadModule('/src/utils/accountAccess.ts');
const { loginWithGoogle, subscribeToAuthState } = await vite.ssrLoadModule('/src/services/authService.ts');
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; delete globalThis.__shotimerAuthTest; await vite.close(); });

test('static homepage recognises dashboard and OAuth returns without requiring a redirect', () => {
  for (const [search, hash] of [
    ['?view=dashboard&auth=login', ''], ['?view=dashboard', '#access_token=example&refresh_token=example'],
    ['?code=example', ''], ['', '#error=access_denied&error_description=Denied'],
    ['', '#access_token=example'], ['?room=show&view=viewer', '#token=example'],
  ]) assert.equal(needsApplication(search, hash), true);
  for (const [search, hash] of [['', ''], ['?utm_source=event', '#features'], ['', '#faq']]) assert.equal(needsApplication(search, hash), false);
});

function fakeDocument() {
  const order = [];
  const element = () => ({ children: [], setAttribute() {}, replaceChildren(...children) { this.children = children; } });
  const document = {
    body: { className: 'marketing', replaceChildren(root) { this.root = root; order.push('root'); } },
    documentElement: { classList: { add() {} } },
    querySelectorAll: () => [{ remove() { order.push('remove-public-css'); } }],
    createElement: element,
  };
  return { document, order };
}

test('static entry creates React root and removes marketing styles before loading the app', async () => {
  const { document, order } = fakeDocument();
  await mountApplication(document, async () => {
    order.push('load-app');
    assert.equal(document.body.root.id, 'root');
    assert.equal(document.body.className, '');
  });
  assert.deepEqual(order, ['remove-public-css', 'root', 'load-app']);
});

test('failed application download shows an actionable error instead of an empty page', async () => {
  const { document } = fakeDocument();
  await mountApplication(document, async () => { throw Error('Missing deployed chunk'); });
  assert.match(document.body.root.children[0].textContent, /could not load/);
  assert.equal(document.body.root.children[1].textContent, 'Refresh Shotimer');
});

test('dashboard waits for session restoration, requires login, and keeps reset links usable', () => {
  assert.equal(dashboardAccess(true, false, 'login'), 'loading');
  assert.equal(dashboardAccess(false, false, null), 'login');
  assert.equal(dashboardAccess(false, true, 'login'), 'ready');
  assert.equal(dashboardAccess(false, true, null), 'ready');
  assert.equal(dashboardAccess(false, true, 'reset'), 'reset');
  assert.match(oauthReturnError('', '#error=access_denied&error_description=Consent+declined'), /Consent declined/);
  assert.equal(oauthReturnError('?view=dashboard', '#access_token=example'), '');
});

test('disabled Google provider keeps user on the sign-in form; enabled provider uses root callback', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ external: { google: false } }));
  assert.match((await loginWithGoogle()).error, /not enabled/);
  assert.equal(oauthCalls.length, 0);
  globalThis.fetch = async () => new Response(JSON.stringify({ external: { google: true } }));
  assert.equal((await loginWithGoogle()).error, undefined);
  assert.equal(oauthCalls[0].options.redirectTo, 'https://shotimer.io/?view=dashboard');
});

test('session restoration failure returns signed-out state rather than hanging forever', async () => {
  const received = new Promise(resolve => { subscribeToAuthState(resolve); });
  assert.equal(await received, null);
});
