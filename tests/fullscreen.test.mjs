import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAppManifest, serveAppManifest } from '../appManifest.mjs';

import { requestAppFullscreen, exitAppFullscreen, fullscreenElement } from '../src/utils/fullscreen.ts';

test('fullscreen requests hide browser navigation and wait for acceptance', async () => {
  let requested;
  const doc = { fullscreenEnabled: true, documentElement: { requestFullscreen: async options => { requested = options; } } };
  assert.equal(await requestAppFullscreen(doc), true);
  assert.deepEqual(requested, { navigationUI: 'hide' });
  // Acceptance alone must not be mistaken for a fullscreenchange event.
  assert.equal(fullscreenElement(doc), null);
});

test('unsupported and denied requests do not claim native fullscreen', async () => {
  assert.equal(await requestAppFullscreen({ documentElement: {} }), false);
  assert.equal(await requestAppFullscreen({ fullscreenEnabled: false, documentElement: { requestFullscreen: () => assert.fail('must not request when disabled') } }), false);
  await assert.rejects(requestAppFullscreen({ documentElement: { requestFullscreen: async () => { throw new Error('Denied'); } } }), /Denied/);
});

test('prefixed Safari fullscreen and exit use the correct receiver', async () => {
  const target = { webkitRequestFullscreen() { assert.equal(this, target); } };
  const doc = { documentElement: target, webkitFullscreenElement: target, webkitExitFullscreen() { assert.equal(this, doc); this.webkitFullscreenElement = null; } };
  assert.equal(await requestAppFullscreen(doc), true);
  assert.equal(fullscreenElement(doc), target);
  await exitAppFullscreen(doc);
  assert.equal(fullscreenElement(doc), null);
});

test('exiting fullscreen is safe when already out, including a browser Escape exit', async () => {
  await exitAppFullscreen({ fullscreenElement: null, exitFullscreen: () => assert.fail('already exited') });
  const doc = { fullscreenElement: {}, exitFullscreen() { this.fullscreenElement = null; } };
  await exitAppFullscreen(doc);
  assert.equal(fullscreenElement(doc), null);
});

test('installed editor and monitor shortcuts preserve separate rooms, views and URL access', () => {
  const monitor = createAppManifest(new URLSearchParams({ room: 'workshop-2', view: 'viewer', access: 'demo-access' }), '/');
  assert.equal(monitor.start_url, '/?room=workshop-2&view=viewer&access=demo-access');
  assert.equal(monitor.id, '/?room=workshop-2&view=viewer');
  assert.equal(monitor.display, 'standalone');
  assert.ok(monitor.display_override.includes('fullscreen'));
  const editor = createAppManifest(new URLSearchParams({ room: 'room-3', view: 'controller' }));
  assert.equal(editor.start_url, '/app/?room=room-3&view=controller');
  assert.notEqual(editor.id, monitor.id);
});

test('manifest middleware serves correct content type and passes other requests through', () => {
  let headers, output;
  assert.equal(serveAppManifest({ url: '/shotimer.webmanifest?room=room-2&view=viewer', headers: { host: 'app.shotimer.io' } }, {
    writeHead(status, values) { assert.equal(status, 200); headers = values; }, end(body) { output = JSON.parse(body); },
  }), true);
  assert.match(headers['Content-Type'], /application\/manifest\+json/);
  assert.equal(output.start_url, '/?room=room-2&view=viewer');
  let passed = false;
  assert.equal(serveAppManifest({ url: '/assets/app.js', headers: {} }, {}, () => { passed = true; }), false);
  assert.equal(passed, true);
});
