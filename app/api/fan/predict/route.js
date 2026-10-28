import { NextResponse } from 'next/server';
import { apiError, readJson } from '@/lib/api';
import dbConnect from '@/lib/db';
import Prediction from '@/models/Prediction';
import Setlist from '@/models/Setlist';
import { verifyAuth } from '@/lib/auth';
import { resolveEvent } from '@/lib/events';
import { ConflictError, ValidationError } from '@/lib/errors';

const MAX_SONGS = 10;

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const eventId = new URL(req.url).searchParams.get('eventId');
        if (!eventId) throw new ValidationError('Event ID required');

        const event = await resolveEvent(eventId);
        const prediction = await Prediction.findOne({ userId: user.userId, eventId: event._id });
        return NextResponse.json({ success: true, data: prediction });
    } catch (error) {
        return apiError(error, '/api/fan/predict');
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { eventId, songs } = await readJson(req);
        if (!eventId || !Array.isArray(songs)) throw new ValidationError('Invalid data');
        if (songs.length > MAX_SONGS) throw new ValidationError(`Max ${MAX_SONGS} songs allowed`);

        const cleanSongs = songs.map((s) => ({
            id: s?.id ? String(s.id).slice(0, 64) : undefined,
            title: String(s?.title ?? '').trim().slice(0, 200),
        })).filter((s) => s.title || s.id);

        const event = await resolveEvent(eventId);

        // Predictions close when the show leaves standby: once songs are being played,
        // a prediction is no longer a prediction.
        const setlist = await Setlist.findOne({ eventId: event._id }).select('showStatus');
        if (setlist && setlist.showStatus !== 'Standby') {
            throw new ConflictError('Predictions are closed: the show has started');
        }

        const existing = await Prediction.findOne({ userId: user.userId, eventId: event._id }).select('status');
        if (existing?.status === 'graded') {
            throw new ConflictError('Prediction is already graded and locked.');
        }

        const savedPrediction = await Prediction.findOneAndUpdate(
            { userId: user.userId, eventId: event._id },
            { userId: user.userId, eventId: event._id, songs: cleanSongs, status: 'submitted' },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
        return NextResponse.json({ success: true, data: savedPrediction });
    } catch (error) {
        return apiError(error, '/api/fan/predict');
    }
}
