
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import { verifyAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
function getTypeColor(type) {
    switch (type) {
        case 'Touring': return 'bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]';
        case 'Festival': return 'bg-indigo-500';
        case 'Corporate': return 'bg-slate-600';
        case 'Theatre': return 'bg-amber-600';
        default: return 'bg-gray-500';
    }
}
export async function PUT(req, { params }) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { id } = await params;
        const body = await req.json();
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { eventId: id };
        const event = await Event.findOne(query);

        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        const isOrganizer = event.organizerId.toString() === user.userId;
        const isAssigned = event.assignedTo && event.assignedTo.toString() === user.userId;
        if (!isOrganizer && !isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        let actionDetails = `Updated ${event.title}`;
        if (body.title) event.title = body.title;
        if (body.date) event.date = new Date(body.date);
        if (body.type || body.genre) event.genre = body.type || body.genre;

        if (body.status) {
            // production states (accepting a request, archiving, unarchiving) live in productionStatus,
            // which the crew dashboard reads; the public event status is left alone
            if (['requested', 'active', 'archived', 'completed'].includes(body.status)) {
                event.productionStatus = body.status;
            } else {
                event.status = body.status;
            }
            actionDetails = `Changed status to ${body.status}: ${event.title}`;
        }
        if (body.venue && body.venue !== event.city) {
            let venueDoc = await Venue.findOne({ name: body.venue });
            if (!venueDoc) {
                venueDoc = await Venue.create({
                    name: body.venue,
                    city: 'Unknown City',
                    capacity: '1000',
                    address: 'TBA'
                });
            }
            event.venue = venueDoc._id;
            event.city = venueDoc.city;
        }

        await event.save();
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
        return apiError(error, '/api/production/events/[id]');
    }
}
export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { id } = await params;
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { eventId: id };
        const event = await Event.findOne(query);

        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        if (event.organizerId.toString() !== user.userId) {
            return NextResponse.json({ error: 'Only the organizer can delete this event' }, { status: 403 });
        }

        const title = event.title;
        await Event.deleteOne({ _id: event._id });
        await logActivity(
            user.userId,
            'delete',
            'Event',
            `Deleted show: ${title}`,
            'warning'
        );

        return NextResponse.json({ success: true, message: 'Event deleted' });

    } catch (error) {
        return apiError(error, '/api/production/events/[id]');
    }
}
