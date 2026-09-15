import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
for (const file of ['sessions.js', 'itinerary.js']) vm.runInContext(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), context);

const sessions = context.window.CONFERENCE_SESSIONS;
const items = context.window.DEFAULT_ITINERARY.items;
const ids = Object.keys(items);
const missing = ids.filter(id => !sessions.some(session => String(session.id) === id));
const count = tier => Object.values(items).filter(value => value === tier).length;
if (missing.length || ids.length !== 28 || count('MUST') !== 13 || count('PRIORITY') !== 15) {
  throw new Error(`Invalid itinerary: ${JSON.stringify({ total: ids.length, must: count('MUST'), priority: count('PRIORITY'), missing })}`);
}
console.log('Itinerary verified: 28 sessions (13 MUST, 15 PRIORITY).');
