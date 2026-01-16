import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { message } = await req.json();

        // Find an active event to attach this message to.
        // In a real app, the specific Event ID should be passed in the body.
        // For now, we'll find the first "Active" or "Upcoming" event this user manages.
        const event = await Event.findOne({
            $or: [{ organizerId: user.userId }, { assignedTo: user.userId }],
            date: { $gte: new Date() }
        }).sort({ date: 1 });

        if (!event) {
            return NextResponse.json({ error: "No active event found to attach message to." }, { status: 400 });
        }

        // Create the Task (Message)
        // We use "Crew Message:" prefix so we can potentially filter it differently later if needed
        const newTask = await Task.create({
            eventId: event._id,
            title: `Crew Message: ${message}`,
            assignee: "Artist Management", // Assigned back to them
            priority: 'High',
            status: 'pending',
            urgent: true, // FLAG FOR DASHBOARD ALERT
            columnId: 'preprod',
            tag: 'General',
            dueDate: 'ASAP'
        });

        return NextResponse.json({ success: true, data: newTask });

    } catch (error) {
        console.error("Crew Message API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
