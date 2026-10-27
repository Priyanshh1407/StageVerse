import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event'; // Needed if we want to filter by user's events
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(req) {
    console.log("📢 fetching notifications...");
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const events = await Event.find({
            $or: [{ organizerId: user.userId }, { assignedTo: user.userId }]
        }).select('_id');
        const eventIds = events.map(e => e._id);
        const notifications = await Task.find({
            status: { $ne: 'Done' },
            urgent: true,
            title: { $regex: '^Artist Message:', $options: 'i' }
        }).sort({ createdAt: -1 }).limit(10);

        console.log(`✅ Found ${notifications.length} notifications`);

        return NextResponse.json({ success: true, data: notifications });

    } catch (error) {
        return apiError(error, '/api/notifications');
    }
}
