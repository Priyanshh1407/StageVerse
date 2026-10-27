import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setlist from '@/models/Setlist';
import Prediction from '@/models/Prediction';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { eventId } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }
        let mongoEventId = eventId;
        if (!eventId.match(/^[0-9a-fA-F]{24}$/)) {
            const event = await Event.findOne({ eventId: eventId });
            if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            mongoEventId = event._id;
        }
        const setlist = await Setlist.findOne({ eventId: mongoEventId });
        if (!setlist || !setlist.items || setlist.items.length === 0) {
            return NextResponse.json({ error: 'Artist has not saved a setlist yet.' }, { status: 400 });
        }
        const predictions = await Prediction.find({ eventId: mongoEventId }).populate('userId', 'name email avatar');

        console.log(`[Declare Results] Found ${predictions.length} predictions for Event ${mongoEventId}`);

        if (predictions.length === 0) {
            console.log("[Declare Results] No predictions found. Exiting.");
            return NextResponse.json({ success: true, message: 'No predictions found.', winners: [] });
        }
        const truthItems = setlist.items || [];
        console.log(`[Declare Results] Truth Setlist has ${truthItems.length} items.`);

        const scoredPredictions = [];

        for (const pred of predictions) {
            let score = 0;
            const predItems = pred.songs || [];
            console.log(`[Declare Results] Grading Prediction ${pred._id} (User: ${pred.userId?._id}). Items: ${predItems.length}`);

            predItems.forEach((pSong, pIndex) => {
                const matchIndex = truthItems.findIndex((tSong, tIndex) => {
                    if (pSong.id && tSong.songId && pSong.id.toString() === tSong.songId.toString()) return true;
                    const pTitle = pSong.title ? pSong.title.trim().toLowerCase() : "";
                    const tTitle = tSong.title ? tSong.title.trim().toLowerCase() : "";
                    return pTitle === tTitle;
                });

                if (matchIndex !== -1) {
                    score += 10; // Base points for correct song
                    if (matchIndex === pIndex) {
                        score += 5;
                    }
                }
            });

            console.log(`[Declare Results] Score for ${pred._id}: ${score}`);
            pred.score = score;
            pred.status = 'graded';
            scoredPredictions.push(pred);
        }
        scoredPredictions.sort((a, b) => b.score - a.score);
        const winners = [];
        let currentRank = 1;

        for (let i = 0; i < scoredPredictions.length; i++) {
            const pred = scoredPredictions[i];
            if (i > 0 && pred.score < scoredPredictions[i - 1].score) {
                currentRank = i + 1;
            }

            pred.rank = currentRank;
            await pred.save();

            if (currentRank <= 3) {
                winners.push(pred);
            }
        }

        console.log(`[Declare Results] Calculated Winners: ${winners.length}`);

        return NextResponse.json({
            success: true,
            message: 'Results declared successfully',
            winners: winners.slice(0, 3)
        });

    } catch (error) {
        console.error("Declare Results Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
