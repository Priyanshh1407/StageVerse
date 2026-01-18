import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const notifications = await Notification.find({ userId: user.userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        // Optional: Mark as read batch logic could go here or in a separate PUT

        return NextResponse.json({ success: true, notifications });
    } catch (error) {
        console.error("Notifications Fetch Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
