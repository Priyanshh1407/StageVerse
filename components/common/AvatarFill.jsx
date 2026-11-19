'use client';

import Image from 'next/image';

/** "Priya Sharma" -> "PS"; one name -> its first letter. */
export const initialsOf = (name = '') =>
    String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

/**
 * A person's picture, filling its (round, relative) frame: their photo when they have one, otherwise their
 * initials, never a stranger's stock photo. `size`: the initials' text size class.
 */
export default function AvatarFill({ src, name, size = 'text-lg' }) {
    if (src) return <Image src={src} alt={name || 'Profile photo'} fill className="object-cover" sizes="160px" />;
    return (
        <div role="img" aria-label={name || 'Profile'} className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] font-bold text-black ${size}`}>
            {initialsOf(name)}
        </div>
    );
}
