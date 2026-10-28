// Rule-based reader for common patch requests ("add 8 beams and 4 washes", "fix collisions"),
// used only when no AI provider answers. It understands much less than a model, but it means
// the patch assistant still works during an outage. Returns null if it can't read the request.

const NUMBER_WORDS = {
    a: 1, an: 1, one: 1, single: 1, two: 2, pair: 2, couple: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, dozen: 12,
    // Vague amounts: a deliberate small guess (this reader only runs when no AI is available)
    few: 3, several: 4, some: 4,
};
// A number followed by "ch"/"channel" is a footprint ("a 600 channel beam"), never a count
const COUNT = `(\\d+|${Object.keys(NUMBER_WORDS).join('|')})(?!\\s*-?\\s*(?:ch|channels?)\\b)`;
// Up to two descriptive words between the count and the type ("6 RGB wash lights", "two 24-channel spots").
// A bare number can't be filler, so "8 channel" in "10 pars in 8 channel mode" isn't read as a count.
const FILLER = `(?:(?:\\d+-(?:ch|channels?)|(?!(?:\\d+|${Object.keys(NUMBER_WORDS).join('|')})\\b)[a-z-]+)\\s+){0,2}?`;

// Longer names first so "pixel bar" isn't read as a "bar"
const TYPES = [
    ['Pixel Bar', 'pixel[ -]?bars?'],
    ['LED Par', '(?:led\\s+)?pars?'],
    ['Profile', 'profiles?'],
    ['Spot', 'spots?'],
    ['Wash', 'wash(?:es)?(?:\\s+lights?)?'],
    ['Beam', 'beams?|movers?|moving[ -]?heads?'],
    ['Strobe', 'strobes?'],
    ['Blinder', 'blinders?'],
    ['Laser', 'lasers?'],
    ['Hazer', 'hazers?|haze machines?|foggers?'],
];

const REPATCH = /\b(re-?patch|fix|clean ?up|re-?address|clash(?:es)?|collisions?|overlap(?:ping|s)?|repack)\b/;

export function ruleIntent(text) {
    const t = ` ${String(text ?? '').toLowerCase()} `;
    const fixtures = [];
    for (const [type, pattern] of TYPES) {
        const m = t.match(new RegExp(`\\b${COUNT}\\s+${FILLER}(?:${pattern})\\b`));
        if (!m) continue;
        const count = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
        if (count >= 1) fixtures.push({ type, count: Math.min(count, 256) });
    }

    // "in 8 channel mode" / "16ch" applies when exactly one fixture type was asked for
    const ch = t.match(/\b(\d{1,3})\s*-?\s*(?:ch|channels?)\b/);
    if (ch && fixtures.length === 1) {
        const channels = Number(ch[1]);
        if (channels >= 1 && channels <= 512) fixtures[0].channels = channels;
    }

    const repatch = REPATCH.test(t);
    if (!repatch && fixtures.length === 0) return null;
    return { action: repatch ? 'repatch' : 'add', fixtures };
}
