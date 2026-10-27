
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Setlist from '@/models/Setlist';
import Song from '@/models/Song';
import { verifyAuth } from '@/lib/auth';
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { searchParams } = new URL(req.url);
        let eventIdInput = searchParams.get('eventId');
        if (!eventIdInput) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

        let mongoEventId = eventIdInput;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(eventIdInput);

        if (isValidObjectId) {
            mongoEventId = eventIdInput;
        } else {
            const numericEventId = parseInt(eventIdInput);
            if (!isNaN(numericEventId)) {
                const event = await Event.findOne({ eventId: numericEventId });
                if (event) mongoEventId = event._id;
                else return NextResponse.json({ success: true, data: null });
            } else {
                return NextResponse.json({ error: 'Invalid Event ID format' }, { status: 400 });
            }
        }

        const setlist = await Setlist.findOne({ eventId: mongoEventId });
        return NextResponse.json({ success: true, data: setlist });

    } catch (error) {
        return apiError(error, '/api/artist/setlist');
    }
}
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const body = await req.json();
        let { eventId, items } = body;

        if (!eventId || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        let mongoEventId = eventId;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(eventId);

        if (!isValidObjectId) {
            const event = await Event.findOne({ eventId: eventId });
            if (!event) {
                return NextResponse.json({ error: `Event ${eventId} not found` }, { status: 404 });
            }
            mongoEventId = event._id;
        }
        const processedItems = await Promise.all(items.map(async (item) => {
            let song = await Song.findOne({
                artistId: user.userId,
                title: { $regex: new RegExp(`^${item.title}$`, 'i') }
            });

            if (!song) {
                song = await Song.create({
                    artistId: user.userId,
                    title: item.title,
                    duration: item.duration,
                    bpm: item.bpm && !isNaN(parseInt(item.bpm)) ? parseInt(item.bpm) : null,
                    tags: item.tags ? item.tags.map(t => t.label || t).filter(Boolean) : [], // Flatten tag objects if needed
                    color: item.tags && item.tags.length > 0 ? item.tags[0].color : 'blue'
                });
                console.log(`[Setlist Sync] Created new song: ${item.title}`);
            }
            return {
                ...item,
                songId: song._id,
            };
        }));
        const updatedSetlist = await Setlist.findOneAndUpdate(
            { eventId: mongoEventId },
            {
                artistId: user.userId,
                eventId: mongoEventId,
                items: processedItems
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({ success: true, data: updatedSetlist });

    } catch (error) {
        return apiError(error, '/api/artist/setlist');
    }
}
