'use client';

import { useState } from 'react';
import { CircleHelp, Search } from 'lucide-react';
import { ARTISTS, findArtists, GENRE_HINTS, GENRE_KEYS, GENRES } from '@/lib/show/genres';

/**
 * The genre of the visitor's own song (item 14): each genre is analysed and lit its own way.
 * The help button lists which artists go in which genre, with a search, for visitors who know the
 * artist but not the genre. Picking an artist picks their genre.
 */
export default function GenrePicker({ value, onChange, disabled }) {
    const [help, setHelp] = useState(false);
    const [query, setQuery] = useState('');
    const matches = findArtists(query).slice(0, 6);

    return (
        <div className="mb-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                <span id="genre-label">Your song&apos;s genre</span>
                <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} aria-controls="genre-help"
                    aria-label="Which genre is my song?" title="Which genre is my song?"
                    className="p-0.5 rounded-full text-gray-400 hover:text-cyan-300">
                    <CircleHelp className="w-3.5 h-3.5" aria-hidden />
                </button>
            </div>
            <div role="radiogroup" aria-labelledby="genre-label" className="flex flex-wrap gap-1.5">
                {GENRE_KEYS.map((key) => (
                    <button key={key} type="button" role="radio" aria-checked={value === key} disabled={disabled} onClick={() => onChange(key)}
                        title={GENRE_HINTS[key]}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors disabled:opacity-60 ${value === key ? 'bg-cyan-300 text-black border-cyan-300' : 'border-white/20 text-gray-200 hover:border-white/60'}`}>
                        {GENRES[key].label}
                    </button>
                ))}
            </div>

            {help && (
                <div id="genre-help" className="mt-2 rounded-xl border border-white/10 bg-black/50 p-3 text-xs">
                    <p className="text-gray-300 mb-2">Know the artist but not the genre? Search for them, or find them below.</p>
                    <label className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 mb-2">
                        <Search className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Artist, e.g. Maroon 5"
                            aria-label="Search for an artist" className="w-full bg-transparent outline-none text-white placeholder:text-gray-500" />
                    </label>
                    {query && (
                        <ul className="mb-2 space-y-1" aria-live="polite">
                            {matches.length ? matches.map(({ artist, genre }) => (
                                <li key={artist}>
                                    <button type="button" onClick={() => { onChange(genre); setHelp(false); setQuery(''); }}
                                        className="w-full flex justify-between gap-2 rounded-md px-2 py-1 hover:bg-white/10 text-left">
                                        <span>{artist}</span><span className="font-bold text-cyan-300">{GENRES[genre].label}</span>
                                    </button>
                                </li>
                            )) : <li className="text-gray-400 px-2">Not in the list. Pick the closest genre from the descriptions below.</li>}
                        </ul>
                    )}
                    <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                        {GENRE_KEYS.map((key) => (
                            <div key={key}>
                                <div className="font-bold text-white">{GENRES[key].label} <span className="font-normal text-gray-400">· {GENRE_HINTS[key]}</span></div>
                                <div className="text-gray-400 leading-snug">{ARTISTS[key].join(', ')}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
