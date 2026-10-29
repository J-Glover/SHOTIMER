import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

// Separate origin and temporary relay storage: no real rooms or Supabase access.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'shotimer-ui-review-'));
process.env.SHOTIMER_LIVE_DATA_DIR = directory;
const server = await createServer({
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('disabled-for-tests'), 'import.meta.env.VITE_CONTROLLER_FIXTURE': 'true' },
  server: { host: '127.0.0.1', port: 5176, strictPort: true, ws: { port: 24776 } },
});
await server.listen();
console.log('Isolated controller review: http://localhost:5176/tests/fixtures/controller.html');
console.log('Use ?view=controller for the console, &cue=1 for a long live cue, &long=1 for a 40-segment Pro fixture.');
async function close() { await server.close(); process.exit(0); }
process.once('SIGINT', close); process.once('SIGTERM', close);
