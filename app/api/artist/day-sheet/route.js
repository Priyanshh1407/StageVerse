import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
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
        return apiError(error, '/api/artist/day-sheet');
    }
}
