import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor } from '@/lib/authz';

export async function POST(req) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);
        
        const body = await req.json();
        const { userId, eventId } = body;

        if (!userId || !eventId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        // Only the event's artist can put prediction winners on the guest list
        const event = await loadEventFor(artist, eventId, ['artist']);
        const fan = await User.findById(userId);
        if (!fan) {
            return NextResponse.json({ error: 'Fan not found' }, { status: 404 });
        }
        const newGuest = await Guest.findOneAndUpdate(
            { eventId: event._id, email: fan.email },
            {
                name: fan.name,
                email: fan.email,
                userId: fan._id, // Ensure userId is saved!
                eventId: event._id,
                status: 'approved', // Auto-approve winners
                plusOnes: 1, // Give them a +1 by default? Let's say yes for winners.
                notes: 'Winner of Setlist Prediction Game',
                addedBy: artist.userId,
                artistId: artist.userId // NEW: Save explicit artistId
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
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
        return apiError(error, '/api/artist/guestlist/add');
    }
}
