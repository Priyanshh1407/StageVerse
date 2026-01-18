import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('query');

        if (!query || query.length < 2) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Search for users with 'production' role and matching name
        // Case-insensitive regex search
        const users = await User.find({
            role: 'production',
            name: { $regex: query, $options: 'i' }
        }).select('_id name email avatar role').limit(5);

        return NextResponse.json({ success: true, data: users });

    } catch (error) {
        console.error("User Search Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
