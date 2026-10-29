// Seeds a full, realistic demo around the four demo accounts (one per role), so every dashboard
// has something to show: a seven-date tour (two past, five coming up) with ticket sales, setlists,
// a song catalogue, guest lists, tech riders, day sheets, DMX patches, production tasks and crew,
// polls, predictions, memories and notifications, plus a crowd of fans who bought tickets.
// It seeds two teams, each with its own copy of the tour: the testing team (the testing guide's
// accounts) and the recruiter team (public demo logins for the live site, see docs/DEPLOYMENT.md).
// Usage: npm run seed -- --yes     (reads MONGODB_URI from .env.local)
//
// Safe to re-run: it resets the demo shows (both "Demo Night" shows go back to Standby) and
// replaces only data it created. Existing demo accounts keep their names and passwords; empty
// profile fields (bio, location, avatar, socials) are filled in. Dates are relative to today,
// so the "upcoming" shows are always upcoming.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';
import Setlist from '../models/Setlist.js';
import Ticket from '../models/Ticket.js';
import Song from '../models/Song.js';
import Guest from '../models/Guest.js';
import Task from '../models/Task.js';
import Logistics from '../models/Logistics.js';
import Patch from '../models/Patch.js';
import Poll from '../models/Poll.js';
import Vote from '../models/Vote.js';
import Prediction from '../models/Prediction.js';
import Memory from '../models/Memory.js';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';
import Counter from '../models/Counter.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
}

// Only the host part, for messages; never parse with URL (it throws on multi-host strings and
// the error would print the whole string, password included)
const host = (uri.split('@').pop() ?? '').split(/[/?]/)[0].split(',')[0] || 'the database';
if (!process.argv.includes('--yes')) {
    console.error(`Refusing to seed ${host} without --yes (this writes demo data).`);
    process.exit(1);
}

const PASSWORD = 'password123';
// Public: printed in the README for recruiters. These accounts are reset on every run.
const RECRUITER_PASSWORD = 'stageverse-demo';

// The same "random" data on every run
let seed = 20261028;
const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

const DAY = 86400000;
const today = new Date();
today.setHours(0, 0, 0, 0);
/** A date `days` from today at `hour`:`minute` local time. */
const day = (days, hour = 20, minute = 0) => new Date(today.getTime() + days * DAY + (hour * 60 + minute) * 60000);
const ago = (hours) => new Date(Date.now() - hours * 3600000);
const shortDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const img = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;
const CONCERT = [
    '1470225620780-dba8ba36b745', '1492684223066-81342ee5ff30', '1540039155733-5bb30b53aa14',
    '1501386761578-eac5c94b800a', '1506157786151-b8491531f063', '1429962714451-bb934ecdc4ec',
    '1514525253161-7a46d19cd819', '1470229538611-16ba8c7ffbd7', '1493225255756-d9584f8606e9',
    '1516450360452-9312f5e86fc7', '1501612780327-45045538702b', '1508700115892-45ecd05ae2ad',
];
const PORTRAITS = [
    '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e', '1438761681033-6461ffad8d80',
    '1507003211169-0a1dd7228f2d', '1544005313-94ddf0286df2', '1506794778202-cad84cf45f1d',
    '1534528741775-53994a69daeb', '1517841905240-472988babdf9', '1531746020798-e6953c6e8e04',
    '1535713875002-d1d0cf377fde', '1570295999919-56ceb5ecca61',
];

await mongoose.connect(uri);
console.log(`Seeding ${host}...`);

// ---------------------------------------------------------------- accounts
const hash = await bcrypt.hash(PASSWORD, 10);
const PROFILES = {
    organizer: {
        name: 'Demo Organizer', location: 'Mumbai, India', avatar: img(PORTRAITS[3], 400),
        bio: 'Promoter behind the Neon Skyline Tour. Ten years of arena and festival shows across India.',
        socials: { instagram: '@skyline.live', twitter: '@skylinelive' },
    },
    artist: {
        name: 'Demo Artist', location: 'Mumbai, India', avatar: img(PORTRAITS[2], 400),
        bio: 'Electronic producer and live act. Synths, big drops and a light show built around every song. Currently on the Neon Skyline Tour.',
        socials: { instagram: '@neonskyline', twitter: '@neonskyline' },
        stats: { showsAttended: 86, citiesVisited: 24 },
    },
    production: {
        name: 'Demo Crew', location: 'Mumbai, India', avatar: img(PORTRAITS[1], 400),
        bio: 'Production manager and lighting programmer. grandMA3, DMX patching and very early load-ins.',
        socials: { instagram: '@alex.on.tour', twitter: '' },
    },
    fan: {
        name: 'Demo Fan', location: 'Mumbai, India', avatar: img(PORTRAITS[8], 400),
        bio: 'Front row whenever possible. Electronic, indie and anything with a good light show.',
        socials: { instagram: '@frontrow.diaries', twitter: '@frontrowdiaries' },
        stats: { showsAttended: 2, citiesVisited: 2 },
    },
};

const recruiterHash = await bcrypt.hash(RECRUITER_PASSWORD, 10);
const RECRUITERS = {
    organizer: { name: 'Rhea Kapoor', bio: 'Promoter behind the Afterglow Tour. Arena shows and festivals across India.', avatar: PORTRAITS[4] },
    artist: { name: 'Aria Sen', bio: 'Electronic artist and live act on the Afterglow Tour: synths, big drops and a light show built around every song.', avatar: PORTRAITS[6] },
    production: { name: 'Alex Morrison', bio: 'Production manager and lighting programmer. grandMA3, DMX patching and early load-ins.', avatar: PORTRAITS[1] },
    fan: { name: 'Maya Iyer', bio: 'Front row whenever possible. Electronic, indie and anything with a good light show.', avatar: PORTRAITS[7] },
};

/** A recruiter login (recruiter.<role>@stageverse.demo): name, password and profile reset on every run. */
async function recruiterUser(role) {
    const p = RECRUITERS[role];
    const email = `recruiter.${role === 'production' ? 'crew' : role}@stageverse.demo`;
    return User.findOneAndUpdate(
        { email },
        { email, role, name: p.name, password: recruiterHash, bio: p.bio, avatar: img(p.avatar, 400), location: 'Mumbai, India', socials: { instagram: `@${p.name.toLowerCase().replace(' ', '.')}`, twitter: '' } },
        { upsert: true, returnDocument: 'after' },
    );
}

