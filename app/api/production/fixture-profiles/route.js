import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import FixtureProfile from '@/models/FixtureProfile';
import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';

export async function GET(req) {
    try {
        await dbConnect();
        await verifyAuth(req);
        const profiles = await FixtureProfile.find({}).sort({ manufacturer: 1, model: 1 });
        return NextResponse.json({ success: true, data: profiles });
    } catch (error) {
        return apiError(error, '/api/production/fixture-profiles');
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        requireRole(user, 'production');
        const body = await req.json();
        const { manufacturer, model, modes, type } = body;
        if (!manufacturer || !model || !modes || modes.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const newProfile = await FixtureProfile.create({
            manufacturer,
            model,
            type,
            modes
        });

        return NextResponse.json({ success: true, data: newProfile });
    } catch (error) {
        return apiError(error, '/api/production/fixture-profiles');
    }
}
