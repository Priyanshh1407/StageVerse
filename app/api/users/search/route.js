import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        
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
        return apiError(error, '/api/users/search');
    }
}
