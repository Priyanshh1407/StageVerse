import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Upsert Venue
        let venue = await Venue.findOne({ name: 'Jio World Garden' });
        if (!venue) {
            venue = await Venue.create({
                name: 'Jio World Garden',
                address: 'BKC, Mumbai',
                city: 'Mumbai, IN',
                capacity: '15,000',
                type: 'Outdoor Arena',
                image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=2548&auto=format&fit=crop'
            });
        }

        const eventsToSeed = [
            {
                eventId: 201, // Next Show
                title: "The Eras Tour (Mumbai Leg)",
                description: "The massive stadium tour comes to India.",
                date: new Date(new Date().setHours(20, 0, 0, 0)), // Today at 8PM
                time: "20:00",
                venue: venue._id,
                city: "Mumbai, IN",
                artist: "Taylor Swift", // Or dynamic user name
                organizerId: user.userId,
                images: { hero: venue.image },
                ticketTiers: [
                    { name: "VIP", price: 500, capacity: 500, sold: 450 },
                    { name: "GA Standing", price: 150, capacity: 5000, sold: 4200 },
                    { name: "Seated", price: 200, capacity: 3000, sold: 2900 }
                ],
                status: 'Scheduled'
            },
            {
                eventId: 202,
                title: "The Eras Tour (Delhi Leg)",
                description: "Next stop: JLN Stadium.",
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
                time: "19:00",
                venue: venue._id, // Reusing venue for simplicity or create another
                city: "New Delhi, IN",
                artist: "Taylor Swift",
                organizerId: user.userId,
                images: { hero: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2532&auto=format&fit=crop" },
                ticketTiers: [
                    { name: "GA", price: 150, capacity: 10000, sold: 200 }
                ],
                status: 'Scheduled'
            },
            {
                eventId: 203,
                title: "The Eras Tour (Bangalore Leg)",
                description: "Garden City Rock.",
                date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
                time: "20:00",
                venue: venue._id,
                city: "Bangalore, IN",
                artist: "Taylor Swift",
                organizerId: user.userId,
                images: { hero: "https://images.unsplash.com/photo-1470229722913-7c0d2dbbafd3?q=80&w=2670&auto=format&fit=crop" },
                ticketTiers: [
                    { name: "GA", price: 150, capacity: 10000, sold: 0 }
                ],
                status: 'Scheduled'
            }
        ];

        // Upsert Events
        for (const evt of eventsToSeed) {
            await Event.findOneAndUpdate(
                { eventId: evt.eventId },
                evt,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        // 2. Create Urgent Tasks for ALL Seeded Events (to ensure whatever is "Next" has an alert)
        const Task = mongoose.models.Task || mongoose.model('Task');
        const eventIds = [201, 202, 203];

        for (const eid of eventIds) {
            const evt = await Event.findOne({ eventId: eid });
            if (evt) {
                const existing = await Task.findOne({ eventId: evt._id, title: { $regex: 'Urgent' } });
                if (!existing) {
                    await Task.create({
                        eventId: evt._id,
                        title: `Urgent: Production Check for ${evt.city}`,
                        assignee: "Stage Manager",
                        priority: "High",
                        status: "pending",
                        urgent: true,
                        dueDate: "ASAP"
                    });
                }
            }
        }

        return NextResponse.json({ success: true, message: "Dashboard Data & Urgent Task Seeded!" });

    } catch (error) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
