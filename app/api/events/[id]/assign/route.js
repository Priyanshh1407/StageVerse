import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Notification from '@/models/Notification'; // Add this
import { verifyAuth } from '@/lib/auth';

export async function PUT(req, props) {
    const params = await props.params;
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();
        const { assignedTo } = body; // User ID of Production Crew

        // Find Event
        // Logic: Determine if 'id' is our custom numeric eventId or a MongoDB _id
        let targetEvent = null;

        // 1. Try Numeric ID (eventId)
        if (!isNaN(id)) {
            targetEvent = await Event.findOne({
                eventId: id,
                $or: [{ artistId: user.userId }, { organizerId: user.userId }]
            });
        }

        // 2. Try MongoDB ID (_id) if not found yet
        if (!targetEvent) {
            targetEvent = await Event.findOne({
                _id: id,
                $or: [{ artistId: user.userId }, { organizerId: user.userId }]
            });
        }

        if (!targetEvent) {
            return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
        }

        targetEvent.assignedTo = assignedTo;
        targetEvent.productionStatus = 'requested'; // Trigger LD Request
        await targetEvent.save();

        // Create Notification for the assigned Production user
        if (assignedTo) {
            await Notification.create({
                userId: assignedTo,
                type: 'system',
                title: 'New Event Assignment',
                message: `You have been requested for production on ${targetEvent.title}`,
                link: '/production/dashboard', // Or specific event link
                metadata: { eventId: targetEvent._id }
            });
        }

        return NextResponse.json({ success: true, data: targetEvent });

    } catch (error) {
        console.error("Assign Event Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