/** Find or create a demo account. Existing accounts keep their name and password; blank profile fields are filled. */
async function demoUser(role) {
    const { name, ...profile } = PROFILES[role];
    const email = `${role}@stageverse.demo`;
    let user = await User.findOne({ email });
    if (!user) user = new User({ email, name, password: hash, role });
    for (const key of ['location', 'avatar', 'bio']) if (!user[key]) user[key] = profile[key];
    if (!user.socials?.instagram && !user.socials?.twitter) user.socials = profile.socials;
    if (profile.stats && !user.stats?.showsAttended) user.stats = profile.stats;
    await user.save();
    return user;
}


// A crowd of fans who bought tickets (they don't log in: each gets a random password)
const CROWD = [
    'Aarav Mehta', 'Diya Kapoor', 'Kabir Malhotra', 'Isha Reddy', 'Rohan Iyer', 'Meera Nair',
    'Arjun Sethi', 'Tara Fernandes', "Neil D'Souza", 'Zoya Khan', 'Siddharth Rao', 'Anika Bose',
    'Vihaan Joshi', 'Saanvi Pillai', 'Kunal Bhatt', 'Riya Chatterjee',
];
const CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'New Delhi', 'Hyderabad', 'Goa'];
const crowdHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
const crowd = [];
for (const [i, name] of CROWD.entries()) {
    const email = `${name.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.')}@crowd.stageverse.demo`;
    crowd.push(await User.findOneAndUpdate(
        { email },
        {
            $set: { name, role: 'fan', avatar: img(PORTRAITS[i % PORTRAITS.length], 400), location: `${CITIES[i % CITIES.length]}, India` },
            $setOnInsert: { email, password: crowdHash },
        },
        { upsert: true, returnDocument: 'after' },
    ));
}

// ---------------------------------------------------------------- venues
// Real venues; existing ones are reused as they are
const VENUES = {
    nesco: { name: 'NESCO', city: 'Mumbai', address: 'Western Express Highway, Goregaon East', capacity: '20000', type: 'Exhibition Centre' },
    jln: { name: 'Jawaharlal Nehru Stadium', city: 'New Delhi', address: 'Pragati Vihar, Lodhi Road', capacity: '60000', type: 'Stadium' },
    jwg: { name: 'Jio World Garden', city: 'Mumbai', address: 'Bandra Kurla Complex, Bandra East', capacity: '15000', type: 'Outdoor Venue' },
    palace: { name: 'Palace Grounds', city: 'Bengaluru', address: 'Jayamahal Main Road, Vasanth Nagar', capacity: '30000', type: 'Outdoor Grounds', image: img(CONCERT[7]) },
    balayogi: { name: 'GMC Balayogi Athletic Stadium', city: 'Hyderabad', address: 'Gachibowli', capacity: '30000', type: 'Stadium', image: img(CONCERT[9]) },
    mahalaxmi: { name: 'Mahalaxmi Lawns', city: 'Pune', address: 'Karve Nagar', capacity: '12000', type: 'Outdoor Lawns', image: img(CONCERT[3]) },
    racecourse: { name: 'Mahalaxmi Race Course', city: 'Mumbai', address: 'Keshavrao Khadye Marg, Mahalaxmi', capacity: '35000', type: 'Racecourse Grounds', image: img(CONCERT[0]) },
    nsic: { name: 'NSIC Exhibition Grounds', city: 'New Delhi', address: 'Okhla Industrial Estate, Phase III', capacity: '20000', type: 'Exhibition Grounds', image: img(CONCERT[8]) },
};
const venues = {};
for (const [key, v] of Object.entries(VENUES)) {
    venues[key] = await Venue.findOneAndUpdate(
        { name: v.name },
        { $setOnInsert: { ...v, policies: { parking: true, bagPolicy: 'Small bags only' }, description: `${v.name}, ${v.city}.` } },
        { upsert: true, returnDocument: 'after' },
    );
}

/**
 * One team's whole tour. `offset` moves the short ids (testing team 9001..., recruiters +200),
 * `shift` moves the upcoming dates so two teams don't play the same venue on the same night.
 */
