(() => {
  const timestamp = value => new Date(value).getTime();

  function itineraryStatus(sessions, items, now = Date.now()) {
    const currentTime = now instanceof Date ? now.getTime() : Number(now);
    const selected = sessions
      .filter(session => items?.[String(session.id)])
      .sort((a, b) => timestamp(a.starts_at) - timestamp(b.starts_at) || timestamp(a.ends_at) - timestamp(b.ends_at) || String(a.id).localeCompare(String(b.id)));
    const activeIds = selected
      .filter(session => timestamp(session.starts_at) <= currentTime && currentTime < timestamp(session.ends_at))
      .map(session => String(session.id));

    if (activeIds.length) return { state: 'now', ids: activeIds };

    const next = selected.find(session => timestamp(session.starts_at) > currentTime);
    return next ? { state: 'next', ids: [String(next.id)] } : { state: null, ids: [] };
  }

  window.CONFERENCE_TIMELINE = Object.freeze({ itineraryStatus });
})();
