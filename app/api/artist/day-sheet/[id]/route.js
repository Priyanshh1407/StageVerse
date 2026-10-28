import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { parseBody, daySheetUpdateSchema } from '@/lib/schemas';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor, EVENT_TEAM } from '@/lib/authz';

export async function GET(req, { params }) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const resolvedParams = await params;
        const { id } = resolvedParams;
        // Day sheets include venue intel (wifi password, green room code): team only
        const event = await loadEventFor(user, id, EVENT_TEAM, { populate: 'venue' });
        let schedule = event.daySheet;

        if (!schedule || schedule.length === 0) {
            console.log("Generating Default Schedule...");
            const showDoors = event.doorsOpen || '07:00 PM';
            const showTime = event.time || '09:00 PM';

            schedule = [
                {
                    time: '10:00 AM',
                    title: 'Lobby Call',
                    sub: 'Hotel Lobby • Depart for Venue',
                    type: 'travel',
                    details: 'Manifest: 12 Pax, 2 Vans.',
                    status: 'future'
                },
                {
                    time: '02:00 PM',
                    title: 'Load-In',
                    sub: 'Loading Dock B',
                    type: 'work',
                    details: 'Local Crew: 4 Hands.',
                    status: 'future'
                },
                {
                    time: '04:00 PM',
                    title: 'Soundcheck',
                    sub: 'Full Band • Sync: Production Team',
                    type: 'sound',
                    tasks: [
                        { label: 'Line Check', done: false },
                        { label: 'Monitor Mix', done: false },
                        { label: 'IEM Sync', done: false }
                    ],
                    status: 'future'
                },
                {
                    time: showDoors,
                    title: 'Doors Open',
                    sub: 'Main Entrance',
                    type: 'doors',
                    details: 'Security Briefing at 6:30 PM.',
                    status: 'future'
                },
                {
                    time: showTime,
                    title: 'SHOWTIME',
                    sub: `Main Stage • ${event.city} • 90 Min Set`,
                    type: 'show',
                    isHeadline: true,
                    details: 'Setlist A. Pyrotechnics enabled.',
                    status: 'future'
                }
            ];
            event.daySheet = schedule;
            await event.save();
        }

        return NextResponse.json({
            success: true,
            data: {
                event: {
                    city: event.city,
                    venue: event.venue?.name || 'TBA',
                    date: new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                },
                schedule: event.daySheet,
                venueIntel: event.venueIntel || {}
            }
        });

    } catch (error) {
        return apiError(error, '/api/artist/day-sheet/[id]');
    }
}

export async function PUT(req, { params }) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const resolvedParams = await params;
        const { id } = resolvedParams;
        const { schedule, venueIntel, notifyTeam } = parseBody(daySheetUpdateSchema, await req.json());
        const updateData = {};
        if (schedule) {
            updateData.daySheet = schedule.map(item => {
                const newItem = { ...item };
                if (newItem.id && String(newItem.id).startsWith('new-')) {
                    delete newItem.id;
                    delete newItem._id;
                }
                return newItem;
            });
        }
        if (venueIntel) updateData.venueIntel = venueIntel;

        const existing = await loadEventFor(user, id, ['artist', 'organizer']);
        const event = await Event.findByIdAndUpdate(
            existing._id,
            { $set: updateData },
            { returnDocument: 'after' }
        );
        if (notifyTeam && schedule) {
            console.log("Creating Notification Task for Crew...");
            await Task.create({
                eventId: event._id,
                title: `Artist Update: Day Sheet Changed`,
                assignee: 'All Crew',
                priority: 'High',
                urgent: true,
                columnId: 'preprod',
                tag: 'General',
                tagColor: 'bg-blue-500/10 text-blue-500',
                dueDate: 'Today'
            });
        }

        return NextResponse.json({ success: true, data: event });

    } catch (error) {
        return apiError(error, '/api/artist/day-sheet/[id]');
    }
}
