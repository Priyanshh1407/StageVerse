import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue'; // Ensure Venue is registered
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        console.log("ARTIST FETCH - User:", user); // DEBUG LOG
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("ARTIST FETCH - Querying artistId:", user.userId); // DEBUG LOG

        const events = await Event.find({
            $or: [
                { artistId: user.userId },
                { assignedTo: user.userId }
            ]
        })
            .sort({ date: 1 })
            .populate('venue', 'name city')
            .select('title date city venue image');

        return NextResponse.json({ success: true, events });
    } catch (error) {
        console.error("Fetch Events Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
