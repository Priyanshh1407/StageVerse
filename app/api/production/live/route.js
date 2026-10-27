import { NextResponse } from 'next/server';
import { apiError, readJson } from '@/lib/api';
import dbConnect from '@/lib/db';
import Setlist from '@/models/Setlist';
import Poll from '@/models/Poll';
import Venue from '@/models/Venue';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor, EVENT_TEAM, SHOW_CONTROL } from '@/lib/authz';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { emitToEvent } from '@/lib/realtime';

const SHOW_STATUSES = ['Standby', 'Live', 'Paused'];

// Demo data is served only for the explicit demo id, never as an error fallback.
const DEMO_EVENT_ID = 'demo-event';
const MOCK_EVENT_DATA = {
    event: {
        _id: DEMO_EVENT_ID,
        title: 'The Epoch World Tour (Demo)',
        date: new Date().toISOString(),
        city: 'London, UK',
        venue: { name: 'Wembley Stadium' }
    },
    setlist: [
        { _id: 'song-1', title: 'Neon Lights', bpm: 128, key: 'Cm', status: 'completed', duration: '3:45' },
        { _id: 'song-2', title: 'Midnight City', bpm: 130, key: 'Am', status: 'live', duration: '4:12' },
        { _id: 'song-3', title: 'Echoes of Time', bpm: 95, key: 'G', status: 'pending', duration: '5:00' },
        { _id: 'song-4', title: 'Starlight', bpm: 140, key: 'D', status: 'pending', duration: '3:30' }
    ],
    showStatus: 'Standby',
    showWarning: false,
    activePoll: null,
};

// GET ?eventId= -> current show state (event team only)
export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        if (!eventId) throw new ValidationError('Missing Event ID');
        if (eventId === DEMO_EVENT_ID) return NextResponse.json({ success: true, demo: true, ...MOCK_EVENT_DATA });

        const user = await verifyAuth(req);
        const event = await loadEventFor(user, eventId, EVENT_TEAM, { populate: { path: 'venue', model: Venue, select: 'name city address' } });

        // Plain objects with only the fields the crew screen shows (the setlist items
        // already carry title/bpm/key/duration, so songs aren't populated)
        const [setlistDoc, activePoll] = await Promise.all([
            Setlist.findOne({ eventId: event._id })
                .select('items._id items.songId items.title items.bpm items.key items.status items.duration showStatus showWarning')
                .lean(),
            Poll.findOne({ eventId: event._id, isActive: true }).select('question options isActive').lean(),
        ]);

        const setlist = (setlistDoc?.items || []).map((item) => {
            return {
                _id: item.songId || item._id,
                title: item.title,
                bpm: item.bpm || 120,
                key: item.key || 'C',
                status: item.status || 'pending',
                duration: item.duration || '0:00'
            };
        });

        return NextResponse.json({
            success: true,
            event: {
                _id: event._id,
                title: event.title,
                date: event.date,
                city: event.city,
                venue: event.venue
            },
            setlist,
            hasSetlist: Boolean(setlistDoc),
            showStatus: setlistDoc?.showStatus || 'Standby',
            showWarning: setlistDoc?.showWarning || false,
            activePoll
        });
    } catch (error) {
        return apiError(error, '/api/production/live');
    }
}

// PUT { eventId, status?, warning? } -> change show state (event's artist or crew)
export async function PUT(req) {
    try {
        await dbConnect();
        const body = await readJson(req);
        const { eventId, status } = body;

        if (!eventId) throw new ValidationError('Missing Event ID');
        if (eventId === DEMO_EVENT_ID) return NextResponse.json({ success: true, status: status || 'Live' });
        if (status === undefined && typeof body.warning !== 'boolean') {
            throw new ValidationError('No update fields provided');
        }
        if (status !== undefined && !SHOW_STATUSES.includes(status)) {
            throw new ValidationError(`status must be one of ${SHOW_STATUSES.join(', ')}`);
        }

        const user = await verifyAuth(req);
        const event = await loadEventFor(user, eventId, SHOW_CONTROL);

        const setlist = await Setlist.findOne({ eventId: event._id });
        if (!setlist) throw new NotFoundError('Setlist not found');

        if (status) setlist.showStatus = status;
        if (typeof body.warning === 'boolean') setlist.showWarning = body.warning;
        if (status === 'Live') {
            const hasLive = setlist.items.some(i => i.status === 'live');
            const hasCompleted = setlist.items.some(i => i.status === 'completed');
            if (!hasLive && !hasCompleted && setlist.items.length > 0) {
                setlist.items[0].status = 'live';
            }
        }
        await setlist.save();

        // Broadcast only after the state is persisted
        emitToEvent(event._id, 'show:update', { status: setlist.showStatus, warning: setlist.showWarning });
        if (body.warning === true) emitToEvent(event._id, 'show:warning', {});

        return NextResponse.json({ success: true, status: setlist.showStatus });
    } catch (e) {
        return apiError(e, '/api/production/live');
    }
}
