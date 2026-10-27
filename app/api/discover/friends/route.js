import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import { verifyAuth } from '@/lib/auth';
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Ticket from "@/models/Ticket";
import Event from "@/models/Event";
import Venue from "@/models/Venue";

export async function GET(req) {
    try {
        await dbConnect();

        const payload = await verifyAuth(req);

        const currentUser = await User.findById(payload.userId).select('following');
        if (!currentUser || !currentUser.following.length) {
            return NextResponse.json({ success: true, data: [] });
        }

        const friendsTickets = await Ticket.find({
            userId: { $in: currentUser.following },
            status: 'Confirmed'
        })
            .populate('userId', 'name image')
            .populate({
                path: 'eventId',
                select: 'title date venue image',
                populate: {
                    path: 'venue',
                    model: 'Venue', // Explicitly state the model
                    select: 'name city'
                }
            }).sort({ createdAt: -1 })
            .limit(50);

        const groupedEvents = {};

        friendsTickets.forEach(ticket => {
            if (!ticket.eventId || !ticket.userId) return;
            const eventId = ticket.eventId._id.toString();

            if (!groupedEvents[eventId]) {
                const eventDate = new Date(ticket.eventId.date);
                const daysDiff = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
                let statusText = "Upcoming";
                if (daysDiff === 0) statusText = "Today";
                else if (daysDiff === 1) statusText = "Tomorrow";
                else if (daysDiff > 0 && daysDiff < 7) statusText = `In ${daysDiff} days`;

                groupedEvents[eventId] = {
                    id: eventId,
                    title: ticket.eventId.title,
                    venue: ticket.eventId.venue?.name || "Unkown Venue",
                    date: new Date(ticket.eventId.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    image: ticket.eventId.image,
                    status: 'Going',
                    attendees: [],
                };
            }

            const friendId = ticket.userId._id.toString();
            if (!groupedEvents[eventId].attendees.find(a => a.id === friendId)) {
                groupedEvents[eventId].attendees.push({
                    id: friendId,
                    initials: ticket.userId.name.substring(0, 2).toUpperCase(),
                    img: ticket.userId.image || null,
                    name: ticket.userId.name
                });
            }
        });

        const result = Object.values(groupedEvents);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        nsole.error('Friends API Error:', error);
        return apiError(error, '/api/discover/friends');
    }
}