import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { parseBody, eventCreateSchema } from '@/lib/schemas';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue'; // Registry
import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';
import { nextEventId } from '@/lib/counters';
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // 'organizer' or null
    if (mode === 'organizer') {
      const user = await verifyAuth(req);

      const events = await Event.find({ organizerId: user.userId })
        .populate('venue')
        .sort({ createdAt: -1 });

      return NextResponse.json({ success: true, data: events });
    }
    const events = await Event.find({
      status: { $in: ['Published', 'Scheduled', 'Live'] }
    })
      .select('eventId title artist date time city venue images genre vibe status ticketTiers featured') // Optimize
      .populate('venue', 'name city')
      .sort({ date: 1 });

    return NextResponse.json({ success: true, events });

  } catch (error) {
    return apiError(error, '/api/events');
  }
}
export async function POST(req) {
  try {
    await dbConnect();
    const user = await verifyAuth(req);
    requireRole(user, 'organizer');

    // The schema whitelists client fields, so server-owned ones (organizerId, eventId, sold...) can't be set
    const fields = parseBody(eventCreateSchema, await req.json());
    const eventId = await nextEventId();

    const newEvent = new Event({
      ...fields,
      eventId,
      organizerId: user.userId,
    });

    const savedEvent = await newEvent.save();

    return NextResponse.json({ success: true, data: savedEvent });

  } catch (error) {
    return apiError(error, '/api/events');
  }
}
