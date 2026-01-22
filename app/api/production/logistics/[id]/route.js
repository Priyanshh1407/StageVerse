import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Logistics from '@/models/Logistics';
import Task from '@/models/Task';
import Event from '@/models/Event';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;        let event = null;        if (!isNaN(id)) {
            event = await Event.findOne({ eventId: Number(id) });
        }        if (!event && mongoose.Types.ObjectId.isValid(id)) {
            event = await Event.findById(id);
        }        if (!event && id === 'project-alpha') {
            event = await Event.findOne({ title: 'Hamlet World Tour' });
        }

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }        const eventId = event._id;        const logistics = await Logistics.findOne({ eventId });        const logisticsData = logistics || {
            phase: 'Pre-Production',
            crew: [],
            documents: []
        };        const eventDetails = await Event.findById(eventId);        const tasks = await Task.find({ eventId });        const columns = [
            { id: 'preprod', title: 'Pre-Production', dotColor: 'bg-slate-400', cards: [] },
            { id: 'loadin', title: 'Load-In', dotColor: 'bg-amber-400', cards: [] },
            { id: 'show', title: 'Show', dotColor: 'bg-blue-500', cards: [] }, // "Focus" in mock? Let's use Show
            { id: 'loadout', title: 'Load-Out', dotColor: 'bg-red-400', cards: [], isGhost: true },
            { id: 'other', title: 'Other / Backlog', dotColor: 'bg-gray-500', cards: [] }
        ];        tasks.forEach(task => {            const col = columns.find(c => c.id === task.columnId) || columns.find(c => c.id === 'other');

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
        });        columns.forEach(c => c.count = c.cards.length);        const responseData = {
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
