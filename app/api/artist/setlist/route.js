
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Setlist from '@/models/Setlist';
import { verifyAuth } from '@/lib/auth';

// ... (GET remains similar, but check if we need to resolve ID there too? Yes, likely)

// GET: Fetch setlist for an event
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        let eventId = searchParams.get('eventId');
        if (!eventId) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

        // Resolve numeric ID to Mongo ID if needed
        const numericEventId = parseInt(eventId);
        console.log(`[Setlist GET] Resolving Event ID: ${eventId} -> ${numericEventId}`);

        const event = await Event.findOne({ eventId: numericEventId });

        if (event) {
            console.log(`[Setlist GET] Found Event: ${event._id}`);
            eventId = event._id;
        } else {
            console.log(`[Setlist GET] Event ${numericEventId} not found. Returning null.`);
            return NextResponse.json({ success: true, data: null });
        }

        console.log(`[Setlist GET] Querying Setlist for Event ObjectId: ${eventId}`);
        const setlist = await Setlist.findOne({ eventId });
        return NextResponse.json({ success: true, data: setlist });

    } catch (error) {
        console.error("[Setlist GET] Error:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

// POST: Save Setlist (Order matters)
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        let { eventId, items } = body;

        if (!eventId || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Resolve numeric ID to Mongo ID
        const event = await Event.findOne({ eventId: eventId });
        if (!event) {
            return NextResponse.json({ error: `Event ${eventId} not found` }, { status: 404 });
        }

        const mongoEventId = event._id;

        // Upsert setlist for this event
        const updatedSetlist = await Setlist.findOneAndUpdate(
            { eventId: mongoEventId },
            {
                artistId: user.userId,
                eventId: mongoEventId,
                items: items
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({ success: true, data: updatedSetlist });

    } catch (error) {
        console.error("Setlist Save Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
