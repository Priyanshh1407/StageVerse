import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { message, priority } = await req.json();
        const nextShow = await Event.findOne({
            organizerId: user.userId,
            date: { $gte: new Date() }
        }).sort({ date: 1 });

        if (!nextShow) {
            return NextResponse.json({ error: "No upcoming shows found to attach message to." }, { status: 400 });
        }
        const newTask = await Task.create({
            eventId: nextShow._id,
            title: `Artist Message: ${message}`, // "Artist Message: We need more water"
            assignee: "Production Crew",
            priority: priority || 'High',
            status: 'pending',
            urgent: true, // Flags it for the Dashboard Alert system too!
            columnId: 'preprod',
            tag: 'General',
            dueDate: 'ASAP'
        });

        return NextResponse.json({ success: true, data: newTask });

    } catch (error) {
        return apiError(error, '/api/artist/message');
    }
}
