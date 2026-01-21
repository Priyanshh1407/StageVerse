import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Event from '@/models/Event';

export async function GET(req, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        console.log(`[API] Fetching artist with ID: ${id}`);

        // Validate ID format (prevent CastError crash)
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            console.warn(`[API] Invalid Metadata ID format: ${id}`);
            return NextResponse.json({ success: false, error: 'Artist not found (Invalid ID)' }, { status: 404 });
        }

        // 1. Fetch Artist Profile
        const artist = await User.findById(id).select('name role bio location avatar socials stats').lean();

        if (!artist) {
            console.warn(`[API] Artist not found in DB: ${id}`);
            return NextResponse.json({ success: false, error: 'Artist not found' }, { status: 404 });
        }

        console.log(`[API] Found artist: ${artist.name}`);

        // 2. Fetch Artist's Events (Upcoming)
        const events = await Event.find({
            $or: [
                { artistId: artist._id },
                { artist: artist.name } // Fallback to name match
            ],
            status: { $in: ['Published', 'Scheduled', 'Live'] }
        })
            .select('title date time venue city images ticketTiers')
            .populate('venue', 'name city')
            .sort({ date: 1 })
            .lean();

        // 3. Format Response
        const data = {
            id: artist._id,
            name: artist.name,
            image: artist.avatar || "https://images.unsplash.com/photo-1741036379058-cca704d04101?w=600&auto=format&fit=crop",
            bio: artist.bio ? [artist.bio] : ["This artist has not added a bio yet."],
            genres: ["Artist", "Performer"], // Default
            location: artist.location || "Global",
            stats: artist.stats || {},
            upcomingShows: events.map(e => ({
                id: e._id,
                day: new Date(e.date).getDate(),
                month: new Date(e.date).toLocaleString('default', { month: 'short' }).toUpperCase(),
                venue: e.venue?.name || e.venue || 'TBA',
                city: e.venue?.city || e.city || 'Unknown City',
                title: e.title
            })),
            popularTracks: [], // Mocking tracks as users don't upload tracks yet
            relatedArtists: [] // Mock or simple aggregation
        };

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Failed to fetch artist details:', error);
        return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
    }
}