async function seedTeam({ organizer, artist, crew, fan, offset, shift, tour, nightTitles, ticketPrefix, friends }) {
// ---------------------------------------------------------------- songs
// The first five are the testing guide's setlist (docs/MANUAL_TESTING.md uses "Opening Lights")
const SONGS = [
    { title: 'Opening Lights', bpm: 128, duration: '03:40', key: 'Am', tags: ['Opener', 'High Energy'], color: 'blue' },
    { title: 'Midnight Drive', bpm: 96, duration: '04:10', key: 'F#m', tags: ['Groove'], color: 'purple' },
    { title: 'Slow Burn', bpm: 72, duration: '05:05', key: 'D', tags: ['Ballad'], color: 'amber' },
    { title: 'Neon Run', bpm: 118, duration: '03:55', key: 'Cm', tags: ['High Energy'], color: 'pink' },
    { title: 'Encore Anthem', bpm: 140, duration: '04:30', key: 'E', tags: ['Encore', 'Singalong'], color: 'red' },
    { title: 'Skyline', bpm: 124, duration: '04:02', key: 'Gm', tags: ['Single', 'High Energy'], color: 'blue' },
    { title: 'Glass Hearts', bpm: 110, duration: '03:48', key: 'Bb', tags: ['Singalong'], color: 'pink' },
    { title: 'Monsoon Static', bpm: 100, duration: '04:20', key: 'Ebm', tags: ['Groove'], color: 'green' },
    { title: 'Afterglow', bpm: 86, duration: '04:45', key: 'C', tags: ['Ballad', 'Acoustic'], color: 'amber' },
    { title: 'Satellites', bpm: 132, duration: '03:35', key: 'F', tags: ['High Energy'], color: 'purple' },
    { title: 'Lost in Bandra', bpm: 122, duration: '03:58', key: 'Dm', tags: ['Fan Favourite'], color: 'green' },
    { title: 'Gold Hour', bpm: 76, duration: '04:12', key: 'A', tags: ['Ballad'], color: 'amber' },
];
const songIds = {};
for (const s of SONGS) {
    const doc = await Song.findOneAndUpdate(
        { artistId: artist._id, title: s.title },
        { artistId: artist._id, ...s },
        { upsert: true, returnDocument: 'after' },
    );
    songIds[s.title] = doc._id;
}

// Running orders: tonight's set (upcoming shows) and the one played on the tour so far
const TAG_COLORS = { 'High Energy': 'orange', Ballad: 'blue', Encore: 'red', Singalong: 'pink', Groove: 'purple', Opener: 'green' };
const UPCOMING_SET = [
    ['Opening Lights', 'Kabuki drop on the first downbeat'],
    ['Midnight Drive', ''],
    ['Slow Burn', 'Phone torches; house lights at 10%'],
    ['Neon Run', 'Lasers in on the drop'],
    ['Skyline', 'Confetti on the last chorus'],
    ['Monsoon Static', ''],
    ['Glass Hearts', 'Quick change after this song'],
    ['Afterglow', 'Acoustic, stripped back'],
    ['Satellites', 'CO2 jets x4'],
    ['Encore Anthem', 'Encore: full rig, pyro'],
];
const TOUR_SET = ['Skyline', 'Neon Run', 'Midnight Drive', 'Glass Hearts', 'Slow Burn', 'Lost in Bandra', 'Monsoon Static', 'Satellites', 'Gold Hour', 'Encore Anthem'];
const setItem = (title, notes = '', status = 'pending') => {
    const s = SONGS.find((x) => x.title === title);
    return {
        songId: songIds[title], title, duration: s.duration, bpm: String(s.bpm), key: s.key, notes, status,
        tags: s.tags.slice(0, 1).map((label) => ({ label, color: TAG_COLORS[label] || 'gray' })),
    };
};

// ---------------------------------------------------------------- the tour
const TOUR = tour;
const tiers = (capacity, soldShare, prices = { ga: 45, pit: 85, vip: 160 }) => {
    const split = [['General Admission', 0.7, prices.ga], ['Fan Pit', 0.2, prices.pit], ['VIP', 0.1, prices.vip]];
    return split.map(([name, share, price]) => {
        const cap = Math.round(capacity * share);
        return { name, price, capacity: cap, sold: Math.min(cap, Math.round(cap * soldShare * (0.9 + rand() * 0.2))), status: 'Active' };
    });
};
const SUPPORT = [
    { name: 'Midnight Ferns', role: 'Support Act', image: img(CONCERT[10], 400) },
    { name: 'DJ Saanvi', role: 'Opening DJ Set', image: img(CONCERT[0], 400) },
];

// Short ids 9001/9002 are the testing guide's shows (same team, consecutive nights)
const SHOWS = [
    { eventId: 9101, title: `${TOUR}: Mumbai`, venue: 'nesco', days: -52, status: 'Completed', production: 'completed', capacity: 8000, sold: 0.98, image: CONCERT[4] },
    { eventId: 9102, title: `${TOUR}: New Delhi`, venue: 'jln', days: -24, status: 'Completed', production: 'completed', capacity: 12000, sold: 0.94, image: CONCERT[5] },
    { eventId: 9001, title: nightTitles[0], venue: 'jwg', days: 7, status: 'Published', production: 'active', capacity: 6000, sold: 0.81, image: CONCERT[2] },
    { eventId: 9002, title: nightTitles[1], venue: 'jwg', days: 8, status: 'Published', production: 'active', capacity: 6000, sold: 0.62, image: CONCERT[1] },
    { eventId: 9103, title: `${TOUR}: Bengaluru`, venue: 'palace', days: 21, status: 'Published', production: 'active', capacity: 10000, sold: 0.55, image: CONCERT[6] },
    { eventId: 9104, title: `${TOUR}: Hyderabad`, venue: 'balayogi', days: 35, status: 'Published', production: 'requested', capacity: 9000, sold: 0.31, image: CONCERT[8] },
    { eventId: 9105, title: `${TOUR}: Pune`, venue: 'mahalaxmi', days: 49, status: 'Published', production: 'none', capacity: 7000, sold: 0.12, image: CONCERT[11] },
];

const DESCRIPTION = (city, venue) =>
    `${artist.name} brings the ${TOUR} to ${venue}, ${city}: a two-hour electronic live set with a full arena light show, `
    + 'lasers and an LED wall built around every song. Support from Midnight Ferns and an opening set by DJ Saanvi. '
    + 'Doors open at 6:30 PM. All ages; under-16s must be accompanied by an adult.';

const RIDER = {
    gear: [
        { id: 1, name: 'Robe MegaPointe', type: 'Beam / Spot hybrid', count: 24, iconKey: 'Scan' },
        { id: 2, name: 'Martin MAC Aura XB', type: 'LED Wash', count: 32, iconKey: 'Waves' },
        { id: 3, name: 'GLP JDC1', type: 'Strobe', count: 12, iconKey: 'Zap' },
        { id: 4, name: 'Clay Paky Sharpy', type: 'Beam', count: 16, iconKey: 'Sun' },
        { id: 5, name: 'ROE Visual CB5 LED wall', type: 'Video (12 x 5 m)', count: 1, iconKey: 'Columns' },
        { id: 6, name: 'd&b audiotechnik KSL', type: 'Line array (per side)', count: 2, iconKey: 'Speaker' },
        { id: 7, name: 'Shure Axient Digital', type: 'Wireless mics', count: 4, iconKey: 'Radio' },
    ],
    stageLocation: 'Upstage centre, 2 m riser',
    mountingPreference: 'Flown on truss',
    placementNotes: 'Four truss rows above the LED wall; side towers stage left and right. Strobes between the beams on rows 1 and 4. Keep the downstage edge clear for the CO2 jets.',
    hazer: true,
};

const daySheet = (city, venueName) => [
    { time: '09:30 AM', title: 'Lobby Call', sub: `Hotel lobby • Depart for ${venueName}`, type: 'travel', details: 'Two vans, 14 people. Production and band.', status: 'future' },
    { time: '11:00 AM', title: 'Load-In', sub: 'Loading dock B • 3 trucks', type: 'work', details: 'Local crew: 12 hands, 2 riggers. Truss up by 1 PM.', status: 'future', tasks: [{ label: 'Rigging points signed off', done: false }, { label: 'Power distro checked', done: false }] },
    { time: '02:30 PM', title: 'Lighting Focus', sub: 'Full rig • grandMA3', type: 'work', details: 'Focus palettes, then run the show file end to end.', status: 'future' },
    { time: '04:00 PM', title: 'Soundcheck', sub: 'Full band • Sync with lighting', type: 'sound', status: 'future', tasks: [{ label: 'Line check', done: false }, { label: 'Monitor mix', done: false }, { label: 'IEM sync', done: false }, { label: 'Timecode to lighting', done: false }] },
    { time: '06:30 PM', title: 'Doors Open', sub: 'Gates 1 and 2', type: 'doors', details: 'Security briefing at 6:00 PM. Merch open.', status: 'future' },
    { time: '07:15 PM', title: 'Support: Midnight Ferns', sub: '35 min set', type: 'other', status: 'future' },
    { time: '08:30 PM', title: 'SHOWTIME', sub: `Main Stage • ${city} • 100 min set`, type: 'show', details: 'Setlist A. CO2 and confetti enabled; pyro on the encore.', status: 'future' },
    { time: '11:30 PM', title: 'Load-Out', sub: 'Trucks leave by 3 AM', type: 'work', status: 'future' },
];

const events = {};
for (const s of SHOWS) {
    const v = venues[s.venue];
    const date = day(s.days > 0 ? s.days + shift : s.days - shift, 20, 30);
    events[s.eventId] = await Event.findOneAndUpdate(
        { eventId: s.eventId + offset },
        {
            eventId: s.eventId + offset,
            title: s.title,
            description: DESCRIPTION(v.city, v.name),
            date,
            time: '8:30 PM',
            doorsOpen: '6:30 PM',
            venue: v._id,
            city: v.city,
            artist: artist.name,
            lineup: SUPPORT,
            genre: 'Electronic',
            vibe: 'Energetic / Party',
            images: { hero: img(s.image), artist: artist.avatar || img(PORTRAITS[2], 400), venue: v.image || img(s.image, 800) },
            ticketTiers: tiers(s.capacity, s.sold),
            discounts: s.days > 0 ? [{ code: 'SKYLINE10', type: 'Percentage', value: 10, uses: between(40, 180), status: 'Active' }] : [],
            status: s.status,
            organizerId: organizer._id,
            artistId: artist._id,
            assignedTo: s.production === 'none' ? undefined : crew._id,
            productionStatus: s.production,
            rider: RIDER,
            daySheet: s.days > 0 && s.days < 30 ? daySheet(v.city, v.name) : [],
            venueIntel: {
                wifiName: `${v.name.split(' ')[0]}-Production`,
                wifiPass: 'skyline-demo-2026',
                greenRoomCode: String(4000 + (s.eventId % 1000)),
                distance: '0.4 km',
                coffeeName: 'Third Wave Coffee',
                coffeeDesc: 'Opens 8 AM; the crew order goes in at 10.',
            },
        },
        { upsert: true, returnDocument: 'after' },
    );
}
// New events must never get a seeded short id (a re-seed would overwrite them)
await Counter.updateOne({ id: 'eventId' }, { $max: { seq: Math.max(...SHOWS.map((s) => s.eventId + offset)) } }, { upsert: true });

const eventIds = Object.values(events).map((e) => e._id);
const past = SHOWS.filter((s) => s.days < 0).map((s) => events[s.eventId]);
const upcoming = SHOWS.filter((s) => s.days > 0).map((s) => events[s.eventId]);

// Clear what an earlier run created for these shows, then write it fresh
const oldPolls = await Poll.find({ eventId: { $in: eventIds } }).select('_id');
await Promise.all([
    Ticket.deleteMany({ eventId: { $in: eventIds } }),
    Guest.deleteMany({ eventId: { $in: eventIds } }),
    Task.deleteMany({ eventId: { $in: eventIds } }),
    Logistics.deleteMany({ eventId: { $in: eventIds } }),
    Patch.deleteMany({ eventId: { $in: eventIds } }),
    Prediction.deleteMany({ eventId: { $in: eventIds } }),
    Vote.deleteMany({ pollId: { $in: oldPolls.map((p) => p._id) } }),
    Poll.deleteMany({ eventId: { $in: eventIds } }),
]);

// ---------------------------------------------------------------- setlists
for (const s of SHOWS) {
    const done = s.days < 0;
    const items = done ? TOUR_SET.map((t) => setItem(t, '', 'completed')) : UPCOMING_SET.map(([t, n]) => setItem(t, n));
    if (s.eventId === 9001) items[4].interaction = { type: 'poll', question: 'Which song should we play next?' };
    await Setlist.findOneAndUpdate(
        { eventId: events[s.eventId]._id },
        {
            artistId: artist._id, eventId: events[s.eventId]._id, items, showStatus: 'Standby', showWarning: false, clock: { elapsed: 0, liveSince: null },
            logs: done ? [{ time: '8:31 PM', msg: 'Show started', sub: 'Skyline', active: false }, { time: '10:14 PM', msg: 'Encore', sub: 'Encore Anthem', active: false }] : [],
        },
        { upsert: true, returnDocument: 'after' },
    );
}

// ---------------------------------------------------------------- tickets
// Sample transactions (tier sold counts above are the totals): spread over the weeks before each
// show, so the organizer's 30-day reports have a real curve
const SEATS = { 'General Admission': () => 'General Admission', 'Fan Pit': () => 'Fan Pit', VIP: () => `VIP Lounge, Row ${pick('ABCD')}, Seat ${between(1, 24)}` };
const tickets = [];
const addTicket = (user, event, tierName, bought, status, qrCode) => {
    const tier = event.ticketTiers.find((t) => t.name === tierName);
    const doc = new Ticket({ userId: user._id, eventId: event._id, price: tier.price, seat: SEATS[tierName](), type: tierName, qrCode, status, bgImage: event.images?.hero }).toObject();
    tickets.push({ ...doc, createdAt: bought, updatedAt: bought });
};
let serial = 1;
for (const s of SHOWS) {
    const event = events[s.eventId];
    const n = s.days < 0 ? 34 : Math.round(12 + s.sold * 30);
    for (let i = 0; i < n; i++) {
        // Upcoming shows: bought in the last 55 days. Past shows: in the six weeks before the show
        const bought = s.days > 0 ? ago(between(2, 55 * 24)) : new Date(event.date.getTime() - between(2, 42) * DAY - between(0, 23) * 3600000);
        const tier = rand() < 0.68 ? 'General Admission' : rand() < 0.66 ? 'Fan Pit' : 'VIP';
        const status = rand() < 0.04 ? 'Refunded' : s.days < 0 ? 'Used' : 'Confirmed';
        addTicket(pick(crowd), event, tier, bought, status, `SV-${s.eventId + offset}-${String(serial++).padStart(5, '0')}`);
    }
}
// The demo fan: two shows seen, three coming up (the 9001/9002 codes are the testing guide's)
addTicket(fan, events[9101], 'VIP', day(-80, 13), 'Used', `${ticketPrefix}9101`);
addTicket(fan, events[9102], 'General Admission', day(-50, 18), 'Used', `${ticketPrefix}9102`);
addTicket(fan, events[9001], 'Fan Pit', ago(26 * 24), 'Confirmed', `${ticketPrefix}1`);
addTicket(fan, events[9002], 'General Admission', ago(25 * 24), 'Confirmed', `${ticketPrefix}2`);
addTicket(fan, events[9103], 'VIP', ago(9 * 24), 'Confirmed', `${ticketPrefix}9103`);
// Friends the fan follows, going to the same shows (the "friends are going" list on Discover)
friends.forEach((f, i) => addTicket(f, i < 3 ? events[9001] : events[9103], 'Fan Pit', ago((20 - i) * 24), 'Confirmed', `SV-FRIEND-${offset}-${i + 1}`));
await Ticket.collection.insertMany(tickets);
await User.updateOne({ _id: fan._id }, { $addToSet: { following: { $each: friends.map((f) => f._id) } } });

// ---------------------------------------------------------------- guest lists
const GUESTS = [
    ['Nisha Varma', 'VIP', 'Checked In', 1, 'Label A&R, Sony Music India'],
    ['Karan Oberoi', 'All Access', 'approved', 0, 'Tour photographer'],
    ['Priyanka Sood', 'Guest', 'Pending', 2, "Artist's cousin"],
    ['Rahul Menon', 'Afterparty', 'approved', 1, 'Radio Mirchi presenter'],
    ['Sophie Laurent', 'VIP', 'Pending', 0, 'Booking agent, Paris'],
    ['Imran Sheikh', 'Guest', 'approved', 1, 'Venue partner'],
    ['Aditi Rao', 'All Access', 'Pending', 0, 'Content creator: tour vlog'],
];
const GUEST_COLORS = ['indigo', 'purple', 'pink', 'blue', 'emerald', 'amber', 'cyan'];
const guests = [];
for (const event of upcoming.slice(0, 3)) {
    GUESTS.forEach(([name, tier, status, plusOnes, notes], i) => guests.push({
        eventId: event._id, artistId: artist._id, addedBy: artist._id, name, tier, status, plusOnes, notes,
        email: `${name.split(' ')[0].toLowerCase()}@example.com`,
        initials: name.split(' ').map((p) => p[0]).join(''), color: GUEST_COLORS[i],
        addedAt: ago(24 * (10 - i)), createdAt: ago(24 * (10 - i)),
    }));
}
await Guest.insertMany(guests);

// ---------------------------------------------------------------- production: crew, tasks, patches
const CREW = [
    { name: 'Alex Morrison', role: 'Production Manager', status: 'Advancing the venue', color: 'bg-blue-500' },
    { name: 'Priya Nair', role: 'Lighting Designer', status: 'Programming cues', color: 'bg-purple-500' },
    { name: 'James Hold', role: 'Master Electrician', status: 'Updating patch', color: 'bg-green-500' },
    { name: 'Sana Qureshi', role: 'FOH Engineer', status: 'Building the mix', color: 'bg-pink-500' },
    { name: 'Dev Patel', role: 'Head Rigger', status: 'Checking load points', color: 'bg-amber-500' },
    { name: 'Lena Fischer', role: 'Video Director', status: 'Rendering LED content', color: 'bg-cyan-500' },
];
const DOCS = [
    { title: 'Light Plot v4.2', type: 'Map' },
    { title: 'Rigging Plot & Load Calcs', type: 'Grid' },
    { title: 'Truck Pack (3 x 53ft)', type: 'Box' },
    { title: 'Power Distribution', type: 'Grid' },
];
const TAG = {
    Rigging: 'bg-amber-500/10 text-amber-400', Lighting: 'bg-purple-500/10 text-purple-400', Audio: 'bg-pink-500/10 text-pink-400',
    Video: 'bg-cyan-500/10 text-cyan-400', Electric: 'bg-green-500/10 text-green-400', Logistics: 'bg-blue-500/10 text-blue-400', General: 'bg-gray-500/10 text-gray-400',
};
// [title, column, tag, priority, urgent, assignee, done, description]
const TASKS = [
    ['Confirm rigging points with venue', 'preprod', 'Rigging', 'High', true, 'Dev Patel', false, 'Venue to send the roof load chart; we need 24 points at 1 t each.'],
    ['Finalise truck pack', 'preprod', 'Logistics', 'Medium', false, 'Alex Morrison', true, 'Three trucks; video and lighting in truck 1.'],
    ['Advance power: 2 x 400 A three-phase', 'preprod', 'Electric', 'High', false, 'James Hold', false, 'Check the distance from the generator to the stage-left distro.'],
    ['Programme Skyline and Neon Run cues', 'preprod', 'Lighting', 'Medium', false, 'Priya Nair', false, 'Timecode from the playback rig; lasers only on the Neon Run drop.'],
    ['Book local hands (12) and 2 climbers', 'preprod', 'Logistics', 'Low', false, 'Alex Morrison', true, ''],
    ['Hang and trim truss rows 1–4', 'loadin', 'Rigging', 'High', false, 'Dev Patel', false, 'Row 1 trim 18.4 m; check the side towers are plumb.'],
    ['Focus washes onto the stage', 'loadin', 'Lighting', 'Medium', false, 'Priya Nair', false, ''],
    ['LED wall build and colour calibration', 'loadin', 'Video', 'Medium', false, 'Lena Fischer', false, ''],
    ['Line check and IEM sync', 'show', 'Audio', 'High', false, 'Sana Qureshi', false, ''],
    ['Haze test with venue fire officer', 'show', 'General', 'High', true, 'Alex Morrison', false, 'Detectors isolated 6 PM to midnight; fire officer to sign off.'],
    ['Pack the lighting desk and spares', 'loadout', 'Lighting', 'Low', false, 'James Hold', false, ''],
    ['Return hired cable and distro', 'loadout', 'Electric', 'Low', false, 'James Hold', false, ''],
];
const tasks = [];
for (const [k, event] of upcoming.slice(0, 4).entries()) {
    const due = (offset, hour) => `${shortDate(new Date(event.date.getTime() + offset * DAY))}, ${String(hour).padStart(2, '0')}:00`;
    for (const [title, columnId, tag, priority, urgent, assignee, done, description] of TASKS) {
        const offset = { preprod: -3 - k, loadin: 0, show: 0, loadout: 1 }[columnId];
        tasks.push({
            eventId: event._id, title, description, columnId, tag, tagColor: TAG[tag], priority, urgent: urgent && k < 2, assignee,
            dueDate: due(offset, { preprod: 10, loadin: 11, show: 17, loadout: 0 }[columnId]), status: done ? 'Done' : 'pending',
        });
    }
}
// Messages between the artist and the crew (they're tasks the dashboards raise as alerts)
tasks.push(
    { eventId: events[9001]._id, title: 'Crew Message: Truss trim is 0.5 m lower at Jio World Garden, so the confetti cue needs a new position', assignee: 'Artist Management', priority: 'High', urgent: true, columnId: 'preprod', tag: 'General', dueDate: 'ASAP', status: 'pending' },
    { eventId: events[9001]._id, title: 'Crew Message: Soundcheck moved to 4:30 PM (venue curfew on the load-in road)', assignee: 'Artist Management', priority: 'High', urgent: true, columnId: 'preprod', tag: 'General', dueDate: 'ASAP', status: 'pending' },
    { eventId: events[9001]._id, title: 'Artist Message: Please add a second hazer stage right for Slow Burn', assignee: 'Production Crew', priority: 'High', urgent: true, columnId: 'preprod', tag: 'General', dueDate: 'ASAP', status: 'pending' },
    { eventId: events[9103]._id, title: 'Artist Message: Can we keep the LED wall dark for the first 16 bars of Opening Lights?', assignee: 'Production Crew', priority: 'Medium', urgent: true, columnId: 'preprod', tag: 'General', dueDate: 'ASAP', status: 'pending' },
);
await Task.insertMany(tasks);

for (const s of SHOWS.filter((x) => x.production !== 'none')) {
    const phase = s.days < 0 ? 'Load-Out' : 'Pre-Production';
    await Logistics.create({
        eventId: events[s.eventId]._id, phase,
        crew: CREW.map((c) => ({ ...c, status: s.days < 0 ? 'Show complete' : c.status })),
        documents: DOCS.map((d, i) => ({ ...d, url: '#', uploadedAt: ago(24 * (12 - i)) })),
    });
}

// DMX patch: fixtures packed into 512-channel universes in rig order
const RIG = [
    { profile: 'Robe MegaPointe', mode: 'Mode 1 (39ch)', channels: 39, count: 12, start: 101, cue: 'Aerial beams', cueColor: 'blue' },
    { profile: 'Martin MAC Aura XB', mode: 'Standard (25ch)', channels: 25, count: 16, start: 201, cue: 'Stage wash', cueColor: 'purple' },
    { profile: 'Clay Paky Sharpy', mode: 'Standard (16ch)', channels: 16, count: 12, start: 301, cue: 'Side towers', cueColor: 'pink' },
    { profile: 'GLP JDC1', mode: 'Mode 3 (68ch)', channels: 68, count: 8, start: 401, cue: 'Strobes', cueColor: 'amber' },
    { profile: 'Generic Dimmer', mode: 'Standard (1ch)', channels: 1, count: 8, start: 501, cue: 'House lights', cueColor: 'gray' },
];
function patchFixtures() {
    const out = [];
    let universe = 1;
    let address = 1;
    for (const g of RIG) {
        for (let i = 0; i < g.count; i++) {
            if (address + g.channels - 1 > 512) { universe++; address = 1; }
            out.push({ fixtureId: g.start + i, profile: g.profile, mode: g.mode, channels: g.channels, universe, address, status: 'ok', cue: g.cue, cueColor: g.cueColor });
            address += g.channels;
        }
    }
    return out;
}
// The testing team's 9001 has no patch: the testing guide builds it with the AI patcher (row 8.5)
for (const s of SHOWS.filter((x) => x.production !== 'none' && (offset > 0 || x.eventId !== 9001))) {
    const fixtures = patchFixtures();
    if (s.eventId === 9002) {
        // One real-world mistake to find: a wash addressed on top of the last beam
        const beam = fixtures.find((f) => f.fixtureId === 112);
        const wash = fixtures.find((f) => f.fixtureId === 201);
        wash.universe = beam.universe;
        wash.address = beam.address + 20;
        for (const [f, other] of [[beam, wash], [wash, beam]]) {
            f.status = 'collision';
            f.notes = `Overlaps fixture ${other.fixtureId} on universe ${f.universe}`;
        }
    }
    await Patch.create({ eventId: events[s.eventId]._id, version: s.days < 0 ? '2.0' : '1.4', showName: `NeonSkyline_${venues[s.venue].city.replace(/\s/g, '')}_v1.4.ma3`, fixtures });
}

// ---------------------------------------------------------------- polls and predictions
for (const [event, question, options, winnerIndex] of [
    [events[9101], 'Which song should close the night?', [['Encore Anthem', 1842], ['Lost in Bandra', 1310], ['Gold Hour', 655]], 0],
    [events[9102], 'Pick the encore', [['Encore Anthem', 2210], ['Skyline', 2431], ['Afterglow', 802]], 1],
]) {
    const poll = await Poll.create({ eventId: event._id, question, options: options.map(([text, votes]) => ({ text, votes })), isActive: false, createdBy: artist._id, createdAt: new Date(event.date.getTime() + 95 * 60000) });
    const w = poll.options[winnerIndex];
    poll.winner = { optionId: w._id, text: w.text, votes: w.votes, tie: false };
    await poll.save();
}
await Prediction.create([
    { userId: fan._id, eventId: events[9102]._id, songs: TOUR_SET.slice(0, 6).concat(['Afterglow', 'Opening Lights']).map((t) => ({ id: String(songIds[t]), title: t })), score: 7, rank: 12, status: 'graded' },
    { userId: fan._id, eventId: events[9001]._id, songs: ['Opening Lights', 'Neon Run', 'Skyline', 'Slow Burn', 'Encore Anthem', 'Lost in Bandra'].map((t) => ({ id: String(songIds[t]), title: t })), status: 'submitted' },
]);

// ---------------------------------------------------------------- the fan's memories and notifications
const MEMORIES = [
    { type: 'photo', title: 'Front row for the opener', subtitle: 'Skyline, first drop', event: 9101, image: CONCERT[0], featured: true },
    { type: 'photo', title: 'Lasers on Neon Run', subtitle: 'NESCO went green', event: 9101, image: CONCERT[2] },
    { type: 'ticket', title: 'VIP stub, Mumbai', subtitle: 'Row B, Seat 14', event: 9101, image: CONCERT[4] },
    { type: 'photo', title: 'Confetti for the encore', subtitle: 'Encore Anthem', event: 9102, image: CONCERT[5], featured: true },
    { type: 'album', title: 'Delhi with the crew', subtitle: '24 photos', event: 9102, image: CONCERT[3] },
    { type: 'photo', title: 'The whole stadium singing', subtitle: 'Glass Hearts', event: 9102, image: CONCERT[8] },
];
const memoryTitles = MEMORIES.map((m) => m.title);
await Memory.deleteMany({ userId: fan._id, title: { $in: memoryTitles } });
await Memory.insertMany(MEMORIES.map((m, i) => {
    const event = events[m.event];
    const v = Object.values(venues).find((x) => String(x._id) === String(event.venue));
    return { userId: fan._id, type: m.type, title: m.title, subtitle: m.subtitle, date: new Date(event.date.getTime() + (60 + i * 15) * 60000), location: v.city, venue: v.name, artist: artist.name, image: img(m.image, 1200), featured: !!m.featured };
}));

const NOTIFICATIONS = [
    { type: 'system', title: 'Your show is next week', message: `${events[9001].title} at Jio World Garden, ${shortDate(events[9001].date)}. Doors 6:30 PM.`, link: '/ticket', eventId: events[9001]._id, hours: 3 },
    { type: 'system', title: 'Set times are out', message: 'DJ Saanvi 6:45 PM, Midnight Ferns 7:15 PM, headline set 8:30 PM.', link: '/dashboard', eventId: events[9001]._id, hours: 20 },
    { type: 'winner', title: 'Prediction results are in', message: 'New Delhi: you got 7 of 10 songs right and ranked #12.', link: '/dashboard', eventId: events[9102]._id, hours: 24 * 23, read: true },
    { type: 'system', title: 'New date announced: Pune', message: `${TOUR} comes to Mahalaxmi Lawns on ${shortDate(events[9105].date)}.`, link: '/discover', eventId: events[9105]._id, hours: 24 * 4 },
    { type: 'system', title: 'Friends are going', message: `${friends[0].name} and ${friends[1].name} have tickets to ${events[9001].title}.`, link: '/discover', eventId: events[9001]._id, hours: 24 * 6, read: true },
];
await Notification.deleteMany({ userId: fan._id, title: { $in: NOTIFICATIONS.map((n) => n.title) } });
await Notification.insertMany(NOTIFICATIONS.map((n) => ({ userId: fan._id, type: n.type, title: n.title, message: n.message, link: n.link, read: !!n.read, metadata: { eventId: n.eventId }, createdAt: ago(n.hours) })));

// ---------------------------------------------------------------- activity feeds
const ACTIVITY = [
    [crew, 'patch', 'Patch', 9002, `Updated patch for ${events[9002].title} (v1.4, 56 fixtures)`, 'success', 2],
    [crew, 'update', 'Patch', 9002, 'Collision found: fixtures 112 and 201 overlap on universe 1', 'warning', 2.5],
    [crew, 'create', 'Document', 9001, `Uploaded Light Plot v4.2 for ${events[9001].title}`, 'document', 7],
    [crew, 'update', 'Event', 9103, `Accepted production for ${TOUR}: Bengaluru`, 'success', 30],
    [crew, 'create', 'Event', 9104, `New production request: ${TOUR}: Hyderabad`, 'system', 50],
    [crew, 'update', 'Task', 9001, 'Rigging points sent to Jio World Garden for sign-off', 'general', 54],
    [crew, 'update', 'Event', 9102, `${TOUR}: New Delhi marked complete. Load-out finished 3:12 AM`, 'success', 24 * 23],
    [organizer, 'create', 'Event', 9105, `Announced ${TOUR}: Pune`, 'success', 24 * 4],
    [organizer, 'update', 'Event', 9001, `Fan Pit for ${events[9001].title} is 90% sold`, 'general', 26],
];
const activityDetails = ACTIVITY.map((a) => a[4]);
await Activity.deleteMany({ userId: { $in: [crew._id, organizer._id] }, details: { $in: activityDetails } });
await Activity.insertMany(ACTIVITY.map(([user, action, entityType, eventId, details, type, hours]) => ({
    userId: user._id, action, entityType, entityId: String(eventId + offset), details, type, timestamp: ago(hours),
})));

console.log(`${tour}: ${[organizer, artist, crew, fan].map((u) => `${u.email} (${u.name})`).join(', ')}`);
console.log(`  Shows: ${SHOWS.map((s) => `${s.eventId + offset} ${s.title} (${shortDate(events[s.eventId].date)})`).join('; ')}`);
console.log(`  Wrote ${tickets.length} tickets, ${guests.length} guests, ${tasks.length} tasks, ${SONGS.length} songs.`);
}

