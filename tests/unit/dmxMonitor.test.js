import { describe, expect, it } from 'vitest';
import { PROFILES, channelInfo, dmxFrame, fixtureValues, sacnPacket, showPatch } from '@/lib/dmx/monitor';
import { findConflicts } from '@/lib/dmx/allocate';
import { DEFAULT_LOOK } from '@/lib/show/look';

const RIG = { aerial: 22, sides: 10, floor: 12, wash: 20, strobes: 16, lasers: 8, hazers: 2 };

describe('the DMX monitor', () => {
    it('patches the whole rig with no clashes, spilling into more universes when one is full', () => {
        const patch = showPatch(RIG);
        expect(patch).toHaveLength(90);
        const conflicts = findConflicts(patch);
        expect(conflicts.overlaps).toEqual([]);
        expect(conflicts.outOfRange).toEqual([]);
        // 44 beams x 16 + 20 washes x 14 + 16 strobes x 4 + 8 lasers x 12 + 2 hazers x 2 = 1148 channels: three universes
        expect(Math.max(...patch.map((f) => f.universe))).toBe(3);
        expect(patch[0]).toMatchObject({ name: 'Aerial beam 1', universe: 1, address: 1, channels: 16 });
    });

    it('a blackout sends every dimmer to zero and closes the shutters', () => {
        const patch = showPatch(RIG);
        const frame = dmxFrame(patch, { ...DEFAULT_LOOK, master: 0 }, 1);
        for (const f of patch.filter((x) => x.type === 'beam' || x.type === 'wash')) {
            const data = frame[f.universe];
            expect(data[f.address - 1 + PROFILES[f.type].indexOf('Dimmer')]).toBe(0);
            expect(data[f.address - 1 + PROFILES[f.type].indexOf('Shutter')]).toBe(0);
        }
    });

    it('puts the look on the channels: dimmer, colour, group levels, lasers, haze', () => {
        const patch = showPatch(RIG);
        const look = { ...DEFAULT_LOOK, master: 1, intensity: 1, beams: 1, sides: 0, colorA: '#ff0000', colorB: '#0000ff', laser: 1, laserColor: '#00ff00', haze: 1 };
        const at = (f, name) => fixtureValues(f, look, 0)[PROFILES[f.type].indexOf(name)];
        const [aerial1, aerial2] = patch.filter((f) => f.role === 'aerial');
        expect(at(aerial1, 'Dimmer')).toBe(255);
        expect([at(aerial1, 'Red'), at(aerial1, 'Green'), at(aerial1, 'Blue')]).toEqual([255, 0, 0]);
        expect([at(aerial2, 'Red'), at(aerial2, 'Blue')]).toEqual([0, 255]); // neighbours alternate the two colours
        expect(at(patch.find((f) => f.role === 'sides'), 'Dimmer')).toBe(0);  // that group is off
        const laser = patch.find((f) => f.type === 'laser');
        expect([at(laser, 'Dimmer'), at(laser, 'Green')]).toEqual([255, 255]);
        expect(at(patch.find((f) => f.type === 'hazer'), 'Haze')).toBe(255);
    });

    it('every value is a byte, and a moving look changes pan over time', () => {
        const patch = showPatch(RIG);
        const look = { ...DEFAULT_LOOK, sweep: 1, speed: 2, strobe: 1, strobeRandom: 0.5, tiltWave: 0.5 };
        for (const t of [0, 0.37, 5.2]) {
            for (const data of Object.values(dmxFrame(patch, look, t))) for (const v of data) expect(Number.isInteger(v) && v >= 0 && v <= 255).toBe(true);
        }
        const beam = patch[0];
        const pan = (t) => fixtureValues(beam, look, t)[0] * 256 + fixtureValues(beam, look, t)[1];
        expect(pan(0)).not.toBe(pan(0.5));
    });

    it('names the fixture and channel at an address', () => {
        const patch = showPatch(RIG);
        expect(channelInfo(patch, 1, 5)).toMatchObject({ fixture: { name: 'Aerial beam 1' }, channel: 'Dimmer' });
        expect(channelInfo(patch, 1, 17)).toMatchObject({ fixture: { name: 'Aerial beam 2' }, channel: 'Pan' });
        expect(channelInfo(patch, 3, 512)).toBeNull();
    });

    it('builds a well-formed sACN (E1.31) packet', () => {
        const data = new Uint8Array(512).fill(7);
        data[0] = 255;
        const packet = sacnPacket(2, data, 9);
        expect(packet).toHaveLength(638);
        const view = new DataView(packet.buffer);
        expect(view.getUint16(0)).toBe(0x0010);
        expect(String.fromCharCode(...packet.slice(4, 13))).toBe('ASC-E1.17');
        expect(view.getUint16(16) & 0x0fff).toBe(622);
        expect(view.getUint32(18)).toBe(4);
        expect(String.fromCharCode(...packet.slice(44, 54))).toBe('StageVerse');
        expect(packet[108]).toBe(100);
        expect(packet[111]).toBe(9);
        expect(view.getUint16(113)).toBe(2);
        expect(view.getUint16(123)).toBe(513);
        expect(packet[125]).toBe(0);      // DMX start code
        expect(packet[126]).toBe(255);    // channel 1
        expect(packet[637]).toBe(7);      // channel 512
    });
});
