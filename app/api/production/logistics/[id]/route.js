import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Logistics from '@/models/Logistics';
import Task from '@/models/Task';
import Event from '@/models/Event';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        // 1. Resolve Event ID (supports numeric friend IDs like "13" or ObjectIds)
        let event = null;

        // Try numeric look up
        if (!isNaN(id)) {
            event = await Event.findOne({ eventId: Number(id) });
        }

        // Try fallback to ObjectId
        if (!event && mongoose.Types.ObjectId.isValid(id)) {
            event = await Event.findById(id);
        }

        // Support Legacy "project-alpha"
        if (!event && id === 'project-alpha') {
            event = await Event.findOne({ title: 'Hamlet World Tour' });
        }

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // This is the CRITICAL part: Use the resolved event's _id for all DB queries
        const eventId = event._id;

        // 1. Fetch Logistics Info
        const logistics = await Logistics.findOne({ eventId });
        // If no logistics found, maybe return default empty structure or 404?
        // Let's return a basic structure to not break UI.
        const logisticsData = logistics || {
            phase: 'Pre-Production',
            crew: [],
            documents: []
        };

        // Also need Event details (Venue, Name)
        const eventDetails = await Event.findById(eventId);

        // 2. Fetch Tasks
        const tasks = await Task.find({ eventId });

        // 3. Transform to Kanban Structure
        // columns: preprod, loadin, show, loadout, maintenance
        // match the frontend expected structure
        const columns = [
            { id: 'preprod', title: 'Pre-Production', dotColor: 'bg-slate-400', cards: [] },
            { id: 'loadin', title: 'Load-In', dotColor: 'bg-amber-400', cards: [] },
            { id: 'show', title: 'Show', dotColor: 'bg-blue-500', cards: [] }, // "Focus" in mock? Let's use Show
            { id: 'loadout', title: 'Load-Out', dotColor: 'bg-red-400', cards: [], isGhost: true },
            { id: 'other', title: 'Other / Backlog', dotColor: 'bg-gray-500', cards: [] }
        ];

        // Map tasks to columns
        tasks.forEach(task => {
            // Find column by ID using strict match first, then fallback to 'other'
            const col = columns.find(c => c.id === task.columnId) || columns.find(c => c.id === 'other');

            if (col) {
                col.cards.push({
                    id: task._id.toString(),
                    title: task.title,
                    tag: task.tag || 'General',
                    tagColor: task.tagColor || 'bg-gray-500/10 text-gray-400',
                    date: task.dueDate || 'No Date',
                    urgent: task.urgent,
                    status: task.status,
                    assignee: task.assignee
                });
            }
        });

        // Add counts
        columns.forEach(c => c.count = c.cards.length);

        // 4. Construct Final Response
        const responseData = {
            id: eventId,
            showName: eventDetails ? eventDetails.name : 'Unknown Show',
            venue: eventDetails ? eventDetails.location : 'Unknown Venue',
            phase: logisticsData.phase,
            crew: logisticsData.crew,
            docs: logisticsData.documents || [],
            kanban: columns
        };

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
