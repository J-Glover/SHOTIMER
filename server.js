// Standalone Local Network (LAN) Server & Broadcast Relay for Shotimer
// Enables wireless remote control from phones/tablets over venue Wi-Fi with 0 internet.
// Hardened with canonical path confinement, DoS protection, IP rate limiting, and security headers.

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve(__dirname, 'dist');
const WEBSITE_DIR = path.resolve(__dirname, 'website');
const WEBSITE_COMING_SOON_DIR = path.resolve(__dirname, 'website_coming_soon');
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const APP_DIR = path.resolve(__dirname, 'app');

// Explicitly permitted root public files
const ALLOWED_ROOT_FILES = new Set([
  path.resolve(__dirname, 'index.html'),
  path.resolve(__dirname, 'pricing.html'),
  path.resolve(__dirname, 'features.html'),
  path.resolve(__dirname, 'login.html'),
]);

// Directories allowed to be served
const ALLOWED_DIRECTORIES = [
  DIST_DIR,
  WEBSITE_DIR,
  WEBSITE_COMING_SOON_DIR,
  PUBLIC_DIR,
  APP_DIR,
];

// Helper: Ensure target canonical path is strictly inside allowed directory or approved file
function isPathAllowed(targetPath) {
  const resolved = path.resolve(targetPath);

  // Check if directly an allowed root file
  if (ALLOWED_ROOT_FILES.has(resolved)) {
    return true;
  }

  // Check if inside any allowed directory
  for (const dir of ALLOWED_DIRECTORIES) {
    const rel = path.relative(dir, resolved);
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      // Disallow hidden files, env files, git files, or sensitive extensions
      const basename = path.basename(resolved);
      if (
        basename.startsWith('.') ||
        basename.endsWith('.env') ||
        basename.endsWith('.sql') ||
        basename.endsWith('.jsonl') ||
        basename.endsWith('.config.ts') ||
        basename.endsWith('.config.js')
      ) {
        return false;
      }
      return true;
    }
  }

  return false;
}

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
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

// Rate limiter: 5 waitlist requests per 10 minutes per IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_BODY_SIZE = 16 * 1024; // 16 KB max payload

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

// Clean up stale rate limit entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 15 * 60 * 1000);

