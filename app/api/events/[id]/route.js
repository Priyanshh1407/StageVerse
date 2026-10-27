import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { parseBody, eventUpdateSchema } from '@/lib/schemas';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import mongoose from 'mongoose';
import { verifyAuth } from '@/lib/auth';
const getQuery = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  } else if (!isNaN(id)) {
    return { eventId: parseInt(id) };
  }
  return null;
};
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const query = getQuery(id);
    if (!query) return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });

    const event = await Event.findOne(query).populate('venue');
    if (!event) return NextResponse.json({ message: 'Event not found' }, { status: 404 });

    const similarEventsRaw = await Event.find({
      genre: event.genre,
      _id: { $ne: event._id },
      status: { $in: ['Live', 'Scheduled', 'Selling Fast'] }
    })
      .sort({ date: 1 })
      .limit(4)
      .populate('venue')
      .select('title date city venue images ticketTiers genre');

    const similarEvents = similarEventsRaw.map(sim => {
      const minPrice = sim.ticketTiers?.length > 0
        ? Math.min(...sim.ticketTiers.map(t => t.price))
        : 0;

      return {
        id: sim._id,
        name: sim.title,
        date: new Date(sim.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        city: sim.city,
        venue: sim.venue?.name || 'TBA',
        price: minPrice,
        genre: sim.genre,
        image: sim.images?.hero || "https://images.unsplash.com/photo-1459749411177-2a2965bda36c?q=80&w=500&auto=format&fit=crop"
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...event.toObject(),
        similarEvents
      }
    }, { status: 200 });
  } catch (error) {
    return apiError(error, '/api/events/[id]');
  }
}
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const payload = await verifyAuth(req);

    const { id } = await params;
    // Ownership, identifiers and ticket inventory can't be changed through this endpoint
    const fields = parseBody(eventUpdateSchema, await req.json());

    const query = getQuery(id);
    if (!query) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    const event = await Event.findOne(query);
    if (!event) return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    if (event.organizerId.toString() !== payload.userId) {
      return NextResponse.json({ message: 'Forbidden: Not your event' }, { status: 403 });
    }

    const updatedEvent = await Event.findOneAndUpdate(
      query,
      fields,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) return NextResponse.json({ message: 'Event not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updatedEvent }, { status: 200 });
  } catch (error) {
    return apiError(error, '/api/events/[id]');
  }
}
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const payload = await verifyAuth(req);

    const { id } = await params;

    const query = getQuery(id);
    if (!query) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    const event = await Event.findOne(query);
    if (!event) return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    if (event.organizerId.toString() !== payload.userId) {
      return NextResponse.json({ message: 'Forbidden: Not your event' }, { status: 403 });
    }

    const deletedEvent = await Event.findOneAndDelete(query);

    if (!deletedEvent) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' }, { status: 200 });
  } catch (error) {
    return apiError(error, '/api/events/[id]');
  }
}