// The testing guide's team: its 9001/9002 "Demo Night" shows are what docs/MANUAL_TESTING.md uses
await seedTeam({
    organizer: await demoUser('organizer'), artist: await demoUser('artist'), crew: await demoUser('production'), fan: await demoUser('fan'),
    offset: 0, shift: 0, tour: 'Neon Skyline Tour', nightTitles: ['StageVerse Demo Night', 'StageVerse Demo Night 2'],
    ticketPrefix: 'DEMO-FAN-TICKET-', friends: crowd.slice(0, 5),
});
// The recruiters' team: the same tour shape under another artist, two days later
await seedTeam({
    organizer: await recruiterUser('organizer'), artist: await recruiterUser('artist'), crew: await recruiterUser('production'), fan: await recruiterUser('fan'),
    offset: 200, shift: 2, tour: 'Afterglow Tour', nightTitles: ['Afterglow Tour: Mumbai Homecoming', 'Afterglow Tour: Mumbai Homecoming, Night 2'],
    ticketPrefix: 'RECRUITER-FAN-TICKET-', friends: crowd.slice(5, 10),
});

// ---------------------------------------------------------------- featured festivals
// The two shows on the homepage stage's LED wall (featured: true puts them first there), run by the
// recruiters' organizer. Dates stay a few weeks ahead of whenever the seed runs.
// Tier capacities and sold counts (the same split as the tour shows)
const festivalTiers = (capacity, soldShare, prices) => [['General Admission', 0.7, prices.ga], ['Fan Pit', 0.2, prices.pit], ['VIP', 0.1, prices.vip]]
    .map(([name, share, price]) => ({ name, price, capacity: Math.round(capacity * share), sold: Math.round(capacity * share * soldShare), status: 'Active' }));
