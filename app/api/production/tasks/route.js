import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Retrieve 'status' from query params if needed, or just fetch all
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        // Build Filter
        // For now, fetching tasks assigned to this user OR generic production tasks
        // In a real app, you'd filter by user.userId or role.
        // Assuming for now we just want all tasks for demonstration parity with dashboard
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        const tasks = await Task.find(query).sort({ dueDate: 1, priority: 1 });

        const formatted = tasks.map(t => ({
            id: t._id,
            title: t.title,
            show: t.showName || 'General', // Assuming Task model has showName or we populate event
            venue: t.venue || '',
            priority: t.priority,
            dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'ASAP',
            status: t.status === 'Done' ? 'completed' : 'pending',
            assignee: t.assignedToName || 'Crew'
        }));

        return NextResponse.json({ success: true, data: formatted });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();

        const newTask = new Task({
            title: body.title,
            priority: body.priority,
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            status: 'Pending',
            showName: body.show, // Denormalizing for simplicity
            venue: body.venue,
            assignedTo: user.userId,
            assignedToName: user.name || 'Producer'
        });

        await newTask.save();

        return NextResponse.json({ success: true, data: newTask });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, ...updates } = body;

        // Map frontend status 'completed' -> 'Done', 'pending' -> 'Pending'
        if (updates.status) {
            updates.status = updates.status === 'completed' ? 'Done' : 'Pending';
        }

        const updatedTask = await Task.findByIdAndUpdate(id, updates, { new: true });

        return NextResponse.json({ success: true, data: updatedTask });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        await Task.findByIdAndDelete(id);

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
