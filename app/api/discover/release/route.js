import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue'; // Import Venue to ensure schema is registered

export async function GET(req) {
  try {
    await dbConnect();

    // 1. Fetch with Population
    const newEvents = await Event.find({ status: 'Published' })
      .sort({ createdAt: -1 }) // Newest first
      .limit(5)
      .populate('venue', 'name') // <--- FIX: Get the venue name, not just ID
      .select('title artist venue image createdAt');

    // 2. Define a color palette for variety
    const colors = ['bg-purple-600', 'bg-blue-500', 'bg-pink-600', 'bg-orange-500', 'bg-indigo-600'];

    // 3. Transform
    const releases = newEvents.map((event, index) => ({
      id: event._id,
      artist: event.artist,
      // FIX: Access .name safely
      title: `${event.title} @ ${event.venue?.name || 'TBA'}`, 
      type: "JUST ANNOUNCED", 
      // BONUS: Cycle through colors instead of all being purple
      color: colors[index % colors.length], 
      image: event.image
    }));

    return NextResponse.json({ success: true, data: releases });

  } catch (error) {
    console.error("New Releases Error:", error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}