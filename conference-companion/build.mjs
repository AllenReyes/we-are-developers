import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sessions = fs.readFileSync(path.join(root, 'sessions.js'), 'utf8');
const itinerary = fs.readFileSync(path.join(root, 'itinerary.js'), 'utf8');
const worker = `const INDEX = ${JSON.stringify(index)};\nconst SESSIONS = ${JSON.stringify(sessions)};\nconst ITINERARY = ${JSON.stringify(itinerary)};\n\nexport default {\n  async fetch(request) {\n    const pathname = new URL(request.url).pathname;\n    if (pathname === '/' || pathname === '/index.html') return new Response(INDEX, { headers: { 'content-type': 'text/html; charset=utf-8' } });\n    if (pathname === '/sessions.js') return new Response(SESSIONS, { headers: { 'content-type': 'application/javascript; charset=utf-8' } });\n    if (pathname === '/itinerary.js') return new Response(ITINERARY, { headers: { 'content-type': 'application/javascript; charset=utf-8' } });\n    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });\n  }\n};\n`;
fs.mkdirSync(path.join(root, 'dist', 'server'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'server', 'index.js'), worker);
console.log('Built static companion worker.');
