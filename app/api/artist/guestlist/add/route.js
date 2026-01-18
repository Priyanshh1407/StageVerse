import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
    try {
        await dbConnect();

        // 1. Authenticate Artist
        const artist = await verifyAuth(req);
        if (!artist) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { userId, eventId } = body;

        if (!userId || !eventId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Fetch Details for Notification
        const event = await Event.findById(eventId);
        const fan = await User.findById(userId);

        if (!event || !fan) {
            return NextResponse.json({ error: 'Event or Fan not found' }, { status: 404 });
        }

        // 3. Add to Guestlist (Upsert to prevent duplicates)
        // Adjusting schema usage based on assumption, usually guestlist has name, email, +1s, status
        const newGuest = await Guest.findOneAndUpdate(
            { eventId: eventId, email: fan.email },
            {
                name: fan.name,
                email: fan.email,
                userId: fan._id, // Ensure userId is saved!
                eventId: eventId,
                status: 'approved', // Auto-approve winners
                plusOnes: 1, // Give them a +1 by default? Let's say yes for winners.
                notes: 'Winner of Setlist Prediction Game',
                addedBy: artist.userId
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 4. Create Notification for Fan
        await Notification.create({
            userId: fan._id,
            type: 'guestlist',
            title: 'You made the Guestlist! 🎉',
            message: `Artist ${artist.name || 'The Artist'} added you to the guestlist for ${event.title || 'the show'} at ${event.venue?.name || 'the venue'}.`,
            link: `/ticket`, // Or somewhere relevant
            metadata: {
                eventId: event._id,
                guestId: newGuest._id
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Fan added to guestlist and notified!',
            data: newGuest
        });

    } catch (error) {
        console.error("Guestlist Add Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
