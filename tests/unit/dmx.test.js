import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { allocate, repatch, findConflicts, defaultChannels, UNIVERSE_SIZE } from '@/lib/dmx/allocate';
import { parseIntentText, getIntent, intentJsonSchema } from '@/lib/dmx/intent';

const fx = (universe, address, channels, type = 'Beam') => ({ universe, address, channels, type });

describe('findConflicts', () => {
    it('detects overlaps within a universe only', () => {
        const result = findConflicts([fx(1, 1, 16), fx(1, 10, 16), fx(2, 1, 16)]);
        expect(result.overlaps).toEqual([[0, 1]]);
        expect(result.ok).toBe(false);
    });

    it('touching ranges do not overlap', () => {
        expect(findConflicts([fx(1, 1, 16), fx(1, 17, 16)]).ok).toBe(true);
    });

    it('flags fixtures that run past channel 512', () => {
        expect(findConflicts([fx(1, 500, 16)]).outOfRange).toEqual([0]);
    });
});

describe('allocate', () => {
    it('fills the first gap that fits and never moves existing fixtures', () => {
        const existing = [fx(1, 1, 16), fx(1, 41, 16)]; // gap at 17..40 (24 channels)
        const placed = allocate(existing, [{ type: 'Spot', count: 1, channels: 24 }, { type: 'Beam', count: 1, channels: 16 }]);
        expect(placed.map((p) => [p.universe, p.address])).toEqual([[1, 17], [1, 57]]);
        expect(findConflicts([...existing, ...placed]).ok).toBe(true);
    });

    it('spills into the next universe when one is full', () => {
        const placed = allocate([], [{ type: 'Pixel', count: 11, channels: 48 }]); // 10 fit in 512
        expect(placed[9]).toMatchObject({ universe: 1, address: 433 });
        expect(placed[10]).toMatchObject({ universe: 2, address: 1 });
    });

    it('uses a sensible default footprint per type', () => {
        expect(defaultChannels('Moving Head Spot')).toBe(24);
        expect(defaultChannels('LED Par')).toBe(8);
        expect(defaultChannels('Unknown Thing')).toBe(16);
    });

    it('refuses a fixture wider than a universe', () => {
        expect(() => allocate([], [{ type: 'Huge', count: 1, channels: 600 }])).toThrow(RangeError);
    });
});

describe('repatch', () => {
    it('removes every collision and keeps order, type and footprint', () => {
        const messy = [fx(1, 1, 16, 'Beam'), fx(1, 5, 24, 'Spot'), fx(1, 5, 14, 'Wash')];
        const fixed = repatch(messy);
        expect(findConflicts(fixed).ok).toBe(true);
        expect(fixed.map((f) => [f.type, f.channels, f.address])).toEqual([['Beam', 16, 1], ['Spot', 24, 17], ['Wash', 14, 41]]);
    });
});

// Property-based: for any existing patch and any requests, the result never collides
const fixtureArb = fc.record({
    universe: fc.integer({ min: 1, max: 4 }),
    address: fc.integer({ min: 1, max: UNIVERSE_SIZE }),
    channels: fc.integer({ min: 1, max: 64 }),
}).filter((f) => f.address + f.channels - 1 <= UNIVERSE_SIZE);
const requestArb = fc.record({
    type: fc.constantFrom('Beam', 'Spot', 'Wash', 'Strobe', 'LED Par'),
    count: fc.integer({ min: 1, max: 20 }),
    channels: fc.option(fc.integer({ min: 1, max: 128 }), { nil: undefined }),
});

describe('allocator properties (fast-check)', () => {
    it('placed fixtures never overlap each other, the existing patch, or channel 512', () => {
        fc.assert(fc.property(fc.array(fixtureArb, { maxLength: 30 }), fc.array(requestArb, { maxLength: 5 }), (existing, requests) => {
            const placed = allocate(existing, requests);
            const all = [...existing, ...placed];
            const { overlaps, outOfRange } = findConflicts(all);
            const isNew = (i) => i >= existing.length;
            expect(outOfRange.filter(isNew)).toEqual([]);
            expect(overlaps.filter(([i, j]) => isNew(i) || isNew(j))).toEqual([]);
            expect(placed.length).toBe(requests.reduce((n, r) => n + r.count, 0));
        }), { numRuns: 300 });
    });

    it('repatch of any patch is conflict-free and preserves each fixture', () => {
        fc.assert(fc.property(fc.array(fixtureArb, { maxLength: 60 }), (patch) => {
            const fixed = repatch(patch);
            expect(findConflicts(fixed).ok).toBe(true);
            fixed.forEach((f, i) => expect(f.channels).toBe(patch[i].channels));
        }), { numRuns: 300 });
    });
});

describe('intent parsing', () => {
    it('accepts valid intent JSON, with or without code fences', () => {
        const json = '{"action":"add","fixtures":[{"type":"Beam","count":8}]}';
        expect(parseIntentText(json).fixtures[0]).toEqual({ type: 'Beam', count: 8 });
        expect(parseIntentText('```json\n' + json + '\n```').action).toBe('add');
    });

    it('rejects invalid JSON and wrong shapes with a readable reason', () => {
        expect(() => parseIntentText('Sure! Here are 8 beams')).toThrow('not valid JSON');
        expect(() => parseIntentText('{"action":"add","fixtures":[{"type":"Beam","count":0}]}')).toThrow(/fixtures\.0\.count/);
        expect(() => parseIntentText('{"action":"delete","fixtures":[]}')).toThrow(/action/);
    });

    it('the JSON schema sent to the model is generated from the validator', () => {
        expect(intentJsonSchema.properties.action.enum).toEqual(['add', 'repatch']);
        expect(intentJsonSchema.required).toEqual(['action', 'fixtures']);
    });
});

describe('getIntent repair loop', () => {
    it('retries once with the validation error, then succeeds', async () => {
        const calls = [];
        const fake = async (req) => {
            calls.push(req);
            return calls.length === 1
                ? { text: '{"action":"add","fixtures":[{"type":"Beam"}]}', tokens: 10 }
                : { text: '{"action":"add","fixtures":[{"type":"Beam","count":4}]}', tokens: 12 };
        };
        const result = await getIntent(fake, 'add 4 beams');
        expect(result).toMatchObject({ attempts: 2, tokens: 22, intent: { fixtures: [{ type: 'Beam', count: 4 }] } });
        expect(calls[1].user).toMatch(/previous answer was rejected/i);
        expect(calls[0].system).not.toContain('add 4 beams'); // user text never enters the instructions
    });

    it('gives up after two bad answers with INTENT_INVALID', async () => {
        const fake = async () => ({ text: 'not json', tokens: 5 });
        await expect(getIntent(fake, 'x')).rejects.toMatchObject({ code: 'INTENT_INVALID' });
    });
});
