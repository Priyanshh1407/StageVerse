import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        console.error("Message API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
