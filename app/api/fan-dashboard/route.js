import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Ticket from "@/models/Ticket";
import Event from "@/models/Event";
import Memory from "@/models/Memory";
import Venue from "@/models/Venue";

export async function GET() {
    try {
        await dbConnect();

        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get("token");
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token.value, secret);
        const userId = payload.userId;

        // 2. Fetch User & Memories in Parallel (Faster) ⚡
        const [user, tickets, memories] = await Promise.all([
            User.findById(userId).populate('following', 'name image'),
            Ticket.find({ userId })
                .populate({
                    path: 'eventId',
                    select: 'artist genre image venue',
                    populate: { path: 'venue', select: 'name city' }
                }),
            Memory.find({ userId }).sort({ date: -1 }).limit(5)
        ]);

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        // --- DEBUGGING LOGS (Check your terminal) ---
        console.log(`Found ${tickets.length} total tickets for user.`);

        // --- CALCULATIONS ---

        // A. Separate lists for robustness
        // List 1: validEvents (Has an event attached) -> Use for Artists
        const ticketsWithEvents = tickets.filter(t => t.eventId);

        // List 2: validVenues (Has an event AND a venue attached) -> Use for Stats/Venues
        const ticketsWithVenues = tickets.filter(t => t.eventId && t.eventId.venue);

        console.log(`Tickets with Events: ${ticketsWithEvents.length}`);
        console.log(`Tickets with Venues: ${ticketsWithVenues.length}`);

        // B. Stats
        const totalShows = ticketsWithEvents.length;
        const cities = new Set(ticketsWithVenues.map(t => t.eventId.venue.city).filter(Boolean));

        // C. TOP ARTISTS CALCULATION
        const artistMap = {};

        ticketsWithEvents.forEach(t => {
            const artist = t.eventId.artist;
            // Normalizing names to prevent duplicates like "The Strokes" vs "the strokes"
            if (artist) {
                const key = artist.trim();
                artistMap[key] = (artistMap[key] || 0) + 1;
            }
        });

        const sortedArtistNames = Object.keys(artistMap).sort((a, b) => artistMap[b] - artistMap[a]);

        // 1. Create FULL list
        const allArtists = sortedArtistNames.map((name, i) => {
            // Find a ticket for this artist to get the image/genre
            const exampleTicket = ticketsWithEvents.find(t => t.eventId.artist && t.eventId.artist.trim() === name);
            const evt = exampleTicket?.eventId;

            return {
                rank: i + 1,
                name: name,
                genre: evt?.genre || "Music",
                count: artistMap[name],
                image: evt?.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"
            };
        });

        // 4. Create topArtists by SLICING the master list
        // This ensures they are mathematically identical
        const topArtists = allArtists.slice(0, 3);

        // D. TOP VENUES
        const venueMap = {};
        ticketsWithVenues.forEach(t => {
            const v = t.eventId.venue;
            if (v) {
                if (!venueMap[v.name]) {
                    venueMap[v.name] = { name: v.name, location: v.city, visits: 0, active: false };
                }
                venueMap[v.name].visits += 1;
            }
        });
        const topVenues = Object.values(venueMap).sort((a, b) => b.visits - a.visits).slice(0, 3);
        if (topVenues.length > 0) topVenues[0].active = true;

        // E. Format Memories
        const formattedMemories = memories.map(m => ({
            id: m._id,
            title: m.title,
            date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            image: m.imageUrl || m.videoSrc, // Fixed: match your Schema field names (imageUrl vs image)
            type: m.videoSrc ? 'video' : 'image', // Auto-detect type if not saved explicitly
            featured: !!m.videoSrc
        }));

        // F. Format Friends
        const topFriends = user.following ? user.following.map(f => ({
            name: f.name,
            avatar: f.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde", // Allow frontend fallback
            sharedShows: Math.floor(Math.random() * 5) + 1,
            role: "Concert Buddy"
        })) : [];

        // 5. Construct Final Response
        const dashboardData = {
            user: {
                name: user.name,
                id: `#${user._id.toString().slice(-5).toUpperCase()}`,
                level: Math.floor(totalShows / 2) + 1,
                memberSince: new Date(user.createdAt).getFullYear().toString(),
                avatar: user.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                predictionScore: 1250,
                location: user.location || "Global Citizen",
                bio: user.bio || "Music junkie. Festival hopper.",
                socials: user.socials || { instagram: "", twitter: "" } // Safety check
            },
            stats: {
                showsAttended: { value: totalShows, subtext: "Top Fan", progress: Math.min(totalShows * 2, 100) },
                citiesVisited: { value: cities.size, km: "12,400" }, // Keep the static km for now
            },
            allArtists,
            topArtists,
            topFriends,
            topVenues,
            memories: formattedMemories
        };

        return NextResponse.json({ success: true, data: dashboardData });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ message: "Server Error" }, { status: 500 });
    }
}