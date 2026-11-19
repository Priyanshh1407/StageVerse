// The four roles: where each one's pages start, and how a role is named to a person. One map for the login, the
// menu and the page gate (proxy.js), so a role can never land on another role's home.

export const ROLES = ['fan', 'artist', 'organizer', 'production'];

export const HOME_FOR = {
    fan: '/dashboard',
    artist: '/artist-dashboard',
    organizer: '/manage/dashboard',
    production: '/prod-dashboard',
};

/** The role's home page ('/' for an unknown role). */
export const homeFor = (role) => HOME_FOR[String(role ?? '').toLowerCase()] ?? '/';

/** How each role is named to a person, with what it is for (the sign-up's cards). */
export const ROLE_INFO = {
    fan: { label: 'Fan', blurb: 'Find shows, vote on the setlist and keep your concert memories.' },
    artist: { label: 'Artist', blurb: 'Plan your setlists, tech riders, day sheets and guest lists.' },
    organizer: { label: 'Organizer', blurb: 'Create events and bring the artist and the crew onto one timeline.' },
    production: { label: 'Crew', blurb: 'Run the lighting patch, the tasks and the show calls.' },
};

/** A page to return to after signing in: only a path on this site (never another site). */
export function safeNext(next) {
    if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
    if (next.startsWith('/login') || next.startsWith('/signup')) return null;
    return next;
}
