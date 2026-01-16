import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id, status } = await req.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing Data' }, { status: 400 });
        }

        const task = await Task.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        return NextResponse.json({ success: true, data: task });

    } catch (error) {
        console.error("Logistics Update Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
