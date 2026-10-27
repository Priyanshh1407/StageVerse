import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const notifications = await Task.find({
            status: { $ne: 'Done' },
            urgent: true,
            title: { $regex: '^Crew Message:', $options: 'i' }
        }).sort({ createdAt: -1 }).limit(10);

        return NextResponse.json({ success: true, data: notifications });

    } catch (error) {
        return apiError(error, '/api/artist/notifications');
    }
}