const server = http.createServer((req, res) => {
  // Apply Broadcast Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // OBS Overlay & Stage Monitors require iframe embedding capability for broadcast tools.
  // Controller / Management views are framed safely with SAMEORIGIN.
  const fullUrl = req.url || '/';
  if (!fullUrl.includes('view=overlay')) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }

  // Parse and sanitize requested path
  let rawPath = '/';
  try {
    rawPath = decodeURIComponent(req.url?.split('?')[0] || '/');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('400 Bad Request');
    return;
  }

  // Disallow null bytes or path control sequences
  if (rawPath.includes('\0') || rawPath.includes('%00')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('400 Bad Request: Invalid characters');
    return;
  }

  // Defend against path traversal
  if (rawPath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Path traversal prohibited');
    return;
  }

  let reqPath = rawPath;

  // ----------------------------------------------------------------------------
  // API: Waitlist Email Submission (Stores to data/waitlist.json with DoS defense)
  // ----------------------------------------------------------------------------
  if (req.method === 'POST' && reqPath === '/api/waitlist') {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';

    if (!checkRateLimit(clientIp)) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': '600',
      });
      res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
      return;
    }

    let body = '';
    let bodyLength = 0;
    let limitExceeded = false;

    req.on('data', (chunk) => {
      if (limitExceeded) return;
      bodyLength += chunk.length;
      if (bodyLength > MAX_BODY_SIZE) {
        limitExceeded = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large. Maximum size is 16KB.' }));
        req.resume();
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      if (limitExceeded) return;

      try {
        const data = JSON.parse(body || '{}');
        const email = String(data.email || '').trim().toLowerCase();

        // Strict RFC 5322-compliant email regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

        if (!email || email.length > 100 || !emailRegex.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email address format' }));
          return;
        }

        const dataDir = path.resolve(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        const waitlistFile = path.resolve(dataDir, 'waitlist.json');
        let list = [];
        if (fs.existsSync(waitlistFile)) {
          try {
            list = JSON.parse(fs.readFileSync(waitlistFile, 'utf8') || '[]');
            if (!Array.isArray(list)) list = [];
          } catch {
            list = [];
          }
        }

        const existing = list.find((item) => item.email === email);
        if (!existing) {
          list.push({
            email,
            timestamp: new Date().toISOString(),
            ip: clientIp,
          });
          fs.writeFileSync(waitlistFile, JSON.stringify(list, null, 2), 'utf8');
        }

        // Asynchronously sync subscriber to Supabase Cloud Database
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yodcnmzgmjcjgxizcowm.supabase.co';
        const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable__L0Nx0Gr4xTdpxZrAq0veA_6de4-j8E';

        fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            ip: clientIp,
            source: 'website_coming_soon',
          }),
        }).catch((err) => {
          console.warn('[Waitlist] Supabase sync note:', err?.message || err);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: list.length }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  // ----------------------------------------------------------------------------
  // Multi-Domain Virtual Host Routing
  // ----------------------------------------------------------------------------
  const hostHeader = (req.headers.host || '').toLowerCase().split(':')[0];
  const isAppDomain =
    hostHeader === 'app.shotimer.io' ||
    hostHeader.startsWith('app.') ||
    (req.url && req.url.includes('__app=1'));

  // On App subdomain, strictly block search engines from crawling
  if (isAppDomain) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  // Dynamic robots.txt
  if (reqPath === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    if (isAppDomain) {
      res.end("User-agent: *\nDisallow: /\n");
    } else {
      res.end("User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /api/\nSitemap: https://shotimer.io/sitemap.xml\n");
    }
    return;
  }

  // Dynamic sitemap.xml
  if (reqPath === '/sitemap.xml') {
    const sitemapFile = path.resolve(WEBSITE_COMING_SOON_DIR, 'sitemap.xml');
    if (fs.existsSync(sitemapFile)) {
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      fs.createReadStream(sitemapFile).pipe(res);
      return;
    }
  }

  // ----------------------------------------------------------------------------
  // Route Resolution: App Subdomain vs Coming Soon Public Website
  // ----------------------------------------------------------------------------
  const hasExt = Boolean(path.extname(reqPath));
  let candidates = [];

  if (isAppDomain) {
    // --------------------------------------------------------------------------
    // SUBDOMAIN: app.shotimer.io (The Broadcast App)
    // --------------------------------------------------------------------------
    const sanitizedRel = reqPath.replace(/^\/+/, '');

    if (!hasExt) {
      candidates.push(path.resolve(DIST_DIR, 'app', 'index.html'));
      candidates.push(path.resolve(APP_DIR, 'index.html'));
    }

    candidates.push(
      path.resolve(DIST_DIR, sanitizedRel),
      path.resolve(PUBLIC_DIR, sanitizedRel),
      path.resolve(APP_DIR, sanitizedRel),
      path.resolve(DIST_DIR, sanitizedRel, 'index.html')
    );
  } else {
    // --------------------------------------------------------------------------
    // ROOT DOMAIN: shotimer.io / www.shotimer.io (Coming Soon Site)
    // --------------------------------------------------------------------------
    // If someone visits /app on the main domain, redirect to app.shotimer.io on live host
    if (reqPath === '/app' || reqPath.startsWith('/app/')) {
      if (hostHeader.includes('shotimer.io')) {
        const queryPart = req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        res.writeHead(302, { Location: `https://app.shotimer.io/${queryPart}` });
        res.end();
        return;
      }
      // On local dev, allow accessing app via /app/
      reqPath = '/app/index.html';
      candidates.push(
        path.resolve(DIST_DIR, 'app', 'index.html'),
        path.resolve(APP_DIR, 'index.html')
      );
    } else if (reqPath === '/' || reqPath === '' || reqPath === '/index.html') {
      reqPath = '/index.html';
      candidates.push(path.resolve(WEBSITE_COMING_SOON_DIR, 'index.html'));
    } else if (reqPath === '/pricing' || reqPath === '/pricing.html') {
      candidates.push(path.resolve(WEBSITE_COMING_SOON_DIR, 'pricing.html'));
    } else if (reqPath === '/features' || reqPath === '/features.html') {
      candidates.push(path.resolve(WEBSITE_COMING_SOON_DIR, 'features.html'));
    } else if (reqPath === '/login' || reqPath === '/login.html') {
      candidates.push(path.resolve(WEBSITE_COMING_SOON_DIR, 'login.html'));
    }

    const sanitizedRel = reqPath.replace(/^\/+/, '');
    candidates.push(
      path.resolve(WEBSITE_COMING_SOON_DIR, sanitizedRel),
      path.resolve(WEBSITE_COMING_SOON_DIR, sanitizedRel, 'index.html'),
      path.resolve(PUBLIC_DIR, sanitizedRel),
      path.resolve(DIST_DIR, sanitizedRel),
      path.resolve(WEBSITE_DIR, sanitizedRel)
    );

    // Fallback to Coming Soon index for extension-less root routes
    if (!hasExt && !reqPath.startsWith('/app')) {
      candidates.push(path.resolve(WEBSITE_COMING_SOON_DIR, 'index.html'));
    }
  }

  let selectedFile = null;

  for (const candidate of candidates) {
    if (isPathAllowed(candidate) && fs.existsSync(candidate)) {
      try {
        if (!fs.statSync(candidate).isDirectory()) {
          selectedFile = candidate;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // If no allowed static file resolved
  if (!selectedFile) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // Double check authorization
  if (!isPathAllowed(selectedFile)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(selectedFile).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(selectedFile, (err, content) => {
    if (err) {
      console.error('[Shotimer Server] File read error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`  🚀 SHOTIMER MULTI-DOMAIN BROADCAST SERVER RUNNING`);
  console.log(`======================================================`);
  console.log(`  Public Domain (Coming Soon):  http://shotimer.io/`);
  console.log(`  App Subdomain (Live Studio):  http://app.shotimer.io/`);
  console.log(`  Local Coming Soon Preview:    http://localhost:${PORT}/`);
  console.log(`  Local App Studio Preview:     http://localhost:${PORT}/app/`);
  console.log(`  Venue Wi-Fi (Phones/LAN):     http://${localIp}:${PORT}/app/`);
  console.log(`  Stealth Studio Passkey:       SHOTIMER-ALPHA-2026`);
  console.log(`======================================================\n`);
});

