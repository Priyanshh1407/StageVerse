
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { escapeRegex } from '@/lib/escapeRegex';
import dbConnect from '@/lib/db';
import Setlist from '@/models/Setlist';
import Song from '@/models/Song';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor, EVENT_TEAM } from '@/lib/authz';
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { searchParams } = new URL(req.url);
        let eventIdInput = searchParams.get('eventId');
        if (!eventIdInput) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

        // The real setlist is only visible to the event team (fans could otherwise
        // read it and submit a perfect prediction)
        const event = await loadEventFor(user, eventIdInput, EVENT_TEAM);
        const setlist = await Setlist.findOne({ eventId: event._id });
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

        // Only the artist linked to this event may change its setlist
        const event = await loadEventFor(user, eventId, ['artist']);
        const mongoEventId = event._id;
        const processedItems = await Promise.all(items.map(async (item) => {
            let song = await Song.findOne({
                artistId: user.userId,
                title: { $regex: `^${escapeRegex(String(item.title ?? ''))}$`, $options: 'i' }
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
                artistId: event.artistId,
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
