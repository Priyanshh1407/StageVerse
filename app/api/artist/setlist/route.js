
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Setlist from '@/models/Setlist';
import Song from '@/models/Song';
import { verifyAuth } from '@/lib/auth';

// ... (GET remains similar, but check if we need to resolve ID there too? Yes, likely)

// GET: Fetch setlist for an event
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        let eventIdInput = searchParams.get('eventId');
        if (!eventIdInput) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

        let mongoEventId = eventIdInput;

        // Determine if input is valid ObjectId or Legacy Number
        const isValidObjectId = mongoose.Types.ObjectId.isValid(eventIdInput);

        if (isValidObjectId) {
            mongoEventId = eventIdInput;
        } else {
            // Legacy Numeric Lookup
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
        console.error("[Setlist GET] Error:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

// POST: Save Setlist (Order matters)
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        let { eventId, items } = body;

        if (!eventId || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        let mongoEventId = eventId;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(eventId);

        if (!isValidObjectId) {
            // Resolve numeric ID to Mongo ID
            const event = await Event.findOne({ eventId: eventId });
            if (!event) {
                return NextResponse.json({ error: `Event ${eventId} not found` }, { status: 404 });
            }
            mongoEventId = event._id;
        }

        // --- NEW: Sync Items to Song Collection ---
        // Iterate through items, ensure they exist in Song collection
        // This ensures the Fan Predictor has a pool to choose from
        const processedItems = await Promise.all(items.map(async (item) => {
            // Try to find existing song by Title + Artist
            // Use regex for case-insensitive match
            let song = await Song.findOne({
                artistId: user.userId,
                title: { $regex: new RegExp(`^${item.title}$`, 'i') }
            });

            if (!song) {
                // Create new Song if it doesn't exist
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

            // Return the item with the valid songId attached
            return {
                ...item,
                songId: song._id,
                // Ensure we keep the setlist-specific overrides (notes, status)
            };
        }));

        // Upsert setlist for this event
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
        console.error("Setlist Save Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
