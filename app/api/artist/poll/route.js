import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { parseBody, pollCreateSchema } from '@/lib/schemas';
import dbConnect from '@/lib/db';
import Poll from '@/models/Poll';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor, SHOW_CONTROL } from '@/lib/authz';

export async function POST(req) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);

        const { eventId, question, options } = parseBody(pollCreateSchema, await req.json());
        const event = await loadEventFor(artist, eventId, ['artist']);

        // Polls configured before the show start closed; the artist opens one
        // from the live-show screen (PUT /api/fan/poll), which is when fans see it.
        const newPoll = await Poll.create({
            eventId: event._id,
            question,
            options: options.map(opt => ({ text: String(opt), votes: 0 })),
            isActive: false,
            createdBy: artist.userId,
        });

        return NextResponse.json({ success: true, poll: newPoll });

    } catch (e) {
        return apiError(e, '/api/artist/poll');
    }
}

export async function GET(req) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });

        const event = await loadEventFor(artist, eventId, SHOW_CONTROL);
        const polls = await Poll.find({ eventId: event._id }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, polls });
    } catch (e) {
        return apiError(e, '/api/artist/poll');
    }
}
