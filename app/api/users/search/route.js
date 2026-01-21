import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('query');
        const role = searchParams.get('role');

        if (!query || query.length < 2) {
            return NextResponse.json({ success: true, users: [] });
        }

        const filter = {
            name: { $regex: query, $options: 'i' }
        };

        if (role) {
            filter.role = role;
        }

        const users = await User.find(filter)
            .select('name role email avatar')
            .limit(10);

        return NextResponse.json({ success: true, users });
    } catch (error) {
        console.error('User Search Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
