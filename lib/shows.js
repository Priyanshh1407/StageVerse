// Picking a show for the person: the next one coming up (today's counts), otherwise the most recent.

const DAY = 24 * 60 * 60 * 1000;

/** The show to open by default from a list of events ({ date }): the next upcoming, else the latest past. */
export function nextShow(events = [], now = Date.now()) {
    const dated = events.filter((e) => e?.date && !Number.isNaN(new Date(e.date).getTime()));
    const upcoming = dated.filter((e) => new Date(e.date).getTime() >= now - DAY / 2).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (upcoming.length) return upcoming[0];
    const past = [...dated].sort((a, b) => new Date(b.date) - new Date(a.date));
    return past[0] ?? events[0] ?? null;
}

/** Events split into the ones coming up (soonest first) and the past ones (latest first). */
export function splitShows(events = [], now = Date.now()) {
    const t = (e) => new Date(e.date).getTime();
    const upcoming = events.filter((e) => t(e) >= now - DAY / 2).sort((a, b) => t(a) - t(b));
    const past = events.filter((e) => !(t(e) >= now - DAY / 2)).sort((a, b) => t(b) - t(a));
    return { upcoming, past };
}
