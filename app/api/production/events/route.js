
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import { verifyAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { requireRole } from '@/lib/authz';
function getTypeColor(type) {
    switch (type) {
        case 'Touring': return 'bg-blue-500';
        case 'Festival': return 'bg-indigo-500';
        case 'Corporate': return 'bg-slate-600';
        case 'Theatre': return 'bg-amber-600';
        default: return 'bg-gray-500';
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        requireRole(user, 'production', 'organizer');
        
        const body = await req.json();
        if (!body.title || !body.date) {
            return NextResponse.json({ error: 'Title and Date are required' }, { status: 400 });
        }
        let venueDoc = await Venue.findOne({ name: body.venue });
        if (!venueDoc) {
            venueDoc = await Venue.create({
                name: body.venue || 'Unknown Venue',
                city: 'Unknown City',
                capacity: 1000,
                location: 'Unknown Address'
            });
        }
        const newEventId = Math.floor(1000 + Math.random() * 9000);
        const newEvent = await Event.create({
            eventId: newEventId,
            title: body.title,
            description: 'Created via Production Dashboard',
            date: new Date(body.date),
            time: '20:00', // Default
            venue: venueDoc._id,
            city: venueDoc.city,
            artist: body.artist || 'TBD',
            genre: body.type,
            status: 'active',
            organizerId: user.userId,
            images: {
                hero: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000'
            },
            ticketTiers: [],
            discounts: []
        });
        await logActivity(
            user.userId,
            'create',
            'Event',
            `Created show: ${newEvent.title}`,
            'success',
            `/patch-studio/${newEvent.eventId || newEvent._id}`
        );

        return NextResponse.json({
            success: true,
            data: {
                id: newEvent.eventId || newEvent._id,
                title: newEvent.title,
                venue: newEvent.city,
                date: newEvent.date,
                status: 'active',
                type: newEvent.genre,
                typeColor: getTypeColor(newEvent.genre)
            }
        });

    } catch (error) {
        return apiError(error, '/api/production/events');
    }
}
