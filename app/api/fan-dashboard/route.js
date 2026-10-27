import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Ticket from "@/models/Ticket";
import Event from "@/models/Event";
import Memory from "@/models/Memory";
import Venue from "@/models/Venue";
import Song from "@/models/Song";
import Prediction from "@/models/Prediction";
import Setlist from "@/models/Setlist";

export async function GET() {
    try {
        await dbConnect();
        const cookieStore = await cookies();
        const token = cookieStore.get("token");
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token.value, secret);
        const userId = payload.userId;
        const [user, tickets, memories] = await Promise.all([
            User.findById(userId).populate('following', 'name image'),
            Ticket.find({ userId })
                .populate({
                    path: 'eventId',
                    select: 'title artist genre image venue organizerId date',
                    populate: { path: 'venue', select: 'name city' }
                }),
            Memory.find({ userId }).sort({ date: -1 }).limit(5)
        ]);

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
        const ticketsWithEvents = tickets.filter(t => t.eventId);
        const ticketsWithVenues = tickets.filter(t => t.eventId && t.eventId.venue);
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const upcomingTickets = ticketsWithEvents
            .filter(t => new Date(t.eventId.date) >= now)
            .sort((a, b) => new Date(a.eventId.date) - new Date(b.eventId.date))
            .slice(0, 5); // Limit to top 5
        const upcomingEventsCallback = upcomingTickets.map(async (ticket) => {
            const evt = ticket.eventId;

            const eventObj = {
                _id: evt._id,
                eventId: evt.eventId, // If existing field
                title: evt.title,
                artist: evt.artist,
                date: evt.date,
                venue: evt.venue?.name,
                image: evt.image
            };
            let songs = [];
            if (evt.organizerId) {
                songs = await Song.find({ artistId: evt.organizerId }).sort({ title: 1 }).lean();
            }
            const prediction = await Prediction.findOne({
                userId: user._id,
                eventId: evt._id
            }).lean();
            let setlistResult = null;
            if (prediction && prediction.status === 'graded') {
                setlistResult = await Setlist.findOne({ eventId: evt._id }).lean();
                if (!setlistResult) {
                    setlistResult = await Setlist.findOne({ eventId: evt.eventId }).lean();
                }
            }

            return {
                event: eventObj,
                songs: songs.map(s => ({ ...s, _id: s._id.toString(), artistId: s.artistId.toString() })),
                prediction: prediction ? { ...prediction, _id: prediction._id.toString() } : null,
                setlist: setlistResult ? { ...setlistResult, _id: setlistResult._id.toString() } : null
            };
        });

        const upcomingEventsData = await Promise.all(upcomingEventsCallback);
        const activeEventData = upcomingEventsData.length > 0 ? upcomingEventsData[0] : null;
        const totalShows = ticketsWithEvents.length;
        const cities = new Set(ticketsWithVenues.map(t => t.eventId.venue.city).filter(Boolean));
        const artistMap = {};

        ticketsWithEvents.forEach(t => {
            const artist = t.eventId.artist;
            if (artist) {
                const key = artist.trim();
                artistMap[key] = (artistMap[key] || 0) + 1;
            }
        });

        const sortedArtistNames = Object.keys(artistMap).sort((a, b) => artistMap[b] - artistMap[a]);
        const allArtists = sortedArtistNames.map((name, i) => {
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
        const topArtists = allArtists.slice(0, 3);
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
        const formattedMemories = memories.map(m => ({
            id: m._id,
            title: m.title,
            date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            image: m.imageUrl || m.videoSrc,
            type: m.videoSrc ? 'video' : 'image',
            featured: !!m.videoSrc
        }));
        const topFriends = user.following ? user.following.map(f => ({
            name: f.name,
            avatar: f.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
            sharedShows: Math.floor(Math.random() * 5) + 1,
            role: "Concert Buddy"
        })) : [];
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
                socials: user.socials || { instagram: "", twitter: "" }
            },
            stats: {
                showsAttended: { value: totalShows, subtext: "Top Fan", progress: Math.min(totalShows * 2, 100) },
                citiesVisited: { value: cities.size, km: "12,400" },
            },
            allArtists,
            topArtists,
            topFriends,
            topVenues,
            memories: formattedMemories,
            upcomingEvents: upcomingEventsData,
            activeEvent: activeEventData?.event || null,
            activeEventSongs: activeEventData?.songs || [],
            activeEventPrediction: activeEventData?.prediction || null,
            activeEventSetlist: activeEventData?.setlist || null
        };

        return NextResponse.json({ success: true, data: dashboardData });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ message: "Server Error" }, { status: 500 });
    }
}