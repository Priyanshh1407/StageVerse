import { NextResponse } from 'next/server';
import { apiError, readJson } from '@/lib/api';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor, loadTaskFor, myEventIds, EVENT_TEAM } from '@/lib/authz';
import { ValidationError } from '@/lib/errors';

// Stored statuses: 'pending' | 'Done' ('Done' is what the dashboards' "mark read" sends).
// The tasks page speaks 'pending' | 'completed'.
const toDbStatus = (s) => (s === 'completed' || s === 'Done' ? 'Done' : 'pending');
const PRIORITIES = ['Low', 'Medium', 'High'];

// Fields a client may set on a task (eventId is set once, on create)
function pickTaskFields(body) {
    const out = {};
    if (body.title !== undefined) out.title = String(body.title).trim().slice(0, 200);
    if (body.description !== undefined) out.description = String(body.description).slice(0, 2000);
    if (body.priority !== undefined) {
        if (!PRIORITIES.includes(body.priority)) throw new ValidationError('Invalid priority');
        out.priority = body.priority;
    }
    if (body.dueDate !== undefined) out.dueDate = String(body.dueDate).slice(0, 50);
    if (body.tag !== undefined) out.tag = String(body.tag).slice(0, 50);
    if (body.urgent !== undefined) out.urgent = Boolean(body.urgent);
    if (body.status !== undefined) out.status = toDbStatus(body.status);
    return out;
}

function formatDue(dueDate) {
    if (!dueDate) return 'ASAP';
    const d = new Date(dueDate);
    return Number.isNaN(d.getTime()) ? dueDate : d.toLocaleDateString(); // free text like "Tomorrow" stays as is
}

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const status = new URL(req.url).searchParams.get('status');

        // Only tasks for events this user is part of
        const query = { eventId: { $in: await myEventIds(user) } };
        if (status && status !== 'all') query.status = toDbStatus(status);

        const tasks = await Task.find(query)
            .populate({ path: 'eventId', model: Event, select: 'title city' })
            .sort({ dueDate: 1, priority: 1 });

        const formatted = tasks.map(t => ({
            id: t._id,
            eventId: t.eventId?._id,
            title: t.title,
            show: t.eventId?.title || 'General',
            venue: t.eventId?.city || '',
            priority: t.priority,
            tag: t.tag,
            urgent: t.urgent,
            dueDate: formatDue(t.dueDate),
            status: t.status === 'Done' ? 'completed' : 'pending',
            assignee: t.assignee || 'Crew'
        }));

        return NextResponse.json({ success: true, data: formatted });
    } catch (e) {
        return apiError(e, '/api/production/tasks');
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const body = await readJson(req);

        if (!body.eventId) throw new ValidationError('Pick the show this task belongs to');
        const fields = pickTaskFields(body);
        if (!fields.title) throw new ValidationError('Title is required');

        const event = await loadEventFor(user, body.eventId, EVENT_TEAM);
        const newTask = await Task.create({
            ...fields,
            eventId: event._id,
            status: fields.status || 'pending',
            assignee: body.assignee ? String(body.assignee).slice(0, 100) : undefined,
        });

        return NextResponse.json({ success: true, data: newTask }, { status: 201 });
    } catch (e) {
        return apiError(e, '/api/production/tasks');
    }
}

export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const { id, ...body } = await readJson(req);
        if (!id) throw new ValidationError('Task id required');

        await loadTaskFor(user, id);
        const updatedTask = await Task.findByIdAndUpdate(id, pickTaskFields(body), { new: true, runValidators: true });
        return NextResponse.json({ success: true, data: updatedTask });
    } catch (e) {
        return apiError(e, '/api/production/tasks');
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const id = new URL(req.url).searchParams.get('id');
        if (!id) throw new ValidationError('Task id required');

        await loadTaskFor(user, id);
        await Task.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (e) {
        return apiError(e, '/api/production/tasks');
    }
}
