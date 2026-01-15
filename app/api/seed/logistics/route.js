import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Logistics from '@/models/Logistics';
import Task from '@/models/Task';
import Event from '@/models/Event'; // Assuming you have an Event model

export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        let eventId = searchParams.get('eventId');

        // 1. Setup a dummy event if not exists (or just use a hardcoded ID for simplicity if models allow)
        // For this seed, we'll assume a "project-alpha" event ID or create one.
        // Let's rely on a string ID for now if your schema allows, or create a fake ObjectId.
        // Ideally, we find an existing event or create one.

        if (!eventId) {
            // User requested to seed for event ID 13 specifically.
            // We search for the existing event.
            let event = await Event.findOne({ eventId: 13 });

            // If not found, create it with the specific details provided by the user
            if (!event) {
                event = await Event.create({
                    eventId: 13,
                    title: 'After Hours Til Dawn',
                    description: 'The global stadium tour featuring hits from After Hours.',
                    date: new Date('2024-01-10'),
                    time: '18:30',
                    city: 'London',
                    artist: 'The Weeknd',
                    genre: 'R&B',
                    status: 'Scheduled',
                    venue: new mongoose.Types.ObjectId("69611003b2c2182bce50f769"),
                    organizerId: new mongoose.Types.ObjectId("69611002cba7207c6277393c"),
                    location: 'London' // Using city as location
                });
            }
            // Use the mongo _id for relations
            eventId = event._id;
        }

        // 2. Clear existing data -> REMOVED to preserve data
        // await Logistics.deleteMany({ eventId });
        // await Task.deleteMany({ eventId });

        // 3. Create Logistics Document (Upsert if not exists)
        // We use $setOnInsert to only set data if doc is new.
        await Logistics.findOneAndUpdate(
            { eventId },
            {
                $setOnInsert: {
                    phase: 'Technical Rehearsals',
                    crew: [
                        { name: "James Hold", role: "ME", status: "Updating Patch", color: "bg-green-500" },
                        { name: "Sarah Jenkins", role: "ALD", status: "Focusing LX2", color: "bg-green-500" },
                        { name: "Mike Ross", role: "Rigging", status: "Break", color: "bg-amber-500" }
                    ],
                    documents: [
                        { title: "Light Plot v4.2", type: "Map", url: "#" },
                        { title: "Magic Sheet", type: "Grid", url: "#" }
                    ]
                }
            },
            { upsert: true, new: true }
        );

        // 4. Create Tasks
        const tasks = [
            {
                eventId,
                title: 'Finalize Truck Pack Diagram',
                columnId: 'preprod',
                status: 'pending',
                priority: 'Medium',
                tag: 'Admin',
                tagColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                dueDate: 'Oct 24'
            },
            {
                eventId,
                title: 'Print & Laminate Magic Sheets',
                columnId: 'preprod',
                status: 'pending',
                priority: 'Low',
                tag: 'Electric',
                tagColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                dueDate: 'Tomorrow'
            },
            {
                eventId,
                title: 'Hang Main Truss (LX 1-4)',
                columnId: 'loadin',
                status: 'pending',
                priority: 'High',
                urgent: true,
                tag: 'Rigging',
                tagColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                dueDate: '08:00 AM'
            },
            {
                eventId,
                title: 'Load Truck 1 (Audio)',
                columnId: 'loadout',
                status: 'completed',
                priority: 'High',
                urgent: true,
                tag: 'Trucks',
                tagColor: 'bg-red-500/10 text-red-400 border border-red-500/20',
                dueDate: 'Now'
            }
        ];

        await Task.insertMany(tasks);

        return NextResponse.json({
            success: true,
            message: 'Logistics data seeded (appended)',
            eventId: eventId
        });

    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
