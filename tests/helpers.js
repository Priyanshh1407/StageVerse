import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Venue from '@/models/Venue';
import Event from '@/models/Event';
import Setlist from '@/models/Setlist';
import Poll from '@/models/Poll';

export function tokenFor(user) {
    return new SignJWT({ userId: String(user._id), role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

/**
 * Build a NextRequest. Pass `as: user` to send that user's session cookie.
 * Also exposes the cookie to the mocked next/headers cookies().
 */
export async function req(method, path, { body, as, token } = {}) {
    const headers = { 'content-type': 'application/json' };
    const cookieToken = token ?? (as ? await tokenFor(as) : undefined);
    globalThis.__testCookies = cookieToken ? { token: cookieToken } : {};
    if (cookieToken) headers.cookie = `token=${cookieToken}`;
    return new NextRequest(new URL(path, 'http://localhost:3000'), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

export function params(obj) {
    return { params: Promise.resolve(obj) };
}

let counter = 0;
export async function makeUser(role = 'fan', overrides = {}) {
    counter += 1;
    return User.create({
        name: `${role} ${counter}`,
        email: `${role}${counter}@test.dev`,
        password: await bcrypt.hash('password123', 4),
        role,
        ...overrides,
    });
}

/** One organizer, artist, crew member and fan, plus an event linking them. */
export async function makeWorld() {
    const organizer = await makeUser('organizer');
    const artist = await makeUser('artist');
    const crew = await makeUser('production');
    const fan = await makeUser('fan');
    const venue = await Venue.create({ name: `Venue ${counter}`, city: 'London', address: '1 Test St', capacity: 1000 });
    const event = await Event.create({
        eventId: 1000 + counter,
        title: 'Test Show',
        description: 'A test event',
        date: new Date(Date.now() + 86400000),
        time: '8:00 PM',
        venue: venue._id,
        city: 'London',
        artist: artist.name,
        organizerId: organizer._id,
        artistId: artist._id,
        assignedTo: crew._id,
        status: 'Scheduled',
        ticketTiers: [{ name: 'GA', price: 50, capacity: 100, sold: 0 }],
    });
    const setlist = await Setlist.create({
        artistId: artist._id,
        eventId: event._id,
        items: [{ title: 'Song A' }, { title: 'Song B' }, { title: 'Song C' }],
    });
    return { organizer, artist, crew, fan, venue, event, setlist };
}

export async function makePoll(eventId, { isActive = true } = {}) {
    return Poll.create({
        eventId,
        question: 'Encore?',
        options: [{ text: 'Song A' }, { text: 'Song B' }],
        isActive,
    });
}

export async function json(res) {
    return { status: res.status, body: await res.json() };
}
