import { NextResponse } from 'next/server';
import { apiError, readJson } from '@/lib/api';
import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor } from '@/lib/authz';
import { NotFoundError, ValidationError } from '@/lib/errors';

// Guest lists are managed by the event's artist or organizer
const GUEST_MANAGERS = ['artist', 'organizer'];
const TIERS = ['VIP', 'All Access', 'Afterparty', 'Guest'];
const STATUSES = ['Pending', 'Checked In', 'approved'];

async function loadGuestFor(user, guestId) {
    const guest = await Guest.findById(guestId);
    if (!guest) throw new NotFoundError('Guest not found');
    await loadEventFor(user, guest.eventId, GUEST_MANAGERS);
    return guest;
}

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const eventId = new URL(req.url).searchParams.get('eventId');
        if (!eventId) throw new ValidationError('Event ID is required');

        const event = await loadEventFor(user, eventId, GUEST_MANAGERS);
        const guests = await Guest.find({ eventId: event._id }).sort({ addedAt: -1 });
        return NextResponse.json({ success: true, data: guests });
    } catch (error) {
        return apiError(error, '/api/artist/guest-list');
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { eventId, name, tier, email } = await readJson(req);
        if (!eventId || !name) throw new ValidationError('Missing required fields');
        if (tier && !TIERS.includes(tier)) throw new ValidationError('Invalid tier');

        const event = await loadEventFor(user, eventId, GUEST_MANAGERS);
        const newGuest = await Guest.create({
            eventId: event._id,
            artistId: event.artistId,
            name,
            tier: tier || 'Guest',
            email,
            status: 'Pending',
            addedBy: user.userId,
        });
        return NextResponse.json({ success: true, data: newGuest });
    } catch (error) {
        return apiError(error, '/api/artist/guest-list');
    }
}

export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { id, status, name, email, tier } = await readJson(req);
        if (!id) throw new ValidationError('Guest ID required');
        if (tier && !TIERS.includes(tier)) throw new ValidationError('Invalid tier');
        if (status && !STATUSES.includes(status)) throw new ValidationError('Invalid status');

        await loadGuestFor(user, id);

        const updateData = {};
        if (status) updateData.status = status;
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (tier) updateData.tier = tier;

        const updatedGuest = await Guest.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        return NextResponse.json({ success: true, data: updatedGuest });
    } catch (error) {
        return apiError(error, '/api/artist/guest-list');
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { id, eventId, clearAll } = await readJson(req);
        if (id) {
            await loadGuestFor(user, id);
            await Guest.findByIdAndDelete(id);
            return NextResponse.json({ success: true });
        }
        if (clearAll && eventId) {
            const event = await loadEventFor(user, eventId, GUEST_MANAGERS);
            await Guest.deleteMany({ eventId: event._id });
            return NextResponse.json({ success: true });
        }
        throw new ValidationError('Invalid request');
    } catch (error) {
        return apiError(error, '/api/artist/guest-list');
    }
}
