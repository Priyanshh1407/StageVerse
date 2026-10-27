import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const notifications = await Task.find({
            status: { $ne: 'Done' },
            urgent: true,
            title: { $regex: '^Crew Message:', $options: 'i' }
        }).sort({ createdAt: -1 }).limit(10);

        return NextResponse.json({ success: true, data: notifications });

    } catch (error) {
        console.error("Artist Notifications Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
