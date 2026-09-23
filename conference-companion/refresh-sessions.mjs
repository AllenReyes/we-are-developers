import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'conference-schedule-raw-data.json'), 'utf8')).data;
const generatedPath = path.join(import.meta.dirname, 'sessions.js');
const existingSource = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, 'utf8') : '';
const existingSessions = existingSource ? JSON.parse(existingSource.replace(/^window\.CONFERENCE_SESSIONS=/, '').replace(/;\s*$/, '')) : [];
const existingOfficialUrls = new Map(existingSessions.map(session => [session.id, session.official_url]));
const directoryUrl = 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions';
const load = url => fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } }).then(response => {
  if (!response.ok) throw new Error(`Could not load official session directory (${response.status})`);
  return response.text();
});
const firstPage = await load(directoryUrl);
const pageCount = Math.max(1, ...[...firstPage.matchAll(/[?&]page=(\d+)/g)].map(([, page]) => Number(page)));
const html = [firstPage, ...(await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => load(`${directoryUrl}?page=${index + 2}`))))].join('\n');

// The official directory gives every session its stable, human-readable URL.
const normalizeTitle = value => value
  .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '');
const officialUrls = new Map([...html.matchAll(/aria-label="Open session ([^"]+)"[\s\S]{0,1200}?href="([^"]+)"/g)]
  .map(([, title, href]) => [normalizeTitle(title), new URL(href, directoryUrl).href]));

// The event app is authoritative for late agenda changes that postdate the source export.
const liveCorrections = new Map([
  [1117, {
    title: 'Build and deploy a personal agent on a Cloud Run instance',
    description: "How do you run an autonomous AI agent in the cloud 24/7 without wasting a fortune or managing servers? If you are building long-running agents, you know the hosting dilemma: standard serverless platforms scale to zero, which instantly kills your background loops and wipes your agent's active memory. Dedicated VMs keep the agent awake, but they cost more and leave you stuck managing the infrastructure. The fix is a new compute primitive: Cloud Run instances. In this hands-on workshop, you will learn how to deploy a single, always-on container to host a continuous background agent. Stepping into the role of a coffee shop manager, you will build an AI assistant using the Agent Development Kit (ADK) that continuously analyzes business data. You will also leverage Cloud Run sandboxes, enabling your agent to dynamically write, execute, and test code on the fly to solve complex problems safely. Stop managing infrastructure and start building agents that never sleep!",
    speakers: [{ full_name: 'Shir Meir Lador', company_position: null, company_name: null }]
  }],
  [1303, {
    starts_at: '2026-09-25T16:10:00-07:00',
    ends_at: '2026-09-25T16:40:00-07:00',
    stage: { name: 'Stage 6', as_string: 'Stage 6' }
  }]
]);

const compact = raw.sessions.map(source => {
  const session = { ...source, ...(liveCorrections.get(source.id) || {}) };
  const speakerNames = session.speakers.map(speaker => [speaker.full_name, speaker.company_position, speaker.company_name]
    .filter(Boolean).join(' - ').replace(' - ', ' - ').replace(/ - ([^-]+)$/, ' at $1'));
  return {
    id: session.id,
    title: session.title,
    description: session.description?.replace(/\r\n/g, '\n').trim() || '',
    starts_at: session.starts_at,
    ends_at: session.ends_at,
    stage: session.location_override || session.stage?.as_string || session.stage?.name || 'Location TBA',
    track: session.track?.name || '',
    type: session.is_workshop ? 'Workshop' : (session.track?.name || 'Session'),
    live_coding: session.live_coding,
    is_workshop: session.is_workshop,
    capacity: session.workshop_capacity,
    waitlist: session.workshop_waitlist,
    requirements: session.workshop_requirements || '',
    speakers: speakerNames,
    tags: session.tags.map(tag => tag.name || tag),
    live_url: session.live_url,
    recording_url: session.recording_url,
    app_url: `https://app.wearedevelopers.com/events/${session.event_id}/session/${session.id}`,
    official_url: (liveCorrections.get(session.id)?.title ? officialUrls.get(normalizeTitle(session.title)) : existingOfficialUrls.get(session.id)) || officialUrls.get(normalizeTitle(session.title)) || directoryUrl,
    urls: [...new Set([session.live_url, session.recording_url].filter(Boolean))],
    flag: null
  };
});

const detailLinkCount = compact.filter(session => session.official_url !== directoryUrl).length;
fs.writeFileSync(generatedPath, `window.CONFERENCE_SESSIONS=${JSON.stringify(compact)};\n`);
console.log(`Prepared ${compact.length} sessions with ${detailLinkCount} official detail links; the directory remains the official fallback.`);
