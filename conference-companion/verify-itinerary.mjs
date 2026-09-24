import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
for (const file of ['sessions.js', 'itinerary.js', 'timeline.js']) vm.runInContext(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), context);

const sessions = context.window.CONFERENCE_SESSIONS;
const itinerary = context.window.DEFAULT_ITINERARY;
const appSource = fs.readFileSync(new URL('app.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('build.mjs', import.meta.url), 'utf8');
const items = itinerary.items;
const timeline = context.window.CONFERENCE_TIMELINE;
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
const expectNextStatus = (time, expectedState, expectedIds) => {
  const actual = timeline.nextItineraryStatus(sessions, items, new Date(time));
  if (actual.state !== expectedState || JSON.stringify(actual.ids) !== JSON.stringify(expectedIds)) {
    fail(`next timeline status at ${time}: ${JSON.stringify(actual)} !== ${JSON.stringify({ state: expectedState, ids: expectedIds })}`);
  }
};
const expectSessionStatus = (session, time, expectedState) => {
  const actual = timeline.sessionStatus(session, new Date(time));
  if (actual !== expectedState) fail(`session status at ${time}: ${actual} !== ${expectedState}`);
};

expectNextStatus('2026-09-23T09:59:59-07:00', 'next', ['1069']);
expectNextStatus('2026-09-23T10:00:00-07:00', 'next', ['1092']);
expectNextStatus('2026-09-23T10:29:59-07:00', 'next', ['1092']);
expectNextStatus('2026-09-23T10:30:00-07:00', 'next', ['1092']);
expectNextStatus('2026-09-23T10:40:00-07:00', 'next', ['1092']);
expectNextStatus('2026-09-25T17:20:00-07:00', null, []);
const rankedSessions = [
  { id: 'priority-now', starts_at: '2026-09-24T10:00:00-07:00', ends_at: '2026-09-24T11:00:00-07:00' },
  { id: 'attending-now', starts_at: '2026-09-24T10:10:00-07:00', ends_at: '2026-09-24T11:00:00-07:00' },
  { id: 'priority-next', starts_at: '2026-09-24T11:30:00-07:00', ends_at: '2026-09-24T12:00:00-07:00' },
  { id: 'must-next', starts_at: '2026-09-24T11:30:00-07:00', ends_at: '2026-09-24T12:00:00-07:00' },
  { id: 'attending-later', starts_at: '2026-09-24T12:30:00-07:00', ends_at: '2026-09-24T13:00:00-07:00' }
];
const rankedItems = { 'priority-now': 'PRIORITY', 'attending-now': 'ATTENDING', 'priority-next': 'PRIORITY', 'must-next': 'MUST', 'attending-later': 'ATTENDING' };
const rankedCurrent = timeline.happeningNowStatus(rankedSessions, rankedItems, new Date('2026-09-24T10:30:00-07:00'));
if (JSON.stringify(rankedCurrent) !== JSON.stringify({ state: 'now', ids: ['attending-now', 'priority-now'] })) fail(`current tier ordering is incorrect: ${JSON.stringify(rankedCurrent)}`);
const rankedNext = timeline.nextItineraryStatus(rankedSessions, rankedItems, new Date('2026-09-24T10:30:00-07:00'));
if (JSON.stringify(rankedNext) !== JSON.stringify({ state: 'next', ids: ['must-next'] })) fail(`next tier ordering is incorrect: ${JSON.stringify(rankedNext)}`);
const fallbackSessions = [
  { id: 'older', starts_at: '2026-09-24T10:00:00-07:00', ends_at: '2026-09-24T11:00:00-07:00' },
  { id: 'reserved', starts_at: '2026-09-24T10:15:00-07:00', ends_at: '2026-09-24T11:00:00-07:00' },
  { id: 'newest-a', starts_at: '2026-09-24T10:20:00-07:00', ends_at: '2026-09-24T11:00:00-07:00' },
  { id: 'newest-b', starts_at: '2026-09-24T10:20:00-07:00', ends_at: '2026-09-24T11:00:00-07:00' }
];
const fallbackCurrent = timeline.happeningNowStatus(fallbackSessions, { reserved: 'RESERVED' }, new Date('2026-09-24T10:30:00-07:00'));
if (JSON.stringify(fallbackCurrent.ids) !== JSON.stringify(['newest-a', 'newest-b', 'reserved', 'older'])) fail(`live fallback ordering is incorrect: ${JSON.stringify(fallbackCurrent)}`);
const boundarySession = { starts_at: '2026-09-23T10:00:00-07:00', ends_at: '2026-09-23T10:30:00-07:00' };
expectSessionStatus(boundarySession, '2026-09-23T09:59:59-07:00', 'upcoming');
expectSessionStatus(boundarySession, '2026-09-23T10:00:00-07:00', 'now');
expectSessionStatus(boundarySession, '2026-09-23T10:29:59-07:00', 'now');
expectSessionStatus(boundarySession, '2026-09-23T17:30:00Z', 'past');

if (itinerary.version !== 4) fail(`expected itinerary schema version 4, received ${itinerary.version}`);
if (!appSource.includes("const storageKey = 'wad-2026-itinerary-v4'") || !appSource.includes("const legacyStorageKey = 'wad-2026-itinerary-v3'")) fail('v4 storage or v3 migration source is missing');
if (!appSource.includes('[1, 2, 3, 4].includes(value.version)')) fail('backward-compatible itinerary import versions are missing');
if (!appSource.includes("['ATTENDING', 'MUST', 'PRIORITY', 'RESERVED']")) fail('ATTENDING itinerary tier is missing');
if (!indexSource.includes('<!--SITE_AUTH-->')) fail('server auth injection marker is missing');
if (!indexSource.includes('id="manage" type="button" hidden')) fail('editing control is not hidden by default');
if (!indexSource.match(/<nav class="site-switch"[\s\S]*id="now-session"[\s\S]*id="jump-session"[\s\S]*<\/nav>/)) fail('live and next session controls are not in the header navigation');
if (!indexSource.includes('timeline.js?v=2026-09-24-v9') || !indexSource.includes('app.js?v=2026-09-24-v9') || !indexSource.includes('styles.css?v=2026-09-24-v9')) fail('timeline assets or current cache buster are missing');
if (!indexSource.includes('href="/favicon.png"') || !indexSource.includes('href="/apple-touch-icon.png"')) fail('site icon links are missing');
if (!appSource.includes('window.setInterval(refreshForClock, 30_000)')) fail('timeline and past-day refresh interval is missing');
if (!appSource.includes("'Next session'") || !appSource.includes("'No upcoming sessions'") || !appSource.includes('liveStatus.ids.length')) fail('live and next navigation states are missing');
if (!appSource.includes("state.filter = 'all'") || !appSource.includes("state.query = ''")) fail('itinerary navigation does not reveal the full schedule');
if (!appSource.includes('data-toggle-day') || !appSource.includes('expandedPastDays')) fail('past-day collapse controls are missing');
if (!appSource.includes("matchMedia('(prefers-reduced-motion: reduce)')")) fail('itinerary navigation does not honor reduced motion');
if (!appSource.includes("const canEdit = auth.canEdit === true")) fail('owner edit gate is missing');
if (!appSource.includes('canEdit ? readSaved() || cloneBaseline() : cloneBaseline()')) fail('public visitors can load browser-saved overrides');
if (!buildSource.includes("oai-authenticated-user-email") || !buildSource.includes('env?.OWNER_EMAIL')) fail('server-side owner identity check is missing');
if (!buildSource.includes("'cache-control': 'private, no-store, max-age=0'")) fail('authenticated HTML is not protected from caching');
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

const workerSource = fs.readFileSync(new URL('dist/server/index.js', import.meta.url), 'utf8').replace('export default', 'globalThis.worker =');
const workerContext = { Request, Response, URL, Headers };
vm.createContext(workerContext);
vm.runInContext(workerSource, workerContext);
const ownerEmail = 'owner@example.test';
const renderHome = async headers => workerContext.worker.fetch(new Request('https://example.test/', { headers }), { OWNER_EMAIL: ownerEmail });
const anonymousResponse = await renderHome({});
const anonymousHtml = await anonymousResponse.text();
if (!anonymousHtml.includes('"isAuthenticated":false,"canEdit":false')) fail('anonymous visitor receives editing permission');
if (!anonymousResponse.headers.get('cache-control')?.includes('no-store')) fail('anonymous HTML is cacheable');
const faviconResponse = await workerContext.worker.fetch(new Request('https://example.test/favicon.png'), {});
if (faviconResponse.status !== 200 || faviconResponse.headers.get('content-type') !== 'image/png' || (await faviconResponse.arrayBuffer()).byteLength < 1000) fail('favicon is missing or invalid');
const friendHtml = await (await renderHome({ 'oai-authenticated-user-id': 'friend-id', 'oai-authenticated-user-email': 'friend@example.test' })).text();
if (!friendHtml.includes('"isAuthenticated":true,"canEdit":false')) fail('signed-in non-owner receives incorrect permission');
const ownerHtml = await (await renderHome({ 'oai-authenticated-user-id': 'owner-id', 'oai-authenticated-user-email': ownerEmail.toUpperCase() })).text();
if (!ownerHtml.includes('"isAuthenticated":true,"canEdit":true')) fail('signed-in owner does not receive editing permission');

if (failures.length) throw new Error(`Invalid itinerary:\n- ${failures.join('\n- ')}`);
console.log('Itinerary verified: 24 sessions (9 MUST, 11 PRIORITY, 4 RESERVED), no overlaps, and only reserved workshops selected.');
