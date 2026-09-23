import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sessions = fs.readFileSync(path.join(root, 'sessions.js'), 'utf8');
const itinerary = fs.readFileSync(path.join(root, 'itinerary.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const worker = `const ASSETS = ${JSON.stringify({
  '/index.html': [index, 'text/html; charset=utf-8'],
  '/sessions.js': [sessions, 'application/javascript; charset=utf-8'],
  '/itinerary.js': [itinerary, 'application/javascript; charset=utf-8'],
  '/styles.css': [styles, 'text/css; charset=utf-8'],
  '/app.js': [app, 'application/javascript; charset=utf-8']
})};\n\nexport default {\n  async fetch(request, env) {\n    const pathname = new URL(request.url).pathname;\n    const assetPath = pathname === '/' ? '/index.html' : pathname;\n    const asset = ASSETS[assetPath];\n    if (!asset) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });\n    if (assetPath === '/index.html') {\n      const email = request.headers.get('oai-authenticated-user-email') || '';\n      const userId = request.headers.get('oai-authenticated-user-id') || '';\n      const ownerEmail = env?.OWNER_EMAIL || '';\n      const auth = { isAuthenticated: Boolean(userId || email), canEdit: Boolean(email && ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase()) };\n      const html = asset[0].replace('<!--SITE_AUTH-->', '<script>window.SITE_AUTH=' + JSON.stringify(auth).replace(/</g, '\\\\u003c') + ';<\\/script>');\n      return new Response(html, { headers: { 'content-type': asset[1], 'cache-control': 'private, no-store, max-age=0' } });\n    }\n    return new Response(asset[0], { headers: { 'content-type': asset[1] } });\n  }\n};\n`;
fs.mkdirSync(path.join(root, 'dist', 'server'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'server', 'index.js'), worker);
console.log('Built static companion worker.');
