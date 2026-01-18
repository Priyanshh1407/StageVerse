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
// PUT: Update a guest (Check-In or Edit)
export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, status, name, email, tier } = body;

        if (!id) return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });

        const updateData = {};
        if (status) updateData.status = status;
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (tier) updateData.tier = tier;

        const updatedGuest = await Guest.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedGuest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

        return NextResponse.json({ success: true, data: updatedGuest });

    } catch (error) {
        console.error("Guest Update Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Remove a guest (or all guests for an event)
export async function DELETE(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, eventId, clearAll } = body;

        // Mode 1: Delete Single Guest
        if (id) {
            await Guest.findByIdAndDelete(id);
            return NextResponse.json({ success: true });
        }

        // Mode 2: Clear All Guests for Event
        if (clearAll && eventId) {
            console.log(`[Guest DELETE] Clearing list for Event: ${eventId}`);

            // Resolve Event ID
            const numericEventId = parseInt(eventId);
            const event = await Event.findOne({ eventId: numericEventId });

            if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

            await Guest.deleteMany({ eventId: event._id });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    } catch (error) {
        console.error("Guest Delete Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
