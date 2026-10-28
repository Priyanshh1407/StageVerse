import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Setlist from '@/models/Setlist';
import Prediction from '@/models/Prediction';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor } from '@/lib/authz';
import { scorePrediction, rankByScore } from '@/lib/scoring';

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const body = await req.json();
        const { eventId } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }
        // Only the event's artist can grade the prediction game
        const event = await loadEventFor(user, eventId, ['artist']);
        const mongoEventId = event._id;
        const setlist = await Setlist.findOne({ eventId: mongoEventId });
        if (!setlist || !setlist.items || setlist.items.length === 0) {
            return NextResponse.json({ error: 'Artist has not saved a setlist yet.' }, { status: 400 });
        }
        const predictions = await Prediction.find({ eventId: mongoEventId }).populate('userId', 'name email avatar');
        if (predictions.length === 0) {
            return NextResponse.json({ success: true, message: 'No predictions found.', winners: [] });
        }

        const truthItems = setlist.items || [];
        const scored = predictions
            .map((pred) => { pred.score = scorePrediction(pred.songs || [], truthItems); return pred; })
            .sort((a, b) => b.score - a.score);

        const ranked = rankByScore(scored);
        // One round trip instead of a save() per prediction
        await Prediction.bulkWrite(ranked.map(({ item, rank }) => ({
            updateOne: { filter: { _id: item._id }, update: { score: item.score, rank, status: 'graded' } },
        })));
        const winners = ranked.filter(({ rank }) => rank <= 3).map(({ item, rank }) => {
            item.rank = rank;
            item.status = 'graded';
            return item;
        });

        return NextResponse.json({
            success: true,
            message: 'Results declared successfully',
            winners: winners.slice(0, 3)
        });

    } catch (error) {
        return apiError(error, '/api/artist/declare-results');
    }
}
