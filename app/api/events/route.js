import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue'; // Registry
import { verifyAuth } from '@/lib/auth';
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // 'organizer' or null
    if (mode === 'organizer') {
      const user = await verifyAuth(req);
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    console.error('Failed to fetch events', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
export async function POST(req) {
  try {
    await dbConnect();
    const user = await verifyAuth(req);
    if (!user || user.role !== 'organizer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log("CREATE EVENT BODY:", body); // DEBUG LOG
    console.log("ARTIST ID LINK:", body.artistId); // DEBUG LOG
    const count = await Event.countDocuments();
    const eventId = 1000 + count + 1;

    const newEvent = new Event({
      ...body,
      eventId,
      organizerId: user.userId,
    });

    const savedEvent = await newEvent.save();
    console.log("SAVED EVENT:", savedEvent); // DEBUG LOG to confirm artistId is saved

    return NextResponse.json({ success: true, data: savedEvent });

  } catch (error) {
    console.error("Create Event Error:", error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
