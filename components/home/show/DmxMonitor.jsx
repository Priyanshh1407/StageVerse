'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { channelInfo, dmxFrame, sacnPacket, showPatch } from '@/lib/dmx/monitor';
import { laserLayout, rigLayout, strobeLayout } from '@/components/home/stage/rigLayout';

// The DMX monitor: the 512 channel values of each universe the show would send to a real rig, live,
// from the same look the 3D stage is drawing. Display only: nothing is sent anywhere.

const COLS = 32;
const ROWS = 16;
const CELL = 13;
const TYPE_COLORS = { beam: '#ffb000', wash: '#a855f7', strobe: '#fff3a0', laser: '#ff3d7a', hazer: '#8d96a8' };
const hex = (n) => n.toString(16).padStart(2, '0');

export default function DmxMonitor({ look, beams }) {
    const canvas = useRef(null);
    const [universe, setUniverse] = useState(1);
    const [hover, setHover] = useState(null);
    const [bytes, setBytes] = useState('');
    const frame = useRef({});

    // the rig on stage right now, patched from address 1
    const patch = useMemo(() => {
        const heads = rigLayout(beams);
        const count = (role) => heads.filter((f) => f.role === role).length;
        return showPatch({ aerial: count('aerial'), sides: count('sides'), floor: count('floor'), wash: count('wash'), strobes: strobeLayout(beams).length, lasers: laserLayout(beams).length, hazers: 2 });
    }, [beams]);
    const universes = useMemo(() => [...new Set(patch.map((f) => f.universe))].sort((a, b) => a - b), [patch]);
    const shown = universes.includes(universe) ? universe : universes[0];
    const used = patch.reduce((n, f) => n + f.channels, 0);

    useEffect(() => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx) return undefined;
        const owner = new Array(512).fill(null);
        for (const f of patch) if (f.universe === shown) for (let c = 0; c < f.channels; c++) owner[f.address - 1 + c] = f.type;
        let sequence = 0;
        const draw = () => {
            frame.current = dmxFrame(patch, look.current ?? {}, performance.now() / 1000);
            const data = frame.current[shown] ?? new Uint8Array(512);
            ctx.fillStyle = '#07080c';
            ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
            for (let i = 0; i < 512; i++) {
                const x = (i % COLS) * CELL;
                const y = Math.floor(i / COLS) * CELL;
                // a patched channel is a dim cell that fills from the bottom with its value; a free one stays dark
                ctx.fillStyle = owner[i] ? '#1a1c24' : '#0c0d12';
                ctx.fillRect(x, y, CELL - 1, CELL - 1);
                if (owner[i] && data[i] > 0) {
                    const h = Math.max(1, Math.round(((CELL - 1) * data[i]) / 255));
                    ctx.fillStyle = TYPE_COLORS[owner[i]];
                    ctx.fillRect(x, y + CELL - 1 - h, CELL - 1, h);
                }
            }
            // the first bytes of this universe's sACN packet (its header, then the first values)
            const packet = sacnPacket(shown, data, sequence++ & 255);
            setBytes(`${[...packet.slice(108, 126)].map(hex).join(' ')} | ${[...packet.slice(126, 142)].map(hex).join(' ')} …`);
        };
        draw();
        const timer = setInterval(draw, 100);
        return () => clearInterval(timer);
    }, [patch, shown, look]);

    const onMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const col = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
        const row = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
        const channel = row * COLS + col + 1;
        if (channel < 1 || channel > 512) return setHover(null);
        const info = channelInfo(patch, shown, channel);
        setHover({ channel, value: frame.current[shown]?.[channel - 1] ?? 0, info });
    };

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                    {universes.map((u) => (
                        <button key={u} type="button" onClick={() => setUniverse(u)} aria-pressed={u === shown}
                            className={`rounded px-2 py-1 text-[10px] font-bold ${u === shown ? 'bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black' : 'bg-white/10 text-gray-300 hover:bg-white/15'}`}>
                            UNIVERSE {u}
                        </button>
                    ))}
                </div>
                <span className="font-mono text-[10px] text-gray-400">{patch.length} fixtures · {used} channels</span>
            </div>
            <canvas ref={canvas} width={COLS * CELL} height={ROWS * CELL} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
                className="w-full rounded border border-white/10" style={{ imageRendering: 'pixelated' }} role="img" aria-label={`The 512 channel values of universe ${shown}`} />
            <p className="mt-1 h-4 font-mono text-[10px] text-gray-300">
                {hover
                    ? hover.info ? `ch ${hover.channel} = ${hover.value}  ·  ${hover.info.fixture.name}: ${hover.info.channel} (address ${hover.info.fixture.address})` : `ch ${hover.channel}: free`
                    : 'Point at a channel to see whose it is.'}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
                {Object.entries(TYPE_COLORS).map(([type, color]) => (
                    <span key={type} className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: color }} />{type}</span>
                ))}
            </div>
            <p className="mt-1.5 truncate font-mono text-[9px] text-gray-500" title="Bytes 108-141 of this universe's sACN (E1.31) packet: priority, sequence, universe, the DMP header, then the first channel values">sACN {bytes}</p>
            <p className="mt-1 text-[10px] leading-snug text-gray-500">What the show would send to a real rig: {universes.length} sACN packets of 638 bytes, 40 times a second. A simulation: nothing leaves this page.</p>
        </div>
    );
}
