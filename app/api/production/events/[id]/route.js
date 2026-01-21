
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import { verifyAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

// Helper to determine color based on type
function getTypeColor(type) {
    switch (type) {
        case 'Touring': return 'bg-blue-500';
        case 'Festival': return 'bg-indigo-500';
        case 'Corporate': return 'bg-slate-600';
        case 'Theatre': return 'bg-amber-600';
        default: return 'bg-gray-500';
    }
}

// UPDATE
export async function PUT(req, { params }) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await req.json();

        // 1. Find Event
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { eventId: id };
        const event = await Event.findOne(query);

        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        // 2. Auth: Organizer or Assigned
        const isOrganizer = event.organizerId.toString() === user.userId;
        const isAssigned = event.assignedTo && event.assignedTo.toString() === user.userId;
        if (!isOrganizer && !isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // 3. Update Fields
        let actionDetails = `Updated ${event.title}`;
        if (body.title) event.title = body.title;
        if (body.date) event.date = new Date(body.date);
        if (body.type || body.genre) event.genre = body.type || body.genre;

        if (body.status) {
            // If Production is accepting (setting to active), update productionStatus too
            if (body.status === 'active' && isAssigned) {
                event.productionStatus = 'active';
            } else {
                event.status = body.status;
            }
            actionDetails = `Changed status to ${body.status}: ${event.title}`;
        }

        // Venue Update
        if (body.venue && body.venue !== event.city) {
            let venueDoc = await Venue.findOne({ name: body.venue });
            if (!venueDoc) {
                venueDoc = await Venue.create({
                    name: body.venue,
                    city: 'Unknown City',
                    capacity: 1000
                });
            }
            event.venue = venueDoc._id;
            event.city = venueDoc.city;
        }

        await event.save();

        // LOG ACTIVITY
        await logActivity(
            user.userId,
            'update',
            'Event',
            actionDetails,
            'document',
            `/patch-studio/${event.eventId || event._id}`
        );

        return NextResponse.json({
            success: true,
            data: {
                id: event.eventId || event._id,
                title: event.title,
                venue: event.city,
                date: event.date,
                status: event.status,
                type: event.genre,
                typeColor: getTypeColor(event.genre)
            }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE
export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { eventId: id };
        const event = await Event.findOne(query);

        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        if (event.organizerId.toString() !== user.userId) {
            return NextResponse.json({ error: 'Only the organizer can delete this event' }, { status: 403 });
        }

        const title = event.title;
        await Event.deleteOne({ _id: event._id });

        // LOG ACTIVITY
        await logActivity(
            user.userId,
            'delete',
            'Event',
            `Deleted show: ${title}`,
            'warning'
        );

        return NextResponse.json({ success: true, message: 'Event deleted' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
