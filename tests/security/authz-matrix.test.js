import { describe, it, expect, beforeEach } from 'vitest';
import { req, params, makeWorld, makeUser, makePoll } from '../helpers';
import Task from '@/models/Task';
import Guest from '@/models/Guest';
import Event from '@/models/Event';
import Setlist from '@/models/Setlist';

import * as setlist from '@/app/api/artist/setlist/route';
import * as declareResults from '@/app/api/artist/declare-results/route';
import * as fanPoll from '@/app/api/fan/poll/route';
import * as artistPoll from '@/app/api/artist/poll/route';
import * as reports from '@/app/api/reports/route';
import * as guestById from '@/app/api/artist/guestlist/[id]/route';
import * as guestList from '@/app/api/artist/guest-list/route';
import * as tasks from '@/app/api/production/tasks/route';
import * as logistics from '@/app/api/production/logistics/route';
import * as logisticsById from '@/app/api/production/logistics/[id]/route';
import * as daySheet from '@/app/api/artist/day-sheet/[id]/route';
import * as rider from '@/app/api/artist/rider/route';
import * as live from '@/app/api/production/live/route';
import * as patch from '@/app/api/production/patch/route';
import * as userSearch from '@/app/api/users/search/route';
import * as venues from '@/app/api/venues/route';
import * as fixtureProfiles from '@/app/api/production/fixture-profiles/route';
import * as eventById from '@/app/api/events/[id]/route';

let w; // the world: organizer, artist, crew, fan, event, setlist
let outsiders; // same roles, but not linked to w.event
let task, guest, poll;

beforeEach(async () => {
    w = await makeWorld();
    outsiders = {
        organizer: await makeUser('organizer'),
        artist: await makeUser('artist'),
        crew: await makeUser('production'),
    };
    task = await Task.create({ eventId: w.event._id, title: 'Rig truss' });
    guest = await Guest.create({ eventId: w.event._id, artistId: w.artist._id, name: 'VIP Guest' });
    poll = await makePoll(w.event._id, { isActive: false });
});

const id = () => String(w.event._id);
const patchBody = () => ({
    eventId: id(),
    fixtures: [{ fixtureId: 1, profile: 'Beam', channels: 16, universe: 1, address: 1 }],
});

