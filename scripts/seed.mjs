// Seeds one user per role, a venue, two shows with setlists, the demo fan's tickets and a song catalogue.
// Usage: npm run seed -- --yes     (reads MONGODB_URI from .env.local)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';
import Setlist from '../models/Setlist.js';
import Ticket from '../models/Ticket.js';
import Song from '../models/Song.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
}

const host = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).host;
if (!process.argv.includes('--yes')) {
    console.error(`Refusing to seed ${host} without --yes (this writes demo data).`);
    process.exit(1);
}

const PASSWORD = 'password123';

await mongoose.connect(uri);
console.log(`Seeding ${host}...`);

const hash = await bcrypt.hash(PASSWORD, 10);
const upsertUser = (role, name) => User.findOneAndUpdate(
    { email: `${role}@stageverse.demo` },
    { name, email: `${role}@stageverse.demo`, password: hash, role },
    { upsert: true, returnDocument: 'after' },
);

const [organizer, artist, crew, fan] = await Promise.all([
    upsertUser('organizer', 'Demo Organizer'),
    upsertUser('artist', 'Demo Artist'),
    upsertUser('production', 'Demo Crew'),
    upsertUser('fan', 'Demo Fan'),
]);

const venue = await Venue.findOneAndUpdate(
    { name: 'Demo Arena' },
    { name: 'Demo Arena', city: 'London', address: '1 Demo Way', capacity: '5000' },
    { upsert: true, returnDocument: 'after' },
);

// Two shows with the same team, so live sync can be checked for isolation (show A's events
// must never reach show B's screens). Short ids are fixed demo values; the app's counter
// continues above the highest existing id.
const SETLIST = [
    { title: 'Opening Lights', bpm: '128', duration: '03:40', key: 'Am' },
    { title: 'Midnight Drive', bpm: '96', duration: '04:10', key: 'F#m' },
    { title: 'Slow Burn', bpm: '72', duration: '05:05', key: 'D' },
    { title: 'Neon Run', bpm: '118', duration: '03:55', key: 'Cm' },
    { title: 'Encore Anthem', bpm: '140', duration: '04:30', key: 'E' },
];

const events = [];
for (const [i, title] of ['StageVerse Demo Night', 'StageVerse Demo Night 2'].entries()) {
    const event = await Event.findOneAndUpdate(
        { title },
        {
            title,
            eventId: 9001 + i,
            description: 'Seeded demo event',
            date: new Date(Date.now() + (7 + i) * 86400000),
            time: '8:00 PM',
            venue: venue._id,
            city: 'London',
            artist: artist.name,
            genre: 'Electronic',
            organizerId: organizer._id,
            artistId: artist._id,
            assignedTo: crew._id,
            status: 'Scheduled',
            ticketTiers: [{ name: 'GA', price: 50, capacity: 500 }],
        },
        { upsert: true, returnDocument: 'after' },
    );
    events.push(event);

    await Setlist.findOneAndUpdate(
        { eventId: event._id },
        { artistId: artist._id, eventId: event._id, items: SETLIST, showStatus: 'Standby', showWarning: false },
        { upsert: true, returnDocument: 'after' },
    );

    // The fan dashboard shows live polls for events the fan holds a ticket to.
    // Seeded directly: the purchase flow itself is parked (UPGRADE_PLAN.md).
    await Ticket.findOneAndUpdate(
        { userId: fan._id, eventId: event._id },
        { userId: fan._id, eventId: event._id, price: 50, seat: 'General Admission', qrCode: `DEMO-FAN-TICKET-${i + 1}` },
        { upsert: true, returnDocument: 'after' },
    );
}

// The artist's song catalogue (used by setlist building and the "suggest songs" fallback)
for (const s of SETLIST) {
    await Song.findOneAndUpdate(
        { artistId: artist._id, title: s.title },
        { artistId: artist._id, title: s.title, bpm: Number(s.bpm), duration: s.duration, key: s.key },
        { upsert: true, returnDocument: 'after' },
    );
}

console.log(`Shows: ${events.map((e) => `${e.title} (/events/${e._id}, short id ${e.eventId})`).join('; ')}`);

console.log(`Done. Log in as organizer|artist|production|fan @stageverse.demo with "${PASSWORD}".`);
await mongoose.disconnect();
