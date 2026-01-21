import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);
        if (!artist) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        const guests = await Guest.find({
            eventId,
            artistId: artist.userId // NEW: Filter by artist
        }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, guests });
    } catch (error) {
        console.error("Guestlist Fetch Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
