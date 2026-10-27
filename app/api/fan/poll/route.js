import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Poll from '@/models/Poll';
import { verifyAuth } from '@/lib/auth'; // Ensure fan is logged in

export async function GET(req) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        const fetchAll = searchParams.get('all') === 'true';

        let query = { eventId };
        if (!fetchAll) {
            query.isActive = true;
        }

        const polls = await Poll.find(query).sort({ createdAt: -1 }).limit(10);
        if (!fetchAll && polls.length > 0) {
            return NextResponse.json({ success: true, poll: polls[0] });
        } else if (!fetchAll) {
            return NextResponse.json({ success: true, poll: null });
        }

        return NextResponse.json({ success: true, polls });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { pollId, isActive } = body;

        if (!pollId) return NextResponse.json({ error: 'Missing Poll ID' }, { status: 400 });
        if (isActive) {
            const targetPoll = await Poll.findById(pollId);
            if (targetPoll) {
                await Poll.updateMany({ eventId: targetPoll.eventId, isActive: true }, { isActive: false });
            }
        }

        const poll = await Poll.findByIdAndUpdate(
            pollId,
            { isActive },
            { new: true }
        );

        return NextResponse.json({ success: true, poll });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
export async function POST(req) {
    try {
        await dbConnect();

        const body = await req.json();
        const { pollId, optionId, create } = body;
        if (create) {
            const user = await verifyAuth(req); // Only check auth for creation
            if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

            const { question, options, eventId } = body;
            await Poll.updateMany({ eventId, isActive: true }, { isActive: false });

            const newPoll = await Poll.create({
                eventId,
                question,
                options: options.map(txt => ({ text: txt, votes: 0 })),
                isActive: true, // Start active
                createdBy: user.userId
            });
            return NextResponse.json({ success: true, poll: newPoll });
        }
        if (!pollId || !optionId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

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
