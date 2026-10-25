// Standalone Local Network (LAN) Server & WebSocket Relay for Shotimer
// Enables wireless remote control from phones/tablets over venue Wi-Fi with 0 internet.

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Find Local LAN IPv4 address (e.g. 192.168.1.x)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url?.split('?')[0] || '/';

  // API: Waitlist Email Submission (Stores to data/waitlist.json)
  if (req.method === 'POST' && reqPath === '/api/waitlist') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const email = (data.email || '').trim().toLowerCase();

        if (!email || !email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email address' }));
          return;
        }

        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        const waitlistFile = path.join(dataDir, 'waitlist.json');
        let list = [];
        if (fs.existsSync(waitlistFile)) {
          try {
            list = JSON.parse(fs.readFileSync(waitlistFile, 'utf8') || '[]');
          } catch {
            list = [];
          }
        }

        const existing = list.find((item) => item.email === email);
        if (!existing) {
          const clientIp = req.socket.remoteAddress || '127.0.0.1';
          list.push({
            email,
            timestamp: new Date().toISOString(),
            ip: clientIp,
          });
          fs.writeFileSync(waitlistFile, JSON.stringify(list, null, 2), 'utf8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: list.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error processing waitlist submission' }));
      }
    });
    return;
  }

  // Clean route mappings
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/pricing') {
    reqPath = '/pricing.html';
  } else if (reqPath === '/features') {
    reqPath = '/features.html';
  } else if (reqPath === '/login') {
    reqPath = '/login.html';
  } else if (reqPath === '/app' || reqPath === '/app/') {
    reqPath = '/app/index.html';
  }

  // If path starts with /app/ and isn't an explicit file with extension, serve app/index.html
  if (reqPath.startsWith('/app/') && !path.extname(reqPath)) {
    reqPath = '/app/index.html';
  }

  // File resolution: check dist, exact workspace path, directory index, then website/public
  let filePath = path.join(DIST_DIR, reqPath);

  // If path is a directory or points to /website_coming_soon/ without filename
  if (reqPath.endsWith('/') || (fs.existsSync(path.join(__dirname, reqPath)) && fs.statSync(path.join(__dirname, reqPath)).isDirectory())) {
    const dirIndex = path.join(__dirname, reqPath, 'index.html');
    if (fs.existsSync(dirIndex)) {
      filePath = dirIndex;
    }
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (reqPath.startsWith('/app')) {
      filePath = path.join(DIST_DIR, 'app', 'index.html');
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'app', 'index.html');
      }
    } else {
      // Find file across possible locations prioritizing exact requested path
      const candidates = [
        path.join(__dirname, reqPath),
        path.join(__dirname, reqPath, 'index.html'),
        path.join(__dirname, 'website', reqPath),
        path.join(__dirname, 'public', reqPath),
        path.join(DIST_DIR, reqPath),
        path.join(DIST_DIR, 'index.html'),
        path.join(__dirname, 'index.html'),
      ];
      const match = candidates.find((c) => fs.existsSync(c) && !fs.statSync(c).isDirectory());
      if (match) {
        filePath = match;
      }
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error(`[Shotimer Server] Failed to read ${filePath}:`, err);
      // Emergency fallback to root index.html
      const emergency = path.join(__dirname, 'index.html');
      if (fs.existsSync(emergency)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(emergency));
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 Server Error: ${err.message}`);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`  🚀 SHOTIMER LOCAL BROADCAST SERVER RUNNING`);
  console.log(`======================================================`);
  console.log(`  Local Computer:       http://localhost:${PORT}/`);
  console.log(`  Coming Soon Page:     http://localhost:${PORT}/website_coming_soon/`);
  console.log(`  Marketing Website:    http://localhost:${PORT}/website/`);
  console.log(`  Venue Wi-Fi (Phones): http://${localIp}:${PORT}/`);
  console.log(`  Confidence Monitor:   http://${localIp}:${PORT}/?view=viewer`);
  console.log(`  Moderator Portal:     http://${localIp}:${PORT}/?view=moderator`);
  console.log(`======================================================\n`);
});