// [description, actor key, handler, request builder] -> expected status
const cases = () => [
    // --- setlist / prediction game
    ['fan saves setlist', 'fan', setlist.POST, () => ['POST', '/api/artist/setlist', { eventId: id(), items: [{ title: 'x' }] }], 403],
    ['unlinked artist saves setlist', 'outsider.artist', setlist.POST, () => ['POST', '/api/artist/setlist', { eventId: id(), items: [{ title: 'x' }] }], 403],
    ['linked artist saves setlist', 'artist', setlist.POST, () => ['POST', '/api/artist/setlist', { eventId: id(), items: [{ title: 'x' }] }], 200],
    ['fan reads real setlist', 'fan', setlist.GET, () => ['GET', `/api/artist/setlist?eventId=${id()}`], 403],
    ['crew reads setlist', 'crew', setlist.GET, () => ['GET', `/api/artist/setlist?eventId=${id()}`], 200],
    ['fan declares results', 'fan', declareResults.POST, () => ['POST', '/api/artist/declare-results', { eventId: id() }], 403],
    ['artist declares results', 'artist', declareResults.POST, () => ['POST', '/api/artist/declare-results', { eventId: id() }], 200],

    // --- polls
    ['fan creates poll', 'fan', fanPoll.POST, () => ['POST', '/api/fan/poll', { create: true, eventId: id(), question: 'q', options: ['a', 'b'] }], 403],
    ['fan opens poll', 'fan', fanPoll.PUT, () => ['PUT', '/api/fan/poll', { pollId: String(poll._id), isActive: true }], 403],
    ['unlinked crew opens poll', 'outsider.crew', fanPoll.PUT, () => ['PUT', '/api/fan/poll', { pollId: String(poll._id), isActive: true }], 403],
    ['crew opens poll', 'crew', fanPoll.PUT, () => ['PUT', '/api/fan/poll', { pollId: String(poll._id), isActive: true }], 200],
    ['fan lists all polls', 'fan', fanPoll.GET, () => ['GET', `/api/fan/poll?eventId=${id()}&all=true`], 403],
    ['fan reads active poll', 'fan', fanPoll.GET, () => ['GET', `/api/fan/poll?eventId=${id()}`], 200],
    ['fan configures poll', 'fan', artistPoll.POST, () => ['POST', '/api/artist/poll', { eventId: id(), question: 'q', options: ['a', 'b'] }], 403],
    ['artist configures poll', 'artist', artistPoll.POST, () => ['POST', '/api/artist/poll', { eventId: id(), question: 'q', options: ['a', 'b'] }], 200],

    // --- reports
    ['other organizer reads reports for this event', 'outsider.organizer', reports.GET, () => ['GET', `/api/reports?eventId=${id()}`], 403],
    ['fan reads reports', 'fan', reports.GET, () => ['GET', '/api/reports'], 403],
    ['organizer reads own reports', 'organizer', reports.GET, () => ['GET', `/api/reports?eventId=${id()}`], 200],

    // --- guests
    ['fan deletes a guest', 'fan', guestById.DELETE, () => ['DELETE', `/api/artist/guestlist/${guest._id}`, undefined, { id: String(guest._id) }], 403],
    ['unlinked artist edits guest notes', 'outsider.artist', guestById.PATCH, () => ['PATCH', `/api/artist/guestlist/${guest._id}`, { notes: 'x' }, { id: String(guest._id) }], 403],
    ['artist edits guest notes', 'artist', guestById.PATCH, () => ['PATCH', `/api/artist/guestlist/${guest._id}`, { notes: 'x' }, { id: String(guest._id) }], 200],
    ['fan reads guest list', 'fan', guestList.GET, () => ['GET', `/api/artist/guest-list?eventId=${id()}`], 403],
    ['organizer reads guest list', 'organizer', guestList.GET, () => ['GET', `/api/artist/guest-list?eventId=${id()}`], 200],
    ['fan updates guest', 'fan', guestList.PUT, () => ['PUT', '/api/artist/guest-list', { id: String(guest._id), status: 'Checked In' }], 403],

    // --- tasks / logistics
    ['unlinked crew updates task', 'outsider.crew', tasks.PUT, () => ['PUT', '/api/production/tasks', { id: String(task._id), title: 'x' }], 403],
    ['unlinked crew deletes task', 'outsider.crew', tasks.DELETE, () => ['DELETE', `/api/production/tasks?id=${task._id}`], 403],
    ['crew updates task', 'crew', tasks.PUT, () => ['PUT', '/api/production/tasks', { id: String(task._id), title: 'x' }], 200],
    ['fan moves task', 'fan', logistics.PUT, () => ['PUT', '/api/production/logistics', { id: String(task._id), status: 'Done' }], 403],
    ['artist marks task done', 'artist', logistics.PUT, () => ['PUT', '/api/production/logistics', { id: String(task._id), status: 'Done' }], 200],
    ['fan reads logistics board', 'fan', logisticsById.GET, () => ['GET', `/api/production/logistics/${id()}`, undefined, { id: id() }], 403],
    ['crew reads logistics board', 'crew', logisticsById.GET, () => ['GET', `/api/production/logistics/${id()}`, undefined, { id: id() }], 200],

    // --- day sheet / rider
    ['fan reads day sheet (wifi password)', 'fan', daySheet.GET, () => ['GET', `/api/artist/day-sheet/${id()}`, undefined, { id: id() }], 403],
    ['crew reads day sheet', 'crew', daySheet.GET, () => ['GET', `/api/artist/day-sheet/${id()}`, undefined, { id: id() }], 200],
    ['crew edits day sheet', 'crew', daySheet.PUT, () => ['PUT', `/api/artist/day-sheet/${id()}`, { schedule: [] }, { id: id() }], 403],
    ['fan reads rider', 'fan', rider.GET, () => ['GET', `/api/artist/rider?eventId=${id()}`], 403],
    ['crew edits rider', 'crew', rider.POST, () => ['POST', '/api/artist/rider', { eventId: id(), hazer: true }], 403],
    ['artist edits rider', 'artist', rider.POST, () => ['POST', '/api/artist/rider', { eventId: id(), hazer: true }], 200],

    // --- live show
    ['fan reads live state', 'fan', live.GET, () => ['GET', `/api/production/live?eventId=${id()}`], 403],
    ['crew reads live state', 'crew', live.GET, () => ['GET', `/api/production/live?eventId=${id()}`], 200],
    ['organizer starts the show', 'organizer', live.PUT, () => ['PUT', '/api/production/live', { eventId: id(), status: 'Live' }], 403],
    ['artist starts the show', 'artist', live.PUT, () => ['PUT', '/api/production/live', { eventId: id(), status: 'Live' }], 200],

    // --- patch
    ['fan writes the lighting patch', 'fan', patch.POST, () => ['POST', '/api/production/patch', patchBody()], 403],
    ['artist writes the lighting patch', 'artist', patch.POST, () => ['POST', '/api/production/patch', patchBody()], 403],
    ['crew writes the lighting patch', 'crew', patch.POST, () => ['POST', '/api/production/patch', patchBody()], 200],

    // --- misc
    ['fan enumerates users', 'fan', userSearch.GET, () => ['GET', '/api/users/search?query=te'], 403],
    ['organizer searches users', 'organizer', userSearch.GET, () => ['GET', '/api/users/search?query=te'], 200],
    ['fan creates venue', 'fan', venues.POST, () => ['POST', '/api/venues', { name: 'V', city: 'C', address: 'A' }], 403],
    ['anonymous creates venue', null, venues.POST, () => ['POST', '/api/venues', { name: 'V', city: 'C', address: 'A' }], 401],
    ['anonymous creates fixture profile', null, fixtureProfiles.POST, () => ['POST', '/api/production/fixture-profiles', { manufacturer: 'm', model: 'x', modes: [1] }], 401],
    ['anonymous changes live status', null, live.PUT, () => ['PUT', '/api/production/live', { eventId: id(), status: 'Live' }], 401],
];

