import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'conference-schedule-raw-data.json'), 'utf8')).data;
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

const compact = raw.sessions.map(session => {
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
    official_url: officialUrls.get(normalizeTitle(session.title)) || directoryUrl,
    urls: [...new Set([session.live_url, session.recording_url].filter(Boolean))],
    flag: null
  };
});

const detailLinkCount = compact.filter(session => session.official_url !== directoryUrl).length;
fs.writeFileSync(path.join(import.meta.dirname, 'sessions.js'), `window.CONFERENCE_SESSIONS=${JSON.stringify(compact)};\n`);
console.log(`Prepared ${compact.length} sessions with ${detailLinkCount} official detail links; the directory remains the official fallback.`);
