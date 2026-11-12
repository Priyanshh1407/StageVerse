// Links to a demo song at a moment: /?song=<slug>&t=<seconds>. No imports: the browser and the tests share it.

/** The link to a demo song at a moment. */
export function songLink(slug, seconds, origin) {
    const url = new URL('/', origin);
    url.searchParams.set('song', slug);
    if (seconds > 1) url.searchParams.set('t', String(Math.floor(seconds)));
    return url.toString();
}

/** What a link asks for: { slug, t } or null. Anything that isn't a plain slug is ignored. */
export function readSongLink(search) {
    const params = new URLSearchParams(search);
    const slug = params.get('song');
    if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
    const t = Number(params.get('t'));
    return { slug, t: Number.isFinite(t) && t > 0 ? Math.min(t, 3600) : 0 };
}
