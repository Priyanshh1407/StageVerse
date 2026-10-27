import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Prediction from '@/models/Prediction';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }
        let queryEventId = eventId;
        if (!eventId.match(/^[0-9a-fA-F]{24}$/)) {
            const event = await Event.findOne({ eventId: eventId });
            if (event) queryEventId = event._id;
            else return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const prediction = await Prediction.findOne({
            userId: user.userId,
            eventId: queryEventId
        });

        return NextResponse.json({ success: true, data: prediction });

    } catch (error) {
        return apiError(error, '/api/fan/predict');
    }
}
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const body = await req.json();
        const { eventId, songs } = body;

        if (!eventId || !songs || !Array.isArray(songs)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        if (songs.length > 10) {
            return NextResponse.json({ error: 'Max 10 songs allowed' }, { status: 400 });
        }

        console.log("[API] Received Prediction:", { userId: user.userId, eventId, songCount: songs.length });
        let queryEventId = eventId;
        if (!eventId.match(/^[0-9a-fA-F]{24}$/)) {
            const event = await Event.findOne({ eventId: eventId });
            if (event) {
                queryEventId = event._id;
                console.log("[API] Resolved Numeric Event ID to:", queryEventId);
            } else {
                console.error("[API] Event Not Found:", eventId);
                return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            }
        }
        const existingPrediction = await Prediction.findOne({ userId: user.userId, eventId: queryEventId });
        if (existingPrediction && existingPrediction.status !== 'submitted') {
            if (existingPrediction.status === 'graded') {
                return NextResponse.json({ error: 'Prediction is already graded and locked.' }, { status: 403 });
            }
        }

        const savedPrediction = await Prediction.findOneAndUpdate(
            { userId: user.userId, eventId: queryEventId },
            {
                userId: user.userId,
                eventId: queryEventId,
                songs: songs,
                status: 'submitted'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log("[API] Saved Prediction:", savedPrediction ? savedPrediction._id : "FAILED");

        return NextResponse.json({ success: true, data: savedPrediction });

    } catch (error) {
        return apiError(error, '/api/fan/predict');
    }
}
