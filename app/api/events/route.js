import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import Counter from '@/models/Counter';
import { jwtVerify } from 'jose';

// ==========================================
// 1. GET: HANDLES BOTH PUBLIC & ORGANIZER FETCH
// ==========================================
export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // Check if asking for 'organizer' data

    // ---------------------------------------------------------
    // SCENARIO A: ORGANIZER DASHBOARD (?mode=organizer)
    // ---------------------------------------------------------
    if (mode === 'organizer') {
      
      // 1. Verify User is Logged In
      const token = req.cookies.get('token')?.value;
      if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      // 2. Fetch Events for THIS User only
      const myEvents = await Event.find({ organizerId: payload.userId })
        .sort({ createdAt: -1 }) // Newest first
        .populate('venue');      // Get venue details like Name

      return NextResponse.json({ success: true, data: myEvents });
    }

    // ---------------------------------------------------------
    // SCENARIO B: PUBLIC SEARCH (Default)
    // ---------------------------------------------------------
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    
    let query = {};

    // 1. Text Search (Title or Artist)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } }
      ];
    }

    // 2. City Filter
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    // 3. Status Check (Public only sees Live/Scheduled events)
    // We assume if no status is requested, we show valid public events
    query.status = { $in: ['Scheduled', 'Live', 'Published'] };

    const publicEvents = await Event.find(query)
      .sort({ date: 1 }) // Closest date first
      .populate('venue', 'name city image');

    return NextResponse.json({ success: true, count: publicEvents.length, data: publicEvents });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}

// ==========================================
// 2. POST: CREATE NEW EVENT
// ==========================================
export async function POST(req) {
  try {
    await dbConnect();

    // 1. Auth Check
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // 2. Parse Body
    const body = await req.json();

    // 3. Counter Logic (Get next Short ID)
    const counter = await Counter.findOneAndUpdate(
      { id: 'eventId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    if (!counter) throw new Error("Counter failed to generate ID");

    // 4. Create Event
    const newEvent = await Event.create({
      ...body,
      eventId: counter.seq, // e.g., 1001
      organizerId: payload.userId,
    });

    return NextResponse.json({ success: true, data: newEvent }, { status: 201 });

  } catch (error) {
    console.error('Create Error:', error);
    return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
  }
}