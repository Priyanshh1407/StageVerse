import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

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
        return apiError(error, '/api/production/logistics');
    }
}
