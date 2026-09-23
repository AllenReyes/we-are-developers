import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
for (const file of ['sessions.js', 'itinerary.js']) vm.runInContext(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), context);

const sessions = context.window.CONFERENCE_SESSIONS;
const itinerary = context.window.DEFAULT_ITINERARY;
const appSource = fs.readFileSync(new URL('app.js', import.meta.url), 'utf8');
const items = itinerary.items;
const byId = new Map(sessions.map(session => [String(session.id), session]));
const selected = Object.entries(items).map(([id, status]) => ({ id, status, session: byId.get(id) }));

const expected = {
  '1069': ['PRIORITY', 'Making “Works on All Machines” Work for Agent Environments'],
  '1081': ['RESERVED', 'The AI-Ready Developer Environment — Local Setup, Reproducibility, and Docker'],
  '1090': ['RESERVED', "Docker's Agentic Platform: Sandboxes, MCP, and the Infrastructure of Autonomous Development"],
  '1092': ['RESERVED', 'Architecting Multi-Agent Teams: Mastering the Orchestration Patterns of ADK 2'],
  '1103': ['PRIORITY', "Vector, Graph, or Key Value? Choosing Your Agent's Memory"],
  '1117': ['RESERVED', 'Build and deploy a personal agent on a Cloud Run instance'],
  '1151': ['PRIORITY', 'Building the Production Cage for Powerful Agents'],
  '1169': ['MUST', 'Designing High-Performance AI APIs: Lessons from Serving Millions of Real-Time Requests'],
  '1175': ['MUST', 'Running AI-Written Software in Production'],
  '1219': ['PRIORITY', 'Context Engineering Kung Fu'],
  '1229': ['MUST', 'Boring Failover: Predictable Region Recovery Across 5,000 Microservices'],
  '1245': ['PRIORITY', 'Autonomous Infrastructure: Building AI Agents for Global-Scale Capacity Efficiency'],
  '1260': ['MUST', 'The path to Staff Engineer and beyond - staying on the IC train'],
  '1273': ['PRIORITY', 'Testing AI Workflows Locally with Testcontainers'],
  '1276': ['MUST', 'Govern the Runtime, Not the Agent: One Control Plane for Every Model, Every Harness'],
  '1290': ['PRIORITY', 'Reinventing Testing Practices in the AI Era'],
  '1300': ['MUST', 'What Is a Software Factory and How to Build One in 20 Minutes'],
  '1303': ['MUST', 'Designing APIs That Survive AI Agents at Scale'],
  '1310': ['MUST', 'Replay-Safe Architecture: Building Event-Driven Systems That Can Recover With Confidence'],
  '1321': ['PRIORITY', 'The Autonomous Pull Request: Let Agents Ship Without Surrendering Control'],
  '1330': ['PRIORITY', 'Headroom: A Context Optimization Layer for LLM Applications'],
  '1342': ['PRIORITY', 'Look What Java Can Do Now: Live-Coding a GenAI MCP Server with the JAQ Stack'],
  '1351': ['MUST', "Earning the Right to Deploy: Netflix's Approach to Deployment Safety at Scale"],
  '1370': ['PRIORITY', 'Keynote by Angie Jones (VP, Agentic AI Foundation)']
};
const reservedIds = ['1081', '1090', '1092', '1117'];
const excludedIds = [
  '1073', '1079', '1087', '1113', '1130', '1131', '1228',
  '1248', '1269', '1284', '1306', '1323', '1360'
];
const failures = [];
const fail = message => failures.push(message);

if (itinerary.version !== 3) fail(`expected itinerary schema version 3, received ${itinerary.version}`);
if (!appSource.includes("const storageKey = 'wad-2026-itinerary-v3'")) fail('v3 storage key is missing');
if (appSource.includes("localStorage.getItem('wad-2026-itinerary-v2')")) fail('stale v2 local storage can still override the baseline');
if (!appSource.includes('[1, 2, 3].includes(value.version)')) fail('backward-compatible itinerary import versions are missing');
if (selected.length !== 24) fail(`expected 24 selected sessions, received ${selected.length}`);
for (const [id, [status, title]] of Object.entries(expected)) {
  const session = byId.get(id);
  if (!session) fail(`selected session ${id} is missing`);
  else if (session.title !== title) fail(`session ${id} title mismatch: ${JSON.stringify(session.title)} !== ${JSON.stringify(title)}`);
  if (items[id] !== status) fail(`session ${id} status mismatch: ${items[id]} !== ${status}`);
}
for (const { id, session } of selected) if (!session) fail(`itinerary references unknown session ${id}`);
for (const id of excludedIds) {
  if (!byId.has(id)) fail(`removed or conflicting session ${id} is missing from the full schedule`);
  if (items[id]) fail(`removed or conflicting session ${id} remains in the primary itinerary`);
}

const counts = Object.values(items).reduce((result, status) => ({ ...result, [status]: (result[status] || 0) + 1 }), {});
for (const [status, expectedCount] of Object.entries({ MUST: 9, PRIORITY: 11, RESERVED: 4 })) {
  if (counts[status] !== expectedCount) fail(`expected ${expectedCount} ${status}, received ${counts[status] || 0}`);
}
const actualReservedIds = selected.filter(({ status }) => status === 'RESERVED').map(({ id }) => id).sort();
if (JSON.stringify(actualReservedIds) !== JSON.stringify(reservedIds)) fail(`reserved IDs mismatch: ${JSON.stringify(actualReservedIds)}`);
for (const { id, status, session } of selected.filter(({ session }) => session)) {
  if (session.is_workshop && status !== 'RESERVED') fail(`workshop ${id} is recommended as ${status}`);
  if (status === 'RESERVED' && !session.is_workshop) fail(`non-workshop ${id} is marked RESERVED`);
}

const chronological = selected.filter(({ session }) => session).sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
for (let index = 1; index < chronological.length; index += 1) {
  const previous = chronological[index - 1].session;
  const current = chronological[index].session;
  if (previous.starts_at.slice(0, 10) === current.starts_at.slice(0, 10) && current.starts_at < previous.ends_at) {
    fail(`overlap: ${previous.id} ${previous.title} conflicts with ${current.id} ${current.title}`);
  }
}

const cloudRun = byId.get('1117');
if (cloudRun?.starts_at !== '2026-09-24T11:00:00-07:00' || cloudRun?.ends_at !== '2026-09-24T13:00:00-07:00' || cloudRun?.stage !== 'Stage 8') {
  fail('Cloud Run workshop does not match the live agenda time and stage');
}
const designingApis = byId.get('1303');
if (designingApis?.starts_at !== '2026-09-25T16:10:00-07:00' || designingApis?.ends_at !== '2026-09-25T16:40:00-07:00' || designingApis?.stage !== 'Stage 6') {
  fail('Designing APIs live correction is missing');
}

if (failures.length) throw new Error(`Invalid itinerary:\n- ${failures.join('\n- ')}`);
console.log('Itinerary verified: 24 sessions (9 MUST, 11 PRIORITY, 4 RESERVED), no overlaps, and only reserved workshops selected.');
