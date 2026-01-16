import Event from '@/models/Event';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import { verifyAuth } from '@/lib/auth';

// GET: Fetch guests for a specific event
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        let eventId = searchParams.get('eventId');

        if (!eventId) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

        // Resolve
        const numericEventId = parseInt(eventId);
        console.log(`[Guest GET] Resolving Event ID: ${eventId} -> ${numericEventId}`);

        const event = await Event.findOne({ eventId: numericEventId });

        if (event) {
            console.log(`[Guest GET] Found Event: ${event._id}`);
            eventId = event._id;
        } else {
            console.log(`[Guest GET] Event ${numericEventId} not found. Returning empty.`);
            // Avoid CastError by returning empty list immediately
            return NextResponse.json({ success: true, data: [] });
        }

        const guests = await Guest.find({ eventId }).sort({ addedAt: -1 });

        return NextResponse.json({ success: true, data: guests });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Add a new guest
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        let { eventId, name, tier, email } = body;

        if (!eventId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Resolve
        console.log(`[Guest POST] Looking for Event ID: ${eventId}`);
        const numericEventId = parseInt(eventId);

        const event = await Event.findOne({ eventId: numericEventId });
        if (!event) {
            console.error(`[Guest POST] Event ${numericEventId} not found`);
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }
        const mongoEventId = event._id;

        const newGuest = await Guest.create({
            eventId: mongoEventId,
            name,
            tier: tier || 'Guest',
            email,
            status: 'Pending'
        });

        console.log(`[Guest POST] Created Guest ${newGuest.name} for Event ${numericEventId}`);
        return NextResponse.json({ success: true, data: newGuest });

    } catch (error) {
        console.error("Guest Add Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
