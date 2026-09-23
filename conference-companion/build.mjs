import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const readText = file => fs.readFileSync(path.join(root, file), 'utf8');
const assets = {
  '/index.html': [readText('index.html'), 'text/html; charset=utf-8'],
  '/recordings': [readText('recordings.html'), 'text/html; charset=utf-8'],
  '/recordings.html': [readText('recordings.html'), 'text/html; charset=utf-8'],
  '/sessions.js': [readText('sessions.js'), 'application/javascript; charset=utf-8'],
  '/itinerary.js': [readText('itinerary.js'), 'application/javascript; charset=utf-8'],
  '/timeline.js': [readText('timeline.js'), 'application/javascript; charset=utf-8'],
  '/styles.css': [readText('styles.css'), 'text/css; charset=utf-8'],
  '/app.js': [readText('app.js'), 'application/javascript; charset=utf-8'],
  '/recordings.js': [readText('recordings.js'), 'application/javascript; charset=utf-8'],
  '/favicon.png': [[...fs.readFileSync(path.join(root, 'favicon.png'))], 'image/png', 'bytes'],
  '/apple-touch-icon.png': [[...fs.readFileSync(path.join(root, 'apple-touch-icon.png'))], 'image/png', 'bytes']
};
const worker = `const ASSETS = ${JSON.stringify(assets)};

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    const assetPath = pathname === '/' ? '/index.html' : pathname;
    const asset = ASSETS[assetPath];
    if (!asset) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (assetPath === '/index.html') {
      const email = request.headers.get('oai-authenticated-user-email') || '';
      const userId = request.headers.get('oai-authenticated-user-id') || '';
      const ownerEmail = env?.OWNER_EMAIL || '';
      const auth = { isAuthenticated: Boolean(userId || email), canEdit: Boolean(email && ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase()) };
      const html = asset[0].replace('<!--SITE_AUTH-->', '<script>window.SITE_AUTH=' + JSON.stringify(auth).replace(/</g, '\\\\u003c') + ';<\\/script>');
      return new Response(html, { headers: { 'content-type': asset[1], 'cache-control': 'private, no-store, max-age=0' } });
    }
    const body = asset[2] === 'bytes' ? new Uint8Array(asset[0]) : asset[0];
    return new Response(body, { headers: { 'content-type': asset[1] } });
  }
};
`;

fs.mkdirSync(path.join(root, 'dist', 'server'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'server', 'index.js'), worker);
console.log('Built static companion worker.');
