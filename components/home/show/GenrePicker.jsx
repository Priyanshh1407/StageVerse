'use client';

import { useState } from 'react';
import { CircleHelp, Search, ArrowRight } from 'lucide-react';
import { ARTISTS, findArtists, GENRE_HINTS, GENRE_KEYS, GENRES } from '@/lib/show/genres';

/**
 * The playground's first step (item 14): pick a genre, then its songs. Each genre is analysed and
 * lit its own way. "Which genre is my song?" opens an artist search and the artists per genre, for
 * visitors who know the artist but not the genre; picking an artist picks their genre.
 * `counts` is the number of demo songs per genre.
 */
export default function GenrePicker({ value, onChange, counts = {} }) {
    const [help, setHelp] = useState(false);
    const [query, setQuery] = useState('');
    const matches = findArtists(query).slice(0, 5);

    return (
        <div>
            <div role="radiogroup" aria-label="Genre" className="grid grid-cols-2 gap-2">
                {GENRE_KEYS.map((key) => (
                    <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}
                        className="group text-left rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 hover:border-cyan-300 hover:bg-white/10 transition-colors">
                        <span className="flex items-center justify-between font-bold">
                            {GENRES[key].label}
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-300" aria-hidden />
                        </span>
                        <span className="block mt-0.5 text-[11px] leading-snug text-gray-400">{GENRE_HINTS[key]}</span>
                        {counts[key] ? <span className="block mt-1 text-[10px] font-mono tracking-wider text-cyan-300/80">{counts[key]} DEMO SONG{counts[key] > 1 ? 'S' : ''}</span> : null}
                    </button>
                ))}
            </div>

            <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} aria-controls="genre-help"
                className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-300">
                <CircleHelp className="w-3.5 h-3.5" aria-hidden /> Which genre is my song?
            </button>
            {help && (
                <div id="genre-help" className="mt-2 rounded-xl border border-white/10 bg-black/50 p-3 text-xs">
                    <label className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 mb-2">
                        <Search className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Artist, e.g. Maroon 5"
                            aria-label="Search for an artist" className="w-full bg-transparent outline-none text-white placeholder:text-gray-500" />
                    </label>
                    {query ? (
                        <ul className="space-y-1" aria-live="polite">
                            {matches.length ? matches.map(({ artist, genre }) => (
                                <li key={artist}>
                                    <button type="button" onClick={() => onChange(genre)}
                                        className="w-full flex justify-between gap-2 rounded-md px-2 py-1 hover:bg-white/10 text-left">
                                        <span>{artist}</span><span className="font-bold text-cyan-300">{GENRES[genre].label}</span>
                                    </button>
                                </li>
                            )) : <li className="text-gray-400 px-2">Not in the list. Pick the closest genre from the descriptions above.</li>}
                        </ul>
                    ) : (
                        <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 text-gray-400 leading-snug">
                            {GENRE_KEYS.map((key) => (
                                <p key={key}><b className="text-white">{GENRES[key].label}:</b> {ARTISTS[key].join(', ')}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
