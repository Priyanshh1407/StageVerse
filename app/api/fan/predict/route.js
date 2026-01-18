import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Prediction from '@/models/Prediction';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

// GET: Fetch User's Prediction for an Event
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        // Resolve ID if numeric (assuming Event model handles this, or passed as ObjectId)
        // Ideally frontend passes ObjectId, but let's be robust
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
        console.error("Prediction Fetch Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Save/Update Prediction
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { eventId, songs } = body;

        if (!eventId || !songs || !Array.isArray(songs)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        if (songs.length > 10) {
            return NextResponse.json({ error: 'Max 10 songs allowed' }, { status: 400 });
        }

        console.log("[API] Received Prediction:", { userId: user.userId, eventId, songCount: songs.length });

        // Resolve Event ID
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

        // Check for existing locked prediction
        const existingPrediction = await Prediction.findOne({ userId: user.userId, eventId: queryEventId });
        if (existingPrediction && existingPrediction.status !== 'submitted') {
            // Allow re-submit if status is 'submitted' ? Or lock it immediately? 
            // User said "when locked... it is not updating". 
            // If they click "Lock In", it sets status to 'submitted'.
            // If they try to CHANGE it, we should block it or allow it until grading?
            // "Locked" usually means "Cannot Change". 
            // Let's assume ONLY 'graded' is truly final, OR we can implement a 'locked' state.
            // But for now, if it is 'graded', definitely block.
            if (existingPrediction.status === 'graded') {
                return NextResponse.json({ error: 'Prediction is already graded and locked.' }, { status: 403 });
            }
        }

        // Actually, let's allow updates UNTIL graded, unless 'locking' feature is explicit.
        // User asked "when locked... it is not updating that when declare results... results not visible".
        // This implies the locking might be working TOO well or not saving correctly?
        // Wait, "when locked in prediction it is not updating". Maybe the UI doesn't show it's locked?

        // Let's ensure we return the status properly.

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
        console.error("Prediction Save Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
