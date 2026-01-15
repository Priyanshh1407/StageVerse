import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';

export async function GET() {
  try {
    await dbConnect();
    const events = await Event.find({}).select('eventId title name location');
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Failed to fetch events', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}