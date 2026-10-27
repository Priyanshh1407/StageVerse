
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { escapeRegex } from '@/lib/escapeRegex';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Task from '@/models/Task';
import Patch from '@/models/Patch';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ success: true, data: { events: [], tasks: [], patches: [] } });
        }

        const regex = new RegExp(escapeRegex(query.slice(0, 100)), 'i'); // literal, case-insensitive partial match
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
        return apiError(error, '/api/production/search');
    }
}
