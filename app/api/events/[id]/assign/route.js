import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Notification from '@/models/Notification'; // Add this
import { verifyAuth } from '@/lib/auth';
import User from '@/models/User';
import { ValidationError } from '@/lib/errors';

export async function PUT(req, props) {
    const params = await props.params;
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        
        const { id } = params;
        const body = await req.json();
        const { assignedTo } = body; // User ID of Production Crew
        let targetEvent = null;
        if (!isNaN(id)) {
            targetEvent = await Event.findOne({
                eventId: id,
                $or: [{ artistId: user.userId }, { organizerId: user.userId }]
            });
        }
        if (!targetEvent) {
            targetEvent = await Event.findOne({
                _id: id,
                $or: [{ artistId: user.userId }, { organizerId: user.userId }]
            });
        }

        if (!targetEvent) {
            return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
        }

        if (assignedTo) {
            const crew = await User.findById(assignedTo).select('role');
            if (!crew || crew.role !== 'production') {
                throw new ValidationError('assignedTo must be a production crew account');
            }
        }
        targetEvent.assignedTo = assignedTo;
        targetEvent.productionStatus = 'requested'; // Trigger LD Request
        await targetEvent.save();
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
        return apiError(error, '/api/events/[id]/assign');
    }
}