const featuredOrganizer = await User.findOne({ email: 'recruiter.organizer@stageverse.demo' });
const FESTIVALS = [
    {
        eventId: 9401, title: 'Sunburn Festival 2026: Mumbai', venue: 'racecourse', days: 30, time: '4:00 PM', doorsOpen: '2:00 PM',
        artist: 'Sunburn', genre: 'EDM', vibe: 'Festival', image: CONCERT[3], capacity: 30000, sold: 0.72,
        prices: { ga: 60, pit: 110, vip: 220 },
        lineup: [
            { name: 'Midnight Ferns', role: 'Main Stage', image: img(CONCERT[10], 400) },
            { name: 'DJ Saanvi', role: 'Sunset Set', image: img(CONCERT[0], 400) },
            { name: 'Neon Skyline (Live)', role: 'Closing Set', image: img(CONCERT[2], 400) },
        ],
        description: "Asia's biggest dance music festival comes to Mumbai: two stages, a full arena light show, lasers and fireworks at Mahalaxmi Race Course. Gates open at 2 PM; the main stage runs until 10 PM. 18+ only, valid photo ID required.",
    },
    {
        eventId: 9402, title: 'India Sneaker Festival 2026: New Delhi', venue: 'nsic', days: 37, time: '12:00 PM', doorsOpen: '11:00 AM',
        artist: 'India Sneaker Festival', genre: 'Festival', vibe: 'Street culture', image: CONCERT[8], capacity: 18000, sold: 0.58,
        prices: { ga: 25, pit: 45, vip: 90 },
        lineup: [
            { name: 'Live hip-hop showcase', role: 'Main Stage', image: img(CONCERT[1], 400) },
            { name: 'Sneaker drops and resale', role: 'Marketplace', image: img(CONCERT[11], 400) },
        ],
        description: 'Sneakers, streetwear and live hip-hop under one roof at the NSIC Exhibition Grounds, Okhla: limited drops, customisation workshops, a resale market and performances all day. All ages; under-16s with an adult.',
    },
];
for (const f of FESTIVALS) {
    const v = venues[f.venue];
    const event = await Event.findOneAndUpdate(
        { eventId: f.eventId },
        {
            eventId: f.eventId, title: f.title, description: f.description, date: day(f.days, 16, 0), time: f.time, doorsOpen: f.doorsOpen,
            venue: v._id, city: v.city, artist: f.artist, lineup: f.lineup, genre: f.genre, vibe: f.vibe,
            images: { hero: img(f.image), venue: v.image || img(f.image, 800) },
            ticketTiers: festivalTiers(f.capacity, f.sold, f.prices), status: 'Published', featured: true,
            organizerId: featuredOrganizer._id,
        },
        { upsert: true, returnDocument: 'after' },
    );
    // A handful of recent ticket sales, so the organizer's reports include them
    await Ticket.deleteMany({ eventId: event._id });
    const sales = Array.from({ length: 18 }, (_, i) => {
        const tierName = i % 6 === 0 ? 'VIP' : i % 3 === 0 ? 'Fan Pit' : 'General Admission';
        const tier = event.ticketTiers.find((t) => t.name === tierName);
        const bought = ago(between(2, 30 * 24));
        const doc = new Ticket({ userId: crowd[i % crowd.length]._id, eventId: event._id, price: tier.price, seat: tierName === 'VIP' ? 'VIP Deck' : tierName, type: tierName, qrCode: `SV-${f.eventId}-${String(i + 1).padStart(5, '0')}`, status: 'Confirmed', bgImage: img(f.image) }).toObject();
        return { ...doc, createdAt: bought, updatedAt: bought };
    });
    await Ticket.collection.insertMany(sales);
    console.log(`Featured: ${f.eventId} ${f.title} (${shortDate(event.date)})`);
}
await Counter.updateOne({ id: 'eventId' }, { $max: { seq: Math.max(...FESTIVALS.map((f) => f.eventId)) } }, { upsert: true });

console.log(`Done. Testing logins: organizer|artist|production|fan @stageverse.demo, "${PASSWORD}" (accounts that already existed keep their own password).`);
console.log(`Recruiter logins: recruiter.organizer|artist|crew|fan @stageverse.demo, "${RECRUITER_PASSWORD}".`);
await mongoose.disconnect();
