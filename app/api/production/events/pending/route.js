
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });        const pendingEvents = await Event.find({
            $or: [{ status: 'requested' }, { productionStatus: 'requested' }],
            assignedTo: user.userId
        }).populate('venue').sort({ date: 1 });

        return NextResponse.json({ success: true, data: pendingEvents });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
