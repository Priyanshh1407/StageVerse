import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { parseBody, venueCreateSchema } from '@/lib/schemas';
import { containsRegex } from '@/lib/escapeRegex';
import dbConnect from '@/lib/db';
import Venue from '@/models/Venue';
import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';
export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('search');

        let filter = {};

        if (query) {
            filter = {
                $or: [
                    { name: containsRegex(query) },
                    { city: containsRegex(query) }
                ]
            };
        }
        const venues = await Venue.find(filter)
            .sort({ name: 1 })
            .limit(10);

        return NextResponse.json({ success: true, data: venues }, { status: 200 });

    } catch (error) {
        return apiError(error, '/api/venues');
    }
}
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        requireRole(user, 'organizer', 'production');

        const body = parseBody(venueCreateSchema, await req.json());
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
        if (error.code === 11000) {
            return NextResponse.json({ message: 'Venue name must be unique' }, { status: 409 });
        }
        return apiError(error, '/api/venues');
    }
}   