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

  if (reqPath === '/') reqPath = '/index.html';

  // Serve isolated Coming Soon Website under /website_coming_soon
  if (reqPath.startsWith('/website_coming_soon')) {
    let subPath = reqPath.replace(/^\/website_coming_soon/, '') || '/index.html';
    if (subPath === '/' || subPath === '') subPath = '/index.html';
    const webFilePath = path.join(__dirname, 'website_coming_soon', subPath);
    if (fs.existsSync(webFilePath) && !fs.statSync(webFilePath).isDirectory()) {
      const ext = path.extname(webFilePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      fs.readFile(webFilePath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
      return;
    }
  }

  // Serve isolated Public Marketing Website under /website
  if (reqPath.startsWith('/website')) {
    let subPath = reqPath.replace(/^\/website/, '') || '/index.html';
    if (subPath === '/' || subPath === '') subPath = '/index.html';
    const webFilePath = path.join(__dirname, 'website', subPath);
    if (fs.existsSync(webFilePath) && !fs.statSync(webFilePath).isDirectory()) {
      const ext = path.extname(webFilePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      fs.readFile(webFilePath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
      return;
    }
  }

  let filePath = path.join(DIST_DIR, reqPath);

  // If path doesn't exist or is an SPA route, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Server Error');
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
