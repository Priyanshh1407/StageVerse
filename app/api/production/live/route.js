import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Setlist from '@/models/Setlist';
import Song from '@/models/Song';
import Poll from '@/models/Poll';

// Mock Data for "Demo" or Fallback
const MOCK_EVENT_DATA = {
    event: {
        _id: 'demo-event',
        title: 'The Epoch World Tour (Demo)',
        date: new Date().toISOString(),
        city: 'London, UK',
        venue: { name: 'Wembley Stadium' }
    },
    setlist: [
        {
            _id: 'song-1',
            title: 'Neon Lights',
            bp: 128,
            key: 'Cm',
            status: 'played',
            duration: '3:45'
        },
        {
            _id: 'song-2',
            title: 'Midnight City',
            bp: 130,
            key: 'Am',
            status: 'live', // Current song
            duration: '4:12'
        },
        {
            _id: 'song-3',
            title: 'Echoes of Time',
            bp: 95,
            key: 'G',
            status: 'next',
            duration: '5:00'
        },
        {
            _id: 'song-4',
            title: 'Starlight',
            bp: 140,
            key: 'D',
            status: 'pending',
            duration: '3:30'
        }
    ]
};

export async function GET(req) {
    try {
        await dbConnect();

        // Get ID from URL search params or route params (Next.js App Router uses dynamic route folder [id])
        // But since this is a route handler in app/api/production/live/route.js, it might handle generic requests or receive ID in query
        // The page `app/(production)/live/[id]/page.jsx` calls `/api/production/live?eventId=${id}`.

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        // OPTION 1: Demo Logic
        if (eventId === 'demo-event' || eventId === 'test') {
            return NextResponse.json({ success: true, ...MOCK_EVENT_DATA });
        }

        // OPTION 2: DB Lookup
        // console.log(`[ProductionAPI] Looking up Event ID: ${eventId}`);

        let event;
        const mongoose = require('mongoose');

        if (mongoose.isValidObjectId(eventId)) {
            event = await Event.findById(eventId).populate('venue');
        } else {
            // Try lookup by custom eventId (e.g. 999)
            event = await Event.findOne({ eventId: eventId }).populate('venue');
        }

        if (!event) {
            console.warn(`[ProductionAPI] Event ${eventId} not found.`);
            return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
        }
        // console.log(`[ProductionAPI] Found Event: ${event.title}`);

        // Fetch Setlist
        // Assuming one setlist per event or finding the latest
        const setlistDoc = await Setlist.findOne({ eventId: eventId }).populate('items.songId');

        // Debugging
        if (!setlistDoc) console.warn(`No setlist found for eventId: ${eventId}`); // Keep for logs

        // Transform Setlist Data (Handle new 'items' array structure from Schema)
        const formattedSetlist = setlistDoc ? setlistDoc.items.map(item => {
            // Handle case where populate might fail or structure differs
            const song = item.songId || {};
            return {
                _id: song._id || item._id, // Fallback
                title: item.title,
                bpm: item.bpm || 120,
                key: item.key || 'C',
                status: item.status || 'pending',
                duration: item.duration || '0:00'
            };
        }) : MOCK_EVENT_DATA.setlist;

        // Fetch Active Poll
        const activePoll = await Poll.findOne({ eventId: eventId, isActive: true });

        return NextResponse.json({
            success: true,
            event: {
                _id: event._id,
                title: event.title,
                date: event.date,
                city: event.city,
                venue: event.venue
            },
            setlist: formattedSetlist,
            showStatus: setlistDoc?.showStatus || 'Standby',
            showWarning: setlistDoc?.showWarning || false,
            activePoll: activePoll
        });

    } catch (error) {
        console.error("Live API Error:", error);
        // Fallback on error too
        return NextResponse.json({ success: true, ...MOCK_EVENT_DATA });
    }
}

export async function PUT(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { eventId, status } = body;

        if (!eventId) return NextResponse.json({ success: false, message: "Missing Event ID" }, { status: 400 });

        // Allow partial updates: Status OR Warning
        if (!status && typeof body.warning === 'undefined') {
            return NextResponse.json({ success: false, message: "No update fields provided" }, { status: 400 });
        }

        // Find Setlist
        let setlist = await Setlist.findOne({ eventId: eventId });

        if (!setlist) {
            return NextResponse.json({ success: false, message: "Setlist not found" }, { status: 404 });
        }

        // Update Setlist Fields
        if (body.status) setlist.showStatus = body.status;
        if (typeof body.warning === 'boolean') setlist.showWarning = body.warning;

        // LOGIC: If Show is Live, ensure we have an Active Song
        if (status === 'Live') {
            const hasLive = setlist.items.some(i => i.status === 'live');
            const hasCompleted = setlist.items.some(i => i.status === 'completed');

            // If fresh start (nothing live, nothing completed), activate first song
            if (!hasLive && !hasCompleted && setlist.items.length > 0) {
                setlist.items[0].status = 'live';
            }
        }

        await setlist.save();

        return NextResponse.json({ success: true, status: setlist.showStatus });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
