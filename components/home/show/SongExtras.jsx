'use client';

import { useEffect, useState } from 'react';
import { addAfterEffect } from '@react-three/fiber';
import { Check, Download, Info, Link2, X } from 'lucide-react';
import { songLink } from '@/lib/show/share';

// Extras for a playing song, each behind its own switch (lib/features.js):
//   share        a link that opens this song at this moment, and a poster of the stage as it looks now
//   how it works what the analysis found and why the rig is doing what it does, live

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** The stage canvas as it looks right now, with the song's name on it, saved as a JPEG. */
function savePoster(stage, show) {
    const source = stage?.querySelector('canvas');
    if (!source) return;
    // a WebGL canvas can only be read in the frame it was drawn: wait for the next one
    const stop = addAfterEffect(() => {
        stop();
        const poster = document.createElement('canvas');
        poster.width = source.width;
        poster.height = source.height;
        const ctx = poster.getContext('2d');
        ctx.drawImage(source, 0, 0);
        const w = poster.width;
        const h = poster.height;
        const unit = w / 100;
        const shade = ctx.createLinearGradient(0, h * 0.62, 0, h);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, h * 0.62, w, h * 0.38);
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${unit * 4.2}px system-ui, sans-serif`;
        ctx.fillText(show.title, unit * 4, h - unit * 7.5, w - unit * 8);
        ctx.fillStyle = '#ffb000';
        ctx.font = `600 ${unit * 1.7}px system-ui, sans-serif`;
        ctx.fillText(`${show.artist ? `${show.artist} · ` : ''}lit by StageVerse · stage-verse.vercel.app`, unit * 4, h - unit * 4, w - unit * 8);
        poster.toBlob((blob) => {
            if (!blob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `stageverse-${(show.slug ?? show.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        }, 'image/jpeg', 0.92);
    });
}

/** Share buttons for the now-playing panel. */
export function ShareButtons({ show, time, stage }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(songLink(show.slug, time, window.location.origin));
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard blocked: nothing to do */ }
    };
    const button = 'flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20';
    return (
        <>
            {show.slug && (
                <button type="button" onClick={copy} className={button} title="Copy a link that opens this song at this moment">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Link'}
                </button>
            )}
            <button type="button" onClick={() => savePoster(stage.current, show)} className={button} title="Save a picture of the stage as it looks now">
                <Download className="h-3.5 w-3.5" /> Poster
            </button>
        </>
    );
}

const SECTION_WHY = {
    intro: 'A quiet opening: few lights, slow movement, so there is somewhere to build to.',
    verse: 'A verse: steady and held back, the lights leave room for the voice.',
    groove: 'A groove: the beat is in, the rig moves on it but keeps something back.',
    build: 'A build: the energy is rising, so the movement tightens and speeds up towards the drop.',
    peak: 'A peak: the loudest part, so every group is on, at full speed, with strobes on the phrases.',
    breakdown: 'A breakdown: the drums drop out, so the rig goes soft and wide.',
    outro: 'The ending: the rig winds down with the music.',
};
const HIT_WHY = {
    drop: 'The drop: the first beat of a peak',
    burst: 'A burst: the loudness jumped suddenly here',
    strobe: 'Strobes: the start of a phrase in a loud part',
    blinder: 'Blinders: the start of a phrase',
    co2: 'CO2: with the drop, or as an accent on the beat',
    co2Truss: 'CO2 from the truss: with the floor jets on a big moment',
    confetti: 'Confetti: a drop, or the finale',
    streamers: 'Streamers: one burst on a big drop or in the finale',
    firework: 'Fireworks: stage pyro on drops, shells only in the finale',
};

/** What the analysis found, and what the rig is doing about it right now. */
export function HowItWorks({ show, control, onClose }) {
    const [t, setT] = useState(0);
    useEffect(() => {
        let frame;
        let last = 0;
        const tick = (now) => {
            // about 20 times a second is enough for the beat dots
            if (now - last > 50) { last = now; setT(control.current.audio?.currentTime ?? 0); }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [control]);

    const beats = show.beats ?? [];
    let beat = 0;
    while (beat + 1 < beats.length && beats[beat + 1] <= t) beat++;
    const meter = show.meter ?? 4;
    const section = show.sections.find((s) => t >= s.start && t < s.end);
    const cue = [...(show.cues ?? [])].reverse().find((c) => c.t <= t);
    const energy = show.energy?.[Math.min(show.energy.length - 1, Math.floor(t * 2))] ?? 0;
    const recent = (show.hits ?? []).filter((h) => HIT_WHY[h.kind] && h.t <= t && h.t > t - 6).slice(-4).reverse();
    const next = (show.hits ?? []).find((h) => h.t > t && ['drop', 'co2', 'confetti', 'streamers', 'firework'].includes(h.kind));

    return (
        <aside className="absolute left-4 top-20 z-30 w-[19rem] rounded-2xl border border-white/10 bg-black/75 p-4 text-white backdrop-blur-md" aria-label="How the light show works">
            <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-mono text-xs tracking-[0.25em] text-amber-300"><Info className="h-3.5 w-3.5" /> HOW IT WORKS</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs leading-snug text-gray-300">Before the song played, StageVerse found its tempo, every beat and its sections. The show is programmed from those; nothing is random.</p>

            <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-mono text-gray-400">{show.bpm} BPM · bar {Math.floor(beat / meter) + 1}</span>
                <span className="flex gap-1.5" aria-hidden>
                    {Array.from({ length: meter }, (_, i) => (
                        <span key={i} className={`h-2.5 w-2.5 rounded-full ${beat % meter === i ? (i === 0 ? 'bg-amber-300' : 'bg-white') : 'bg-white/20'}`} />
                    ))}
                </span>
            </div>
            <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400"><span>Loudness</span><span>{Math.round(energy * 100)}%</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" style={{ width: `${Math.round(energy * 100)}%` }} /></div>
            </div>

            {section && (
                <div className="mt-3">
                    <div className="text-xs font-bold uppercase tracking-wider">{section.label ?? section.kind} <span className="font-mono font-normal text-gray-400">{fmt(section.start)}–{fmt(section.end)}</span></div>
                    <p className="text-xs leading-snug text-gray-300">{SECTION_WHY[section.kind] ?? ''}</p>
                </div>
            )}
            {cue?.name && <p className="mt-2 text-xs text-gray-300"><span className="text-gray-400">Cue now:</span> <b className="text-white">{cue.name}</b> (since {fmt(cue.t)})</p>}

            <div className="mt-3 min-h-[4.5rem] border-t border-white/10 pt-2">
                <div className="text-xs uppercase tracking-wider text-gray-400">Just fired</div>
                {recent.length === 0 && <p className="text-xs text-gray-400">Nothing in the last few seconds.</p>}
                <ul className="space-y-0.5">
                    {recent.map((h, i) => <li key={`${h.t}-${h.kind}-${i}`} className="text-xs text-gray-200"><span className="font-mono text-gray-400">{fmt(h.t)}</span> {HIT_WHY[h.kind] ?? h.kind}</li>)}
                </ul>
            </div>
            {next && <p className="mt-2 text-xs text-gray-400">Next effect in <b className="text-white">{Math.max(0, next.t - t).toFixed(1)} s</b>: {(HIT_WHY[next.kind] ?? next.kind).split(':')[0].toLowerCase()}</p>}
        </aside>
    );
}
