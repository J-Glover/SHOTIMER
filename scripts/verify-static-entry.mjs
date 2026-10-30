// Exercise the actual built public router with a static-host document, bypassing
// Vite/Node's query-aware routing. Authentication uses no real account or token.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const built = path.resolve('website_coming_soon');
const html = fs.readFileSync(path.join(built, 'index.html'), 'utf8');
const entry = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
assert.ok(entry, 'Published homepage must include its built router');

for (const [search, hash, expected] of [
  ['?view=dashboard&auth=login', '', 1],
  ['?view=dashboard', '#access_token=isolated-example&refresh_token=isolated-example', 1],
  ['?code=isolated-example', '', 1],
  ['', '#error=access_denied&error_description=Denied', 1],
  ['', '#features', 0],
]) {
  let loaded = 0;
  const links = [];
  const location = { search, hash };
  const document = {
    documentElement: { classList: { add() {} } },
    body: { className: '', replaceChildren(root) { this.root = root; } },
    querySelectorAll: () => [], querySelector: () => null,
    getElementsByTagName: () => links,
    createElement: () => ({ setAttribute() {}, addEventListener(event, listener) { if (event === 'load') queueMicrotask(listener); } }),
    head: { appendChild(link) { assert.ok(fs.existsSync(path.join(built, new URL(link.href).pathname))); links.push(link); } },
  };
  const context = vm.createContext({ document, window: { location, dispatchEvent() {} }, URLSearchParams, URL, Event, console });
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(built, entry), 'utf8'), {
    context, identifier: `https://shotimer.io${entry}`,
    initializeImportMeta(meta) { meta.url = `https://shotimer.io${entry}`; },
    async importModuleDynamically(specifier) {
      assert.ok(fs.existsSync(path.join(built, new URL(specifier, `https://shotimer.io${entry}`).pathname)));
      assert.equal(document.body.root?.id, 'root');
      assert.equal(location.search, search); assert.equal(location.hash, hash);
      loaded++;
      const app = new vm.SyntheticModule(['t'], function () { this.setExport('t', {}); }, { context });
      await app.link(() => {}); await app.evaluate(); return app;
    },
  });
  // The preload polyfill is unrelated to route selection; stub only that module.
  await module.link(async specifier => {
    assert.match(specifier, /modulepreload-polyfill/);
    assert.ok(fs.existsSync(path.join(built, new URL(specifier, `https://shotimer.io${entry}`).pathname)));
    return new vm.SyntheticModule([], () => {}, { context });
  });
  await module.evaluate();
  for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(loaded, expected, `Built entry failed for ${search}${hash}`);
}
console.log('Built static homepage loads dashboard/OAuth entries, preserves callback data, and leaves marketing links alone.');
