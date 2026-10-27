import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue'; // Import Venue to ensure schema is registered

export async function GET(req) {
  try {
    await dbConnect();
    const newEvents = await Event.find({ status: 'Published' })
      .sort({ createdAt: -1 }) // Newest first
      .limit(5)
      .populate('venue', 'name') // <--- FIX: Get the venue name, not just ID
      .select('title artist venue image createdAt');
    const colors = ['bg-purple-600', 'bg-blue-500', 'bg-pink-600', 'bg-orange-500', 'bg-indigo-600'];
    const releases = newEvents.map((event, index) => ({
      id: event._id,
      artist: event.artist,
      title: `${event.title} @ ${event.venue?.name || 'TBA'}`, 
      type: "JUST ANNOUNCED", 
      color: colors[index % colors.length], 
      image: event.image
    }));

    return NextResponse.json({ success: true, data: releases });

  } catch (error) {
    return apiError(error, '/api/discover/release');
  }
}