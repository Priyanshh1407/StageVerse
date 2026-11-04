// grandMA3 patch export: the patch sheet as an XML file for grandMA3 / grandMA3 onPC
// (README roadmap: "serialize the patch to the console's .xml import format").
//
// One <Layer> named after the show, one <Fixture> per patch line, in fixture-ID order:
//   Name         "<profile> <fixture id>"
//   FID          the fixture ID (the "user number" the operator types: 101, 201, ...)
//   FixtureType  the profile name; grandMA3 matches it by name, so the fixture type must already
//                be in the show file (imported from the library or a GDTF file) before importing
//   Mode         the DMX mode, when the patch has one
//   Patch        universe.address, the console's own notation (universe 1, address 1 = "1.001")
//
// Lines that can't load cleanly (a missing or out-of-range address, an address clash) are left out
// and listed in a comment at the top, so one bad line doesn't break the import.
// Pure functions (no browser or Node APIs), shared by the patch sheet's download and the tests.

// The grandMA3 data version written in the file header. Exports from a newer console work as long
// as the structure matches; adjust here if your console version asks for another.
export const GMA3_DATA_VERSION = '2.0.2.0';

const DMX_ADDRESSES = 512;

const escapeXml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
// a comment can't contain "--"
const safeComment = (value) => String(value ?? '').replace(/--+/g, '-');

/** grandMA3's patch notation: universe 3, address 7 -> "3.007". */
export function patchAddress(universe, address) {
    return `${universe}.${String(address).padStart(3, '0')}`;
}

/**
 * Which patch lines can go into the console: each needs a fixture ID, a profile, a universe of 1
 * or more and an address that fits its channels inside the universe, and no line may overlap
 * another's channels. Returns { valid, skipped: [{ fixture, reason }] }.
 */
export function checkPatch(fixtures = []) {
    const skipped = [];
    const candidates = [];
    for (const f of fixtures) {
        const channels = Number(f.channels) || 1;
        const universe = Number(f.universe);
        const address = Number(f.address);
        if (!Number.isInteger(Number(f.fixtureId))) skipped.push({ fixture: f, reason: 'no fixture ID' });
        else if (!f.profile) skipped.push({ fixture: f, reason: 'no profile' });
        else if (!Number.isInteger(universe) || universe < 1) skipped.push({ fixture: f, reason: 'no valid universe' });
        else if (!Number.isInteger(address) || address < 1 || address + channels - 1 > DMX_ADDRESSES) {
            skipped.push({ fixture: f, reason: `address ${address} with ${channels} channels doesn't fit in the universe` });
        } else candidates.push({ f, universe, from: address, to: address + channels - 1 });
    }
    // overlaps: both lines of a clash are left out (the console would refuse one of them anyway,
    // and which one is right is the operator's call)
    const clash = new Set();
    for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
            const a = candidates[i];
            const b = candidates[j];
            if (a.universe === b.universe && a.from <= b.to && b.from <= a.to) {
                clash.add(i);
                clash.add(j);
            }
        }
    }
    const fids = new Map();
    candidates.forEach((c, i) => {
        const id = Number(c.f.fixtureId);
        if (fids.has(id)) { clash.add(i); clash.add(fids.get(id)); } else fids.set(id, i);
    });
    const valid = [];
    candidates.forEach((c, i) => {
        if (clash.has(i)) skipped.push({ fixture: c.f, reason: `clashes with another line in universe ${c.universe} (channels ${c.from}-${c.to}) or shares its fixture ID` });
        else valid.push(c.f);
    });
    return { valid, skipped };
}

/** The grandMA3 XML for a patch. `show` is { name, version }. */
export function toGrandMA3Xml(fixtures = [], show = {}) {
    const { valid, skipped } = checkPatch(fixtures);
    const name = show.name || 'StageVerse patch';
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<!-- ${safeComment(name)}${show.version ? ` v${safeComment(show.version)}` : ''}: ${valid.length} fixtures, exported from StageVerse. -->`,
        '<!-- Import into a show that already has these fixture types (grandMA3 matches them by name). -->',
    ];
    if (skipped.length) {
        lines.push(`<!-- Left out (${skipped.length}), fix them in the patch sheet and export again:`);
        for (const s of skipped) lines.push(`     fixture ${safeComment(s.fixture.fixtureId ?? '?')} ${safeComment(s.fixture.profile ?? '')}: ${safeComment(s.reason)}`);
        lines.push('-->');
    }
    lines.push(`<GMA3 DataVersion="${GMA3_DATA_VERSION}">`);
    lines.push(`\t<Layer Name="${escapeXml(name)}">`);
    for (const f of [...valid].sort((a, b) => Number(a.fixtureId) - Number(b.fixtureId))) {
        const attrs = [
            `Name="${escapeXml(`${f.profile} ${f.fixtureId}`)}"`,
            `FID="${Number(f.fixtureId)}"`,
            `FixtureType="${escapeXml(f.profile)}"`,
            ...(f.mode ? [`Mode="${escapeXml(f.mode)}"`] : []),
            `Patch="${patchAddress(Number(f.universe), Number(f.address))}"`,
        ];
        lines.push(`\t\t<Fixture ${attrs.join(' ')}/>`);
    }
    lines.push('\t</Layer>');
    lines.push('</GMA3>');
    return { xml: `${lines.join('\n')}\n`, exported: valid.length, skipped };
}

/** A file name for the export: the show's name, safe on any OS. */
export function grandMA3FileName(showName = 'patch') {
    const base = String(showName).replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'patch';
    return `${base}_grandMA3_patch.xml`;
}
