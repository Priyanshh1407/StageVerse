// Seeds one user per role, a venue, an event linking them, and a setlist.
// Usage: npm run seed -- --yes     (reads MONGODB_URI from .env.local)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';
import Setlist from '../models/Setlist.js';

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
    { upsert: true, new: true },
);

const [organizer, artist, crew] = await Promise.all([
    upsertUser('organizer', 'Demo Organizer'),
    upsertUser('artist', 'Demo Artist'),
    upsertUser('production', 'Demo Crew'),
    upsertUser('fan', 'Demo Fan'),
]);

const venue = await Venue.findOneAndUpdate(
    { name: 'Demo Arena' },
    { name: 'Demo Arena', city: 'London', address: '1 Demo Way', capacity: '5000' },
    { upsert: true, new: true },
);

const event = await Event.findOneAndUpdate(
    { title: 'StageVerse Demo Night' },
    {
        title: 'StageVerse Demo Night',
        description: 'Seeded demo event',
        date: new Date(Date.now() + 7 * 86400000),
        time: '8:00 PM',
        venue: venue._id,
        city: 'London',
        artist: artist.name,
        organizerId: organizer._id,
        artistId: artist._id,
        assignedTo: crew._id,
        status: 'Scheduled',
        ticketTiers: [{ name: 'GA', price: 50, capacity: 500 }],
    },
    { upsert: true, new: true },
);

await Setlist.findOneAndUpdate(
    { eventId: event._id },
    {
        artistId: artist._id,
        eventId: event._id,
        items: ['Opening Lights', 'Midnight Drive', 'Encore Anthem'].map((title) => ({ title })),
    },
    { upsert: true, new: true },
);

console.log(`Done. Log in as organizer|artist|production|fan @stageverse.demo with "${PASSWORD}".`);
await mongoose.disconnect();
