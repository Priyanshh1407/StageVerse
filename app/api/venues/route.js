import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Venue from '@/models/Venue';
export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('search');

        let filter = {};

        if (query) {
            filter = {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { city: { $regex: query, $options: 'i' } }
                ]
            };
        }
        const venues = await Venue.find(filter)
            .sort({ name: 1 })
            .limit(10);

        return NextResponse.json({ success: true, data: venues }, { status: 200 });

    } catch (error) {
        console.error('Venue Fetch Error:', error);
        return NextResponse.json({ message: 'Failed to fetch venues' }, { status: 500 });
    }
}
export async function POST(req) {
    try {
        await dbConnect();

        const body = await req.json();
        if (!body.name || !body.city || !body.address) {
            return NextResponse.json(
                { message: 'Missing required fields (Name, City, Address)' },
                { status: 400 }
            );
        }
        const existingVenue = await Venue.findOne({
            name: body.name,
            city: body.city
        });

        if (existingVenue) {
            return NextResponse.json(
                { message: 'A venue with this name already exists in this city.' },
                { status: 409 }
            );
        }

        const newVenue = await Venue.create(body);

        return NextResponse.json({ success: true, data: newVenue }, { status: 201 });

    } catch (error) {
        console.error('Venue Creation Error:', error);
        if (error.code === 11000) {
            return NextResponse.json({ message: 'Venue name must be unique' }, { status: 409 });
        }
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}   