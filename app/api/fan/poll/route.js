import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Poll from '@/models/Poll';
import { verifyAuth } from '@/lib/auth'; // Ensure fan is logged in

export async function GET(req) {
    try {
        await dbConnect();
        // Allow public read? Or fan only? Let's verify fan.
        const user = await verifyAuth(req); // Optional: if we want to track who voted later

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });

        // Get the most recent ACTIVE poll
        const poll = await Poll.findOne({ eventId, isActive: true }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, poll });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// VOTE
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { pollId, optionId } = body;

        if (!pollId || !optionId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        // Simple increment for now (Not tracking unique voters per poll in this MVP for speed, but ideally should)
        // TODO: Add `voters: [userId]` to schema to prevent double voting.

        const poll = await Poll.findOneAndUpdate(
            { _id: pollId, "options._id": optionId },
            { $inc: { "options.$.votes": 1 } },
            { new: true }
        );

        return NextResponse.json({ success: true, poll });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
