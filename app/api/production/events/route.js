
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

export async function POST(req) {
    try {
        await dbConnect();

        // 1. Auth Check
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Basic Validation
        if (!body.title || !body.date) {
            return NextResponse.json({ error: 'Title and Date are required' }, { status: 400 });
        }

        // Validate or Create Venue 
        let venueDoc = await Venue.findOne({ name: body.venue });
        if (!venueDoc) {
            venueDoc = await Venue.create({
                name: body.venue || 'Unknown Venue',
                city: 'Unknown City',
                capacity: 1000,
                location: 'Unknown Address'
            });
        }

        // Generate a random 4-digit Event ID if not provided
        const newEventId = Math.floor(1000 + Math.random() * 9000);

        // Create the Event
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

        // LOG ACTIVITY
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
        console.error("Create Event Error:", error);
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
    }
}
