import { NextResponse } from 'next/server';
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
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Fetch "High" priority, non-done tasks that are flagged as urgent or unrelated to specific events (production wide)
        // For simplicity, we just look for any HIGH priority, PENDING, URGENT flagged tasks.

        // Find events linked to user to scope the search (optional, but good practice)
        const events = await Event.find({
            $or: [{ organizerId: user.userId }, { assignedTo: user.userId }]
        }).select('_id');
        const eventIds = events.map(e => e._id);

        // DEBUG: Removing eventId filter to check if it's a context issue
        const notifications = await Task.find({
            // eventId: { $in: eventIds }, // Temporarily disabled
            status: { $ne: 'Done' },
            urgent: true,
            title: { $regex: '^Artist Message:', $options: 'i' }
        }).sort({ createdAt: -1 }).limit(10);

        console.log(`✅ Found ${notifications.length} notifications`);

        return NextResponse.json({ success: true, data: notifications });

    } catch (error) {
        console.error("Notifications API Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
