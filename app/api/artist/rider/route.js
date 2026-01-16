
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Rider from '@/models/Rider';
import { verifyAuth } from '@/lib/auth';

// GET: Fetch the artist's rider
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find rider for this artist
        const rider = await Rider.findOne({ artistId: user.userId });

        // valid even if null (frontend handles empty state)
        return NextResponse.json({ success: true, data: rider });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Update or Create Rider
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { gear, notes } = body;

        // Upsert logic: Update if exists, Create if not
        const updatedRider = await Rider.findOneAndUpdate(
            { artistId: user.userId },
            {
                artistId: user.userId,
                gear: gear || [],
                notes: notes || ''
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({ success: true, data: updatedRider });

    } catch (error) {
        console.error("Rider Update Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
