(() => {
  const storageKey = 'wad-2026-itinerary-v3';
  const auth = window.SITE_AUTH || { isAuthenticated: false, canEdit: false };
  const canEdit = auth.canEdit === true;
  const list = window.CONFERENCE_SESSIONS || [];
  const timeline = window.CONFERENCE_TIMELINE;
  const byId = new Map(list.map(session => [String(session.id), session]));
  const baseline = window.DEFAULT_ITINERARY || { version: 3, items: {} };
  const els = {
    app: document.querySelector('#app'), count: document.querySelector('#count'), days: document.querySelector('#days'),
    detail: document.querySelector('#detail'), detailContent: document.querySelector('#detailcontent'), editor: document.querySelector('#editor'),
    editorContent: document.querySelector('#editorcontent'), exportButton: document.querySelector('#export'), filters: document.querySelector('#filters'),
    importFile: document.querySelector('#importfile'), manage: document.querySelector('#manage'), ownerAccess: document.querySelector('#owneraccess'), reset: document.querySelector('#reset'),
    result: document.querySelector('#resultnote'), schedule: document.querySelector('#schedule'), search: document.querySelector('#search'), storageNote: document.querySelector('#storagenote')
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const time = value => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  const sessionDate = session => session.starts_at.slice(0, 10);
  const dayLabel = date => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00-07:00`));
  const dayParts = date => {
    const value = new Date(`${date}T12:00:00-07:00`);
    return {
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(value),
      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value)
    };
  };
  const validItems = items => Object.fromEntries(Object.entries(items || {}).filter(([id, tier]) => byId.has(String(id)) && ['MUST', 'PRIORITY', 'RESERVED'].includes(tier)));
  const cloneBaseline = () => ({ version: 3, items: validItems(baseline.items) });
  const readSaved = () => { try { const saved = JSON.parse(localStorage.getItem(storageKey)); return saved?.version === 3 ? { version: 3, items: validItems(saved.items) } : null; } catch { return null; } };
  const state = { filter: 'itinerary', query: '', itinerary: canEdit ? readSaved() || cloneBaseline() : cloneBaseline() };
  const persist = () => { if (canEdit) localStorage.setItem(storageKey, JSON.stringify(state.itinerary)); };
  const tierFor = session => state.itinerary.items[String(session.id)] || null;
  const badge = session => tierFor(session) ? `<span class="badge ${tierFor(session).toLowerCase()}">${tierFor(session)}</span>` : '';
  const type = session => session.live_coding && session.type === 'Keynote/Talk' ? 'Live-coding Talk' : session.type;
  const typeAhead = session => [session.title, session.description, session.stage, session.track, session.type, session.speakers.join(' '), session.tags.join(' ')].join(' ').toLowerCase();
  const sessionLinks = session => {
    const seen = new Set();
    return [...(session.app_url ? [['Open in the official event app', session.app_url]] : []), ...(session.official_url ? [['Open public session page', session.official_url]] : []), ...(session.live_url ? [['Watch live stream / recording', session.live_url]] : []), ...session.urls.map(url => ['Related resource', url])].filter(([, url]) => !seen.has(url) && seen.add(url));
  };
  const matches = session => {
    const tier = tierFor(session);
    const queryMatch = !state.query || typeAhead(session).includes(state.query);
    const filterMatch = state.filter === 'all' || (state.filter === 'itinerary' && tier) || (state.filter === 'must' && tier === 'MUST') || (state.filter === 'priority' && tier === 'PRIORITY') || (state.filter === 'reserved' && tier === 'RESERVED') || (state.filter === 'workshop' && session.is_workshop) || (state.filter === 'stream' && session.live_url);
    return queryMatch && filterMatch;
  };

  function refreshTemporalStatus() {
    const status = timeline.itineraryStatus(list, state.itinerary.items);
    const activeIds = new Set(status.ids);
    els.schedule.querySelectorAll('[data-session-id]').forEach(row => {
      const active = activeIds.has(row.dataset.sessionId);
      const isNow = active && status.state === 'now';
      const isNext = active && status.state === 'next';
      const indicator = row.querySelector('[data-time-indicator]');
      row.classList.toggle('is-now', isNow);
      row.classList.toggle('is-next', isNext);
      indicator.hidden = !active;
      indicator.className = `timing-badge${isNow ? ' now' : isNext ? ' next' : ''}`;
      indicator.textContent = isNow ? 'Happening now' : isNext ? 'Up next' : '';
    });
  }

  const modalState = new WeakMap();
  const focusable = dialog => [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(element => !element.hidden);
  function lockPage() {
    const scrollY = window.scrollY;
    document.body.dataset.scrollY = String(scrollY);
    document.body.style.paddingRight = `${Math.max(0, window.innerWidth - document.documentElement.clientWidth)}px`;
    document.body.style.position = 'fixed'; document.body.style.top = `-${scrollY}px`; document.body.style.width = '100%';
    document.body.classList.add('modal-open'); els.app.inert = true;
  }
  function unlockPage() {
    const scrollY = Number(document.body.dataset.scrollY || 0);
    document.body.classList.remove('modal-open'); document.body.style.removeProperty('padding-right'); document.body.style.removeProperty('position'); document.body.style.removeProperty('top'); document.body.style.removeProperty('width');
    delete document.body.dataset.scrollY; els.app.inert = false; window.scrollTo(0, scrollY);
  }
  function openModal(dialog, opener) {
    modalState.set(dialog, opener || document.activeElement);
    lockPage(); dialog.showModal();
    requestAnimationFrame(() => (dialog.querySelector('[data-initial-focus]') || focusable(dialog)[0])?.focus());
  }
  function closeModal(dialog) { if (dialog.open) dialog.close(); }
  function initializeDialog(dialog) {
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const items = focusable(dialog); if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) closeModal(dialog); });
    dialog.addEventListener('close', () => { unlockPage(); const opener = modalState.get(dialog); if (opener?.isConnected) opener.focus(); });
  }
  initializeDialog(els.detail); initializeDialog(els.editor);

  function render() {
    const visible = list.filter(matches).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.ends_at.localeCompare(b.ends_at) || String(a.id).localeCompare(String(b.id)));
    const dates = [...new Set(visible.map(sessionDate))];
    const must = Object.values(state.itinerary.items).filter(value => value === 'MUST').length;
    const priority = Object.values(state.itinerary.items).filter(value => value === 'PRIORITY').length;
    const reserved = Object.values(state.itinerary.items).filter(value => value === 'RESERVED').length;
    els.count.textContent = `${must + priority + reserved} itinerary sessions${reserved ? ` · ${reserved} reserved` : ''}`;
    els.result.textContent = `Showing ${visible.length} of ${list.length} sessions.`;
    els.days.innerHTML = dates.map(date => { const parts = dayParts(date); return `<a href="#${date}"><span>${parts.weekday}</span><small>${parts.date}</small></a>`; }).join('') || '<span class="editor-note">No matching days</span>';
    els.schedule.innerHTML = dates.map(date => {
      const sessions = visible.filter(session => sessionDate(session) === date); let last = '';
      const parts = dayParts(date);
      return `<section class="schedule-day" id="${date}" aria-labelledby="heading-${date}"><div class="day-heading"><div><p>${parts.date} · Your route</p><h2 id="heading-${date}">${parts.weekday}</h2></div><span>${sessions.length} sessions</span></div>${sessions.map(session => {
        const group = session.starts_at !== last ? `<div class="time-group">${time(session.starts_at)} start</div>` : ''; last = session.starts_at;
        const tier = tierFor(session);
        return `${group}<article class="session-row ${tier ? tier.toLowerCase() : ''}" data-session-id="${session.id}"><div class="session-time"><b>${time(session.starts_at)}</b><span>${time(session.ends_at)}</span></div><div class="session-main"><div class="session-meta"><span class="timing-badge" data-time-indicator hidden></span>${badge(session)} <span class="session-type">${escapeHtml(type(session))}</span><span class="session-location">${escapeHtml(session.stage || 'Location TBA')}</span>${session.track ? `<span>${escapeHtml(session.track)}</span>` : ''}</div><h3 class="session-title">${escapeHtml(session.title)}</h3>${session.speakers.length ? `<p class="session-speakers">${escapeHtml(session.speakers.join(' · '))}</p>` : ''}</div><button class="row-action" data-open-session="${session.id}" aria-label="Open details for ${escapeHtml(session.title)}"><span>View</span><i aria-hidden="true">→</i></button></article>`;
      }).join('')}</section>`;
    }).join('') || '<div class="empty">No sessions match those filters. Clear the search or choose another filter.</div>';
    refreshTemporalStatus();
  }

  function showSession(session, opener) {
    if (!session) return;
    const tier = tierFor(session); const workshop = session.is_workshop ? (tier === 'RESERVED' ? '<div class="callout"><b>Reserved workshop:</b> You already have a seat for this workshop in the official event app.</div>' : '<div class="callout"><b>Workshop availability:</b> Unreserved workshops are full, so no additional workshops are recommended.</div>') : '';
    const editActions = canEdit ? `<div class="dialog-actions"><button class="button ${tier === 'MUST' ? 'primary' : ''}" type="button" data-set-tier="MUST" data-session-id="${session.id}">Mark MUST</button><button class="button ${tier === 'PRIORITY' ? 'primary' : ''}" type="button" data-set-tier="PRIORITY" data-session-id="${session.id}">Mark Priority</button><button class="button ${tier === 'RESERVED' ? 'primary' : ''}" type="button" data-set-tier="RESERVED" data-session-id="${session.id}">Mark Reserved</button>${tier ? `<button class="button danger" type="button" data-set-tier="remove" data-session-id="${session.id}">Remove from itinerary</button>` : ''}</div>` : '';
    els.detailContent.innerHTML = `<button class="dialog-close" type="button" data-close-dialog="detail" data-initial-focus aria-label="Close session details">×</button>${badge(session)}<h2 class="dialog-title" id="detail-title">${escapeHtml(session.title)}</h2><p class="dialog-meta"><span class="session-type">${escapeHtml(type(session))}</span> · ${time(session.starts_at)}–${time(session.ends_at)} · ${dayLabel(sessionDate(session))}</p><div class="fact-grid"><div class="fact"><b>Stage / location</b>${escapeHtml(session.stage || 'Location TBA')}</div><div class="fact"><b>Track</b>${escapeHtml(session.track || 'Not listed')}</div>${session.speakers.length ? `<div class="fact"><b>Speakers</b>${escapeHtml(session.speakers.join(' · '))}</div>` : ''}</div>${workshop}<div class="description">${escapeHtml(session.description || 'No session description provided.').replace(/\n/g, '<br>')}</div><ul class="resource-list">${sessionLinks(session).map(([label, url]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)} ↗</a></li>`).join('')}</ul>${editActions}${session.app_url ? `<div class="dialog-actions"><a class="button primary" href="${escapeHtml(session.app_url)}" target="_blank" rel="noopener">${session.is_workshop ? (tier === 'RESERVED' ? 'Open reservation in event app' : 'Open workshop in event app') : 'Open in event app'} ↗</a></div>` : ''}`;
    els.detail.setAttribute('aria-labelledby', 'detail-title'); openModal(els.detail, opener);
  }

  function renderEditor() {
    const rows = Object.entries(state.itinerary.items).map(([id, tier]) => ({ id, tier, session: byId.get(id) })).filter(row => row.session).sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
    els.editorContent.innerHTML = rows.length ? ['MUST', 'PRIORITY', 'RESERVED'].map(tier => {
      const group = rows.filter(row => row.tier === tier); if (!group.length) return '';
      return `<section class="editor-group"><h3>${tier} · ${group.length}</h3><ul class="editor-list">${group.map(({ id, session }) => `<li><span><span class="badge ${tier.toLowerCase()}">${tier}</span> <span class="editor-title">${escapeHtml(session.title)}</span></span><button class="button danger" type="button" data-set-tier="remove" data-session-id="${id}">Remove</button></li>`).join('')}</ul></section>`;
    }).join('') : '<p class="editor-note">No sessions in your itinerary yet.</p>';
  }
  function setTier(id, tier) { if (!canEdit) return; tier === 'remove' ? delete state.itinerary.items[id] : state.itinerary.items[id] = tier; persist(); render(); renderEditor(); if (els.detail.open) showSession(byId.get(id), modalState.get(els.detail)); }
  function exportItinerary() { if (!canEdit) return; const url = URL.createObjectURL(new Blob([JSON.stringify(state.itinerary, null, 2)], { type: 'application/json' })); const anchor = Object.assign(document.createElement('a'), { href: url, download: 'wearedevelopers-2026-itinerary.json' }); anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }

  els.search.addEventListener('input', event => { state.query = event.target.value.trim().toLowerCase(); render(); });
  els.filters.addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; state.filter = button.dataset.filter; [...els.filters.querySelectorAll('[data-filter]')].forEach(item => item.setAttribute('aria-pressed', String(item === button))); render(); });
  els.manage.addEventListener('click', event => { if (!canEdit) return; renderEditor(); openModal(els.editor, event.currentTarget); });
  els.exportButton.addEventListener('click', exportItinerary);
  els.importFile.addEventListener('change', async event => { if (!canEdit) { event.target.value = ''; return; } const file = event.target.files?.[0]; if (!file) return; try { const value = JSON.parse(await file.text()); const items = validItems(value.items); if (![1, 2, 3].includes(value.version) || !Object.keys(items).length) throw new Error(); state.itinerary = { version: 3, items }; persist(); render(); renderEditor(); els.editorContent.insertAdjacentHTML('afterbegin', '<p class="editor-note" role="status">Itinerary imported.</p>'); } catch { els.editorContent.insertAdjacentHTML('afterbegin', '<p class="editor-note" role="alert">That file is not a valid itinerary JSON export.</p>'); } event.target.value = ''; });
  els.reset.addEventListener('click', () => { if (canEdit && confirm('Reset your itinerary to the latest baseline recommendations?')) { state.itinerary = cloneBaseline(); persist(); render(); renderEditor(); } });
  document.addEventListener('click', event => { const closer = event.target.closest('[data-close-dialog]'); if (closer) closeModal(document.querySelector(`#${closer.dataset.closeDialog}`)); const detailButton = event.target.closest('[data-open-session]'); if (detailButton) showSession(byId.get(detailButton.dataset.openSession), detailButton); const tierButton = event.target.closest('[data-set-tier][data-session-id]'); if (tierButton) setTier(tierButton.dataset.sessionId, tierButton.dataset.setTier); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshTemporalStatus(); });
  window.addEventListener('hashchange', () => { const match = location.hash.match(/^#session-(.+)$/); if (match) showSession(byId.get(match[1]), document.activeElement); });
  els.manage.hidden = !canEdit;
  if (canEdit) {
    els.storageNote.textContent = 'Your changes are saved on this device. Use Edit itinerary to import, export, or reset them.';
    els.ownerAccess.hidden = true;
  } else if (auth.isAuthenticated) {
    els.ownerAccess.textContent = 'Editing is available only to the site owner.';
  }
  render();
  window.setInterval(refreshTemporalStatus, 30_000);
  const initialHash = location.hash.match(/^#session-(.+)$/);
  if (initialHash) showSession(byId.get(initialHash[1]), document.activeElement);
})();
