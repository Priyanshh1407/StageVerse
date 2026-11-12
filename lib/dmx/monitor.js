// The DMX monitor: what the homepage show would send to a real rig, worked out from the same "look"
// the 3D stage draws. A simulation for display only: nothing is sent to a network.
//
// The rig is patched with the project's own allocator (lib/dmx/allocate.js), each fixture type gets a
// generic channel layout (below), and a frame is the 512 values of each universe at one moment.
// sACN (ANSI E1.31) is the usual way a console sends a universe over a network: sacnPacket builds
// the exact bytes of one such packet, shown on the monitor.

import { UNIVERSE_SIZE, allocate } from './allocate.js';

// Generic channel layouts (a real fixture's manual gives its own; these are typical)
export const PROFILES = {
    beam: ['Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Dimmer', 'Shutter', 'Red', 'Green', 'Blue', 'White', 'Zoom', 'Focus', 'Gobo', 'Prism', 'Speed', 'Control'],
    wash: ['Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Dimmer', 'Shutter', 'Red', 'Green', 'Blue', 'White', 'Zoom', 'Speed', 'Macro', 'Control'],
    strobe: ['Dimmer', 'Rate', 'Duration', 'Effect'],
    laser: ['Mode', 'Dimmer', 'Red', 'Green', 'Blue', 'Pattern', 'Zoom', 'Pan', 'Tilt', 'Scan speed', 'Beams', 'Control'],
    hazer: ['Haze', 'Fan'],
};

// Which part of the look drives each group of moving heads
const GROUP_LEVEL = { aerial: 'beams', sides: 'sides', floor: 'floor', wash: 'wash' };

