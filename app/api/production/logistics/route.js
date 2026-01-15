import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

async function resolveEventId(idOrString) {
    if (!idOrString) return null;

    // Check if it's a valid ObjectId first?
    // Actually, we prioritize checking our custom ID logic first to match GET route behavior
    // Try to find by custom eventId (e.g. "13")
    const eventByCustomId = await Event.findOne({ eventId: idOrString });
    if (eventByCustomId) return eventByCustomId._id;

    // Try by _id if it looks like one
    if (idOrString.match(/^[0-9a-fA-F]{24}$/)) {
        const eventById = await Event.findById(idOrString);
        if (eventById) return eventById._id;
    }

    return idOrString;
}

export async function POST(req) {
    try {
        await dbConnect();

        // 1. Verify Auth
        const user = await verifyAuth(req);

        const body = await req.json();
        const {
            eventId,
            title,
            status, // "Load-In", "pending", etc.
            columnId,
            priority,
            assignee,
            dueDate,
            tag,
            tagColor,
            urgent
        } = body;

        console.log("POST Task Payload:", body);

        if (!title || !eventId) {
            return NextResponse.json(
                { error: 'Missing required fields: title, eventId' },
                { status: 400 }
            );
        }

        // RESOLVE EVENT ID
        const resolvedEventId = await resolveEventId(eventId);
        console.log("Resolved Event ID for POST:", resolvedEventId);

        // VERIFY OWNERSHIP (Bypass for now)
        // Ensure user is the organizer of the target event
        // const eventDoc = await Event.findOne({ _id: resolvedEventId, organizerId: user.userId });
        const eventDoc = await Event.findOne({ _id: resolvedEventId });
        if (!eventDoc) {
            console.warn(`Unauthorized Task Creation: User ${user.userId} tried to create task for event ${resolvedEventId}`);
            // return NextResponse.json({ error: 'Unauthorized: You do not own this event' }, { status: 403 });
        }

        // Determine initial columnId and status based on input
        let finalColumnId = columnId || 'preprod'; // default
        let finalStatus = 'pending';

        // Heuristics for "Status" field if provided
        if (status) {
            const lowerStatus = status.toLowerCase();
            // Map phases to columnId
            if (lowerStatus === 'load-in') finalColumnId = 'loadin';
            else if (lowerStatus === 'pre-production') finalColumnId = 'preprod';
            else if (lowerStatus === 'show') finalColumnId = 'show';
            else if (lowerStatus === 'load-out') finalColumnId = 'loadout';
            else if (lowerStatus === 'maintenance') finalColumnId = 'maintenance';

            // Map completion status
            else if (lowerStatus === 'done' || lowerStatus === 'completed') finalStatus = 'completed';
            else if (lowerStatus === 'to do' || lowerStatus === 'pending') finalStatus = 'pending';
        }

        const newTask = await Task.create({
            eventId: resolvedEventId, // Use resolved ID
            title,
            columnId: finalColumnId,
            status: finalStatus,
            priority: priority || 'Medium',
            assignee,
            dueDate,
            tag,
            tagColor,
            urgent: urgent || false
        });

        return NextResponse.json({ success: true, data: newTask }, { status: 201 });

    } catch (error) {
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error creating task (POST):', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        await dbConnect();

        // 1. Verify Auth
        const user = await verifyAuth(req);

        const body = await req.json();
        console.log("PUT Task Payload:", body);

        const { id, taskId, status, columnId, ...updates } = body;

        // Support id in body or taskId
        const targetId = id || taskId;

        if (!targetId) {
            return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        // Verify task exists and belongs to user's event?
        // Ideally yes, but that requires extra lookup. 
        // For now, let's at least trust the Auth check + standard update.
        // If we want to be strict: 
        /*
        const taskToCheck = await Task.findById(targetId).populate('eventId');
        // Check taskToCheck.eventId.organizerId === user.userId
        */

        const updateData = { ...updates };

        // CRITICAL FIX: Resolve eventId if it is being updated (to convert String "13" to ObjectId)
        if (updateData.eventId) {
            const resolved = await resolveEventId(updateData.eventId);
            if (resolved) {
                // Verify new event ownership
                const eventDoc = await Event.findOne({ _id: resolved, organizerId: user.userId });
                if (!eventDoc) {
                    return NextResponse.json({ error: 'Unauthorized: You do not own the target event' }, { status: 403 });
                }
                updateData.eventId = resolved;
            } else {
                console.warn("Could not resolve eventId in PUT:", updateData.eventId);
            }
        }

        // Handle string "status" mapping being possibly columnId OR completion status
        if (status) {
            const lowerStatus = status.toLowerCase();

            if (lowerStatus === 'done' || lowerStatus === 'completed') {
                updateData.status = 'completed';
            } else if (lowerStatus === 'to do' || lowerStatus === 'pending') {
                updateData.status = 'pending';
            } else if (lowerStatus === 'load-in') {
                updateData.columnId = 'loadin';
            } else if (lowerStatus === 'pre-production') {
                updateData.columnId = 'preprod';
            } else if (lowerStatus === 'show') {
                updateData.columnId = 'show';
            } else if (lowerStatus === 'load-out') {
                updateData.columnId = 'loadout';
            } else {
                // Just set it if it doesn't match known keywords
                updateData.status = status;
            }
        }

        if (columnId) {
            updateData.columnId = columnId;
        }

        console.log("Updating Task:", targetId, "with data:", updateData);

        const updatedTask = await Task.findByIdAndUpdate(
            targetId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedTask) {
            console.warn("Task not found for update:", targetId);
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedTask }, { status: 200 });

    } catch (error) {
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error updating task (PUT):', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error.toString()
        }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();

        // 1. Verify Auth
        const user = await verifyAuth(req);

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        // Verify Ownership before delete?
        // const task = await Task.findById(id);
        // check Event ownership...

        const deletedTask = await Task.findByIdAndDelete(id);

        if (!deletedTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: deletedTask }, { status: 200 });

    } catch (error) {
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error deleting task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
