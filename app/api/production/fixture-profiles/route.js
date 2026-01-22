import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FixtureProfile from '@/models/FixtureProfile';

export async function GET() {
    try {
        await dbConnect();        const profiles = await FixtureProfile.find({}).sort({ manufacturer: 1, model: 1 });
        return NextResponse.json({ success: true, data: profiles });
    } catch (error) {
        console.error('Failed to fetch fixture profiles', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch profiles' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { manufacturer, model, modes, type } = body;        if (!manufacturer || !model || !modes || modes.length === 0) {
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
        console.error('Failed to create fixture profile', error);
        return NextResponse.json({ success: false, error: 'Failed to create profile' }, { status: 500 });
    }
}
