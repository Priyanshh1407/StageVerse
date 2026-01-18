import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

// UPDATE NOTES (PATCH)
export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);
        if (!artist) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const { notes } = body;

        const guest = await Guest.findByIdAndUpdate(
            id,
            { notes },
            { new: true }
        );

        if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

        return NextResponse.json({ success: true, guest });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// REVOKE ACCESS (DELETE)
export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);
        if (!artist) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        // 1. Find Guest to get details
        const guest = await Guest.findById(id);
        if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

        // 2. Delete Notification
        // Robust strategy: Use userId if present, otherwise fallback to email lookup
        let targetUserId = guest.userId;

        if (!targetUserId && guest.email) {
            const user = await User.findOne({ email: guest.email });
            if (user) targetUserId = user._id;
        }

        if (targetUserId) {
            // New Request: Don't delete old notification. Send a NEW one informing of revocation.
            // We need the event details for a good message.
            // Since guest.eventId is just an ID, we might need to fetch the Event title if we want to be fancy,
            // but for speed, we can say "for the event you were on the guestlist for".
            // OR we can populate it if we did a population query, but we did findById.

            // Let's try to be helpful and specific if possible.
            // We can assume the frontend or user knows which event it was, but the notification needs text.

            await Notification.create({
                userId: targetUserId,
                type: 'system', // or 'alert'
                title: 'Guestlist Access Revoked ⚠️',
                message: `Update regarding your guestlist status. Your access has been revoked by the organizer.`,
                link: '/dashboard', // Nowhere specific to go if ticket is gone
                metadata: {
                    eventId: guest.eventId
                }
            });

            console.log(`[Guestlist] Revocation notification sent to User ${targetUserId}.`);

        } else {
            console.warn(`[Guestlist] Could not resolve User for guest ${id}. No notification sent.`);
        }

        // 3. Delete Guest
        await Guest.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