const byte = (x) => Math.max(0, Math.min(255, Math.round(x * 255)));
const rgb = (hex) => { const n = parseInt(String(hex ?? '#000000').slice(1), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/**
 * Patch the show's rig. `rig` = { aerial, sides, floor, wash (moving heads per group), strobes, lasers, hazers }.
 * Returns [{ name, type, role, index, universe, address, channels }] in patch order.
 */
export function showPatch(rig) {
    const groups = [
        ['aerial', 'beam', 'Aerial beam'], ['sides', 'beam', 'Tower beam'], ['floor', 'beam', 'Floor beam'], ['wash', 'wash', 'Wash'],
        ['strobes', 'strobe', 'Strobe'], ['lasers', 'laser', 'Laser'], ['hazers', 'hazer', 'Hazer'],
    ].filter(([key]) => (rig[key] ?? 0) > 0);
    const placed = allocate([], groups.map(([key, type]) => ({ type, count: rig[key], channels: PROFILES[type].length })));
    let i = 0;
    return groups.flatMap(([key, type, label]) => Array.from({ length: rig[key] }, (_, index) => {
        const p = placed[i++];
        return { name: `${label} ${index + 1}`, type, role: key, index, universe: p.universe, address: p.address, channels: p.channels };
    }));
}

/** One fixture's channel values (0-255) for a look at time t (seconds). */
export function fixtureValues(fixture, look, t = 0) {
    const master = (look.master ?? 1);
    const { type, role, index } = fixture;
    if (type === 'beam' || type === 'wash') {
        const level = master * Math.min(1, (look.intensity ?? 0)) * (look[GROUP_LEVEL[role]] ?? 0);
        // movement: each head swings by `sweep` at `speed`, a little later along the row (phaseSpread)
        const phase = t * (look.speed ?? 1) * 0.8 + index * (look.phaseSpread ?? 0) * 0.9;
        const sweep = role === 'wash' ? (look.sweep ?? 0) * (look.washSweep ?? 0) : (look.sweep ?? 0);
        const pan = 0.5 + 0.22 * sweep * Math.sin(phase) * (1 - (look.converge ?? 0));
        const tilt = 0.5 + 0.16 * (look.tiltShift ?? 0) + 0.1 * (look.tiltWave ?? 0) * Math.sin(phase * 1.3);
        const [r, g, b] = rgb(role === 'wash' ? look.washColor : index % 2 ? look.colorB : look.colorA);
        const pan16 = Math.round(Math.max(0, Math.min(1, pan)) * 65535);
        const tilt16 = Math.round(Math.max(0, Math.min(1, tilt)) * 65535);
        // shutter: 0 closed, 255 open, in between a strobe (faster with the strobe level)
        const shutter = level <= 0.001 ? 0 : (look.strobe ?? 0) > 0.05 ? 64 + Math.round(120 * Math.min(1, look.strobe)) : 255;
        const head = [pan16 >> 8, pan16 & 255, tilt16 >> 8, tilt16 & 255, byte(level), shutter, r, g, b, 0];
        const zoom = byte(0.25 + 0.5 * Math.min(1, look.fan ?? 1) / 1.3);
        return type === 'beam' ? [...head, zoom, 128, 0, 0, byte(Math.min(1, (look.speed ?? 1) / 3)), 0] : [...head, zoom, byte(Math.min(1, (look.speed ?? 1) / 3)), 0, 0];
    }
    if (type === 'strobe') {
        const blinder = look.blinder ?? 0;
        const strobe = look.strobe ?? 0;
        const level = master * Math.max(strobe, blinder, (look.strobeSteady ?? 0) * 0.5, (look.strobeRandom ?? 0) > 0 && (index + Math.floor(t * (look.strobeRandomRate ?? 2))) % 3 === 0 ? 0.6 : 0);
        return [byte(level), strobe > 0.05 ? byte(0.4 + 0.6 * strobe) : 0, strobe > 0.05 ? 40 : 255, 0];
    }
    if (type === 'laser') {
        const level = master * (look.laser ?? 0);
        const [r, g, b] = rgb(look.laserColor);
        return [level > 0.01 ? 255 : 0, byte(level), r, g, b, (look.laserChase ?? 0) > 0.5 ? 64 : 0, byte(Math.min(1, (look.laserSpread ?? 1) / 1.8)), 128,
            byte(0.5 + 0.5 * Math.max(-1, Math.min(1, look.laserTilt ?? 0))), byte(Math.min(1, (look.speed ?? 1) / 3)), byte(look.laserAmount ?? 1), 0];
    }
    if (type === 'hazer') return [byte(look.haze ?? 0), byte(0.4 + 0.4 * (look.haze ?? 0))];
    return new Array(fixture.channels).fill(0);
}

/** Every universe's 512 values for a look: { 1: Uint8Array(512), 2: … }. */
export function dmxFrame(patch, look, t = 0) {
    const universes = {};
    for (const f of patch) {
        const data = (universes[f.universe] ??= new Uint8Array(UNIVERSE_SIZE));
        const values = fixtureValues(f, look, t);
        for (let c = 0; c < f.channels; c++) data[f.address - 1 + c] = values[c] ?? 0;
    }
    return universes;
}

/** The fixture and channel name at a universe's channel (1-512), or null if the channel is free. */
export function channelInfo(patch, universe, channel) {
    const f = patch.find((x) => x.universe === universe && channel >= x.address && channel < x.address + x.channels);
    return f ? { fixture: f, channel: PROFILES[f.type][channel - f.address] } : null;
}

const SACN_ID = [0x41, 0x53, 0x43, 0x2d, 0x45, 0x31, 0x2e, 0x31, 0x37, 0x00, 0x00, 0x00]; // "ASC-E1.17"

/**
 * One sACN (E1.31) data packet for a universe: 638 bytes (a 126-byte header and the 512 values after
 * the DMX start code). Built for display; the page never opens a network connection.
 */
export function sacnPacket(universe, data, sequence = 0, source = 'StageVerse') {
    const packet = new Uint8Array(638);
    const view = new DataView(packet.buffer);
    // root layer
    view.setUint16(0, 0x0010);                 // preamble size
    view.setUint16(2, 0x0000);                 // postamble size
    packet.set(SACN_ID, 4);
    view.setUint16(16, 0x7000 | (638 - 16));   // flags and length
    view.setUint32(18, 0x00000004);            // vector: E1.31 data
    for (let i = 0; i < 16; i++) packet[22 + i] = (0x53 + i * 17) & 255; // sender id (CID), fixed for the demo
    // framing layer
    view.setUint16(38, 0x7000 | (638 - 38));
    view.setUint32(40, 0x00000002);            // vector: DMP data
    for (let i = 0; i < Math.min(63, source.length); i++) packet[44 + i] = source.charCodeAt(i) & 127;
    packet[108] = 100;                         // priority
    view.setUint16(109, 0);                    // synchronisation address
    packet[111] = sequence & 255;
    packet[112] = 0;                           // options
    view.setUint16(113, universe);
    // DMP layer
    view.setUint16(115, 0x7000 | (638 - 115));
    packet[117] = 0x02;                        // vector: set property
    packet[118] = 0xa1;                        // address and data type
    view.setUint16(119, 0x0000);               // first property address
    view.setUint16(121, 0x0001);               // address increment
    view.setUint16(123, 513);                  // property count: the start code and 512 values
    packet[125] = 0x00;                        // DMX start code
    packet.set(data.subarray(0, UNIVERSE_SIZE), 126);
    return packet;
}
