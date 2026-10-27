import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const myEvents = await Event.find({ artistId: user.userId }).select('_id');
        const notifications = await Task.find({
            eventId: { $in: myEvents.map((e) => e._id) },
            status: { $ne: 'Done' },
            urgent: true,
            title: { $regex: '^Crew Message:', $options: 'i' }
        }).sort({ createdAt: -1 }).limit(10);

        return NextResponse.json({ success: true, data: notifications });

    } catch (error) {
        return apiError(error, '/api/artist/notifications');
    }
}
