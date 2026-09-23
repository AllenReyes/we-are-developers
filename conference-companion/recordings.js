(() => {
  const sessions = window.CONFERENCE_SESSIONS || [];
  const els = {
    filters: document.querySelector('#resource-filters'),
    list: document.querySelector('#resource-list'),
    days: document.querySelector('#resource-days'),
    result: document.querySelector('#resource-result'),
    search: document.querySelector('#resource-search'),
    sessionCount: document.querySelector('#session-count'),
    videoCount: document.querySelector('#video-count')
  };
  const state = { filter: 'youtube', query: '' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const isYouTube = url => Boolean(url && /(?:youtube\.com|youtu\.be)/i.test(url));
  const dateFor = session => session.starts_at.slice(0, 10);
  const time = value => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  const dayParts = date => {
    const value = new Date(`${date}T12:00:00-07:00`);
    return {
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(value),
      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value)
    };
  };
  const uniqueLinks = session => {
    const links = [];
    const add = (kind, label, url, primary = false) => {
      if (url && !links.some(link => link.url === url)) links.push({ kind, label, url, primary });
    };
    add(isYouTube(session.recording_url) ? 'youtube' : 'other', isYouTube(session.recording_url) ? 'Watch on YouTube' : 'Watch recording', session.recording_url, true);
    add(isYouTube(session.live_url) ? 'youtube' : 'live', 'Watch live stream', session.live_url, true);
    for (const url of session.urls || []) add(isYouTube(url) ? 'youtube' : 'other', isYouTube(url) ? 'Watch on YouTube' : 'Open resource', url, isYouTube(url));
    add('official', 'Session page', session.official_url);
    add('app', 'Event app', session.app_url);
    return links;
  };
  const searchable = session => [session.title, session.stage, session.track, ...(session.speakers || []), ...(session.tags || [])].join(' ').toLowerCase();
  const matchesFilter = session => {
    const links = uniqueLinks(session);
    if (state.filter === 'youtube') return links.some(link => link.kind === 'youtube');
    if (state.filter === 'live') return Boolean(session.live_url);
    if (state.filter === 'other') return !links.some(link => ['youtube', 'live', 'other'].includes(link.kind));
    return true;
  };
  const renderCard = session => {
    const links = uniqueLinks(session);
    const video = links.some(link => link.kind === 'youtube');
    return `<article class="resource-card${video ? ' has-video' : ''}">
      <div class="resource-card-time"><b>${time(session.starts_at)}</b><span>${escapeHtml(session.stage || 'Location TBA')}</span></div>
      <div class="resource-card-main">
        <div class="session-meta">${video ? '<span class="video-badge">VIDEO</span>' : ''}<span class="session-type">${escapeHtml(session.track || session.type || 'Session')}</span></div>
        <h3>${escapeHtml(session.title)}</h3>
        ${session.speakers?.length ? `<p>${escapeHtml(session.speakers.join(' · '))}</p>` : ''}
        ${session.flag ? `<p class="resource-flag">${escapeHtml(session.flag)}</p>` : ''}
      </div>
      <div class="resource-links">${links.map(link => `<a class="resource-link${link.primary ? ' primary' : ''}" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>
    </article>`;
  };
  function render() {
    const visible = sessions.filter(session => matchesFilter(session) && (!state.query || searchable(session).includes(state.query)))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || String(a.id).localeCompare(String(b.id)));
    const dates = [...new Set(visible.map(dateFor))];
    const label = state.filter === 'youtube' ? 'with YouTube recordings' : state.filter === 'live' ? 'with live-stream links' : state.filter === 'other' ? 'without a video link yet' : 'total';
    els.result.textContent = `Showing ${visible.length} sessions ${label}.`;
    els.days.innerHTML = dates.map(date => { const parts = dayParts(date); return `<a href="#resources-${date}"><b>${parts.weekday}</b><span>${parts.date}</span></a>`; }).join('');
    els.list.innerHTML = dates.map(date => {
      const parts = dayParts(date); const daySessions = visible.filter(session => dateFor(session) === date);
      return `<section class="resource-day" id="resources-${date}" aria-labelledby="resources-heading-${date}"><div class="day-heading"><div><p>${parts.date} · Media library</p><h2 id="resources-heading-${date}">${parts.weekday}</h2></div><span>${daySessions.length} sessions</span></div><div class="resource-grid">${daySessions.map(renderCard).join('')}</div></section>`;
    }).join('') || '<div class="empty">No session links match this search and filter.</div>';
  }
  const videoSessions = sessions.filter(session => uniqueLinks(session).some(link => link.kind === 'youtube')).length;
  els.sessionCount.textContent = sessions.length;
  els.videoCount.textContent = videoSessions;
  els.search.addEventListener('input', event => { state.query = event.target.value.trim().toLowerCase(); render(); });
  els.filters.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]'); if (!button) return;
    state.filter = button.dataset.filter;
    els.filters.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
  render();
})();
