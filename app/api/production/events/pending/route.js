
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const pendingEvents = await Event.find({
            $or: [{ status: 'requested' }, { productionStatus: 'requested' }],
            assignedTo: user.userId
        }).populate('venue').sort({ date: 1 });

        return NextResponse.json({ success: true, data: pendingEvents });

    } catch (error) {
        return apiError(error, '/api/production/events/pending');
    }
}
