import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor } from '@/lib/authz';

export async function GET(req) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);
        
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        const event = await loadEventFor(artist, eventId, ['artist', 'organizer']);
        const guests = await Guest.find({
            eventId: event._id,
            artistId: artist.userId // NEW: Filter by artist
        }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, guests });
    } catch (error) {
        return apiError(error, '/api/artist/guestlist');
    }
}
