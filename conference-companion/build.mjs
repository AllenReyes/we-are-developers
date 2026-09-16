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
})};\n\nexport default {\n  async fetch(request) {\n    const pathname = new URL(request.url).pathname;\n    const asset = ASSETS[pathname === '/' ? '/index.html' : pathname];\n    return asset ? new Response(asset[0], { headers: { 'content-type': asset[1] } }) : new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });\n  }\n};\n`;
fs.mkdirSync(path.join(root, 'dist', 'server'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'server', 'index.js'), worker);
console.log('Built static companion worker.');
