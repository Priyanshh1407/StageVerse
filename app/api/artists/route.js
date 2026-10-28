import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { containsRegex } from '@/lib/escapeRegex';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');

        const query = { role: 'artist' };

        if (search) {
            query.$or = [
                { name: containsRegex(search) },
                { location: containsRegex(search) }
            ];
        }
        const artists = await User.find(query)
            .select('name avatar bio location stats role')
            .lean();
        const formattedArtists = artists.map(a => ({
            id: a._id,
            name: a.name,
            genre: 'Artist', // Schema doesn't have genre, defaulting
            type: 'Solo Artist',
            location: a.location || 'Unknown',
            upcomingEvents: 0, // Would need expensive lookup or aggregation, skipping for list view efficiency or defaulting
            popularity: a.stats?.showsAttended || (Math.floor(Math.random() * 50) + 50), // Mocking popularity if empty
            image: a.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=800&auto=format&fit=crop"
        }));

        return NextResponse.json({ success: true, data: formattedArtists });

    } catch (error) {
        return apiError(error, '/api/artists');
    }
}
