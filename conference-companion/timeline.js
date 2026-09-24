(() => {
  const timestamp = value => new Date(value).getTime();
  const tierRank = Object.freeze({ ATTENDING: 0, MUST: 1, PRIORITY: 2, RESERVED: 3 });
  const rankFor = (items, session) => tierRank[items?.[String(session.id)]] ?? Number.MAX_SAFE_INTEGER;
  const liveRankFor = (items, session) => {
    const tier = items?.[String(session.id)];
    return ['ATTENDING', 'MUST', 'PRIORITY'].includes(tier) ? tierRank[tier] : Number.MAX_SAFE_INTEGER;
  };

  function sessionStatus(session, now = Date.now()) {
    const currentTime = now instanceof Date ? now.getTime() : Number(now);
    if (currentTime >= timestamp(session.ends_at)) return 'past';
    if (currentTime >= timestamp(session.starts_at)) return 'now';
    return 'upcoming';
  }

  function happeningNowStatus(sessions, items, now = Date.now()) {
    const currentTime = now instanceof Date ? now.getTime() : Number(now);
    const active = sessions
      .filter(session => timestamp(session.starts_at) <= currentTime && currentTime < timestamp(session.ends_at))
      .map((session, index) => ({ session, index }));
    const preferred = active.filter(({ session }) => liveRankFor(items, session) < Number.MAX_SAFE_INTEGER);
    const ordered = (preferred.length ? preferred.sort((a, b) => liveRankFor(items, a.session) - liveRankFor(items, b.session) || a.index - b.index) : active.sort((a, b) => timestamp(b.session.starts_at) - timestamp(a.session.starts_at) || a.index - b.index));
    return ordered.length ? { state: 'now', ids: ordered.map(({ session }) => String(session.id)) } : { state: null, ids: [] };
  }

  function nextItineraryStatus(sessions, items, now = Date.now()) {
    const currentTime = now instanceof Date ? now.getTime() : Number(now);
    const selected = sessions
      .filter(session => items?.[String(session.id)])
      .sort((a, b) => timestamp(a.starts_at) - timestamp(b.starts_at) || timestamp(a.ends_at) - timestamp(b.ends_at) || String(a.id).localeCompare(String(b.id)));
    const nextStart = selected.find(session => timestamp(session.starts_at) > currentTime)?.starts_at;
    const next = nextStart ? selected
      .filter(session => session.starts_at === nextStart)
      .sort((a, b) => rankFor(items, a) - rankFor(items, b) || timestamp(a.ends_at) - timestamp(b.ends_at) || String(a.id).localeCompare(String(b.id)))[0] : null;
    return next ? { state: 'next', ids: [String(next.id)] } : { state: null, ids: [] };
  }

  window.CONFERENCE_TIMELINE = Object.freeze({ happeningNowStatus, nextItineraryStatus, sessionStatus });
})();
