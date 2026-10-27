import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const events = await Event.find({
            artistId: user.userId
        })
            .sort({ date: 1 }) // Upcoming first
            .populate('venue', 'name city state');

        return NextResponse.json({
            success: true,
            data: events
        });

    } catch (error) {
        console.error("Day Sheet List API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
