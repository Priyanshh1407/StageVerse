
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Task from '@/models/Task';
import Patch from '@/models/Patch';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ success: true, data: { events: [], tasks: [], patches: [] } });
        }

        const regex = new RegExp(query, 'i'); // Case-insensitive partial match
        const [events, tasks, patches] = await Promise.all([
            Event.find({
                $or: [
                    { title: regex },
                    { artist: regex },
                    { city: regex },
                    { venue: regex } // Assuming venue is populated or simple string? (Schema check needed, but robust enough for now)
                ],
                $or: [{ organizerId: user.userId }, { assignedTo: user.userId }] // Security: Only show my events
            }).select('title artist city date eventId status').limit(5),
            Task.find({
                $or: [
                    { title: regex },
                    { assignee: regex }
                ],
            }).populate('eventId', 'title eventId').limit(5),
            Patch.find({
                showName: regex
            }).select('showName version').populate('eventId', 'eventId').limit(3)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                events,
                tasks,
                patches
            }
        });

    } catch (error) {
        console.error("Search Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
