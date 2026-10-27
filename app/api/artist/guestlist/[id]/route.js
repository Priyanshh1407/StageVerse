import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor } from '@/lib/authz';
import { NotFoundError } from '@/lib/errors';

const GUEST_MANAGERS = ['artist', 'organizer'];

async function loadGuestFor(user, id) {
    const guest = await Guest.findById(id);
    if (!guest) throw new NotFoundError('Guest not found');
    await loadEventFor(user, guest.eventId, GUEST_MANAGERS);
    return guest;
}
export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);

        const { id } = await params;
        const body = await req.json();
        const { notes } = body;

        await loadGuestFor(artist, id);
        const guest = await Guest.findByIdAndUpdate(
            id,
            { notes },
            { new: true }
        );

        if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

        return NextResponse.json({ success: true, guest });
    } catch (e) {
        return apiError(e, '/api/artist/guestlist/[id]');
    }
}
export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const artist = await verifyAuth(req);

        const { id } = await params;
        const guest = await loadGuestFor(artist, id);
        let targetUserId = guest.userId;

        if (!targetUserId && guest.email) {
            const user = await User.findOne({ email: guest.email });
            if (user) targetUserId = user._id;
        }

        if (targetUserId) {

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
        await Guest.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (e) {
        return apiError(e, '/api/artist/guestlist/[id]');
    }
}