function actor(key) {
    if (!key) return undefined;
    if (key.startsWith('outsider.')) return outsiders[key.split('.')[1]];
    return w[key];
}

describe('SEC-03 authorization matrix', () => {
    // Build case names up front; arguments are resolved lazily inside each test
    it.each(cases().map((c) => [c[0], c[4], c]))('%s -> %i', async (_name, expected, c) => {
        const [, actorKey, handler, build] = c;
        const [method, path, body, routeParams] = build();
        const request = await req(method, path, { body, as: actor(actorKey) });
        const res = routeParams ? await handler(request, params(routeParams)) : await handler(request);
        expect(res.status).toBe(expected);
    });
});

describe('SEC-03 mass assignment', () => {
    it('an organizer cannot transfer event ownership via PUT /api/events/[id]', async () => {
        const res = await eventById.PUT(
            await req('PUT', `/api/events/${id()}`, { as: w.organizer, body: { title: 'Renamed', organizerId: String(outsiders.organizer._id) } }),
            params({ id: id() }),
        );
        expect(res.status).toBe(200);
        const saved = await Event.findById(w.event._id);
        expect(saved.title).toBe('Renamed');
        expect(String(saved.organizerId)).toBe(String(w.organizer._id));
    });

    it('a rejected setlist write leaves the setlist untouched', async () => {
        await setlist.POST(await req('POST', '/api/artist/setlist', { as: w.fan, body: { eventId: id(), items: [{ title: 'Hacked' }] } }));
        const saved = await Setlist.findOne({ eventId: w.event._id });
        expect(saved.items.map((i) => i.title)).toEqual(['Song A', 'Song B', 'Song C']);
    });
});
