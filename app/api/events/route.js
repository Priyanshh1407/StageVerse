import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue'; // Registry
import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';
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
      .select('eventId title artist date time city venue images genre vibe status ticketTiers') // Optimize
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

    const body = await req.json();
    const count = await Event.countDocuments();
    const eventId = 1000 + count + 1;

    // Server-owned fields can't be set by the client (mass assignment)
    const { _id, eventId: _ignoredId, organizerId, assignedTo, productionStatus, createdAt, updatedAt, ...fields } = body;
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
