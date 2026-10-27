import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Poll from '@/models/Poll';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);

        const body = await req.json();
        const { eventId, question, options } = body;
        if (!eventId || !question || !options || options.length < 2) {
            return NextResponse.json({ error: 'Invalid poll data' }, { status: 400 });
        }

        const newPoll = await Poll.create({
            eventId,
            question,
            options: options.map(opt => ({ text: opt, votes: 0 })),
            isActive: true // Activate immediately? Or separate step? Let's say active for now.
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

        const polls = await Poll.find({ eventId }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, polls });
    } catch (e) {
        return apiError(e, '/api/artist/poll');
    }
}
