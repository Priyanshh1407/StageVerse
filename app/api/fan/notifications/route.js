import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const notifications = await Notification.find({ userId: user.userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json({ success: true, notifications });
    } catch (error) {
        return apiError(error, '/api/fan/notifications');
    }
}
