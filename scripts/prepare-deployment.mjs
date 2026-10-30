import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = path.join(workspace, 'dist');
const destination = path.join(workspace, 'website_coming_soon');

// This directory is also published directly by the existing static deployment.
// Refresh its generated pages and assets together after every production build.
// Keep previous assets so already-open tabs can finish loading their old version.
for (const entry of ['index.html', 'app/index.html']) {
  const html = fs.readFileSync(path.join(built, entry), 'utf8');
  const scripts = [...html.matchAll(/<script[^>]+src="(\/assets\/[^"]+)"/g)];
  if (!scripts.length) throw Error(`Missing built application entry in ${entry}`);
  for (const [, asset] of scripts) {
    const file = path.resolve(built, `.${asset}`);
    if (!file.startsWith(built + path.sep) || !fs.existsSync(file)) throw Error(`Missing or invalid built asset: ${asset}`);
  }
}
// Copy assets first and HTML last to avoid publishing pages with missing chunks.
const entries = ['assets', 'favicon.svg', 'icons.svg', 'shotimer-icon-180.png', 'shotimer-icon-192.png', 'shotimer-icon-512.png', 'app', 'index.html'];
for (const entry of entries) {
  fs.cpSync(path.join(built, entry), path.join(destination, entry), { recursive: true });
}
console.log('Updated website_coming_soon with production application entries and assets.');
