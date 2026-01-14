import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import Ticket from "@/models/Ticket";
import Event from "@/models/Event"; // Ensure models are registered
import Venue from "@/models/Venue"; // Ensure models are registered

export async function GET() {
  try {
    await dbConnect();

    // 1. Auth Check
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token.value, secret);
    const userId = payload.userId;

    // 2. Fetch Tickets with deep population
    const tickets = await Ticket.find({ userId })
      .populate({
        path: 'eventId',
        select: 'title artist genre date time image description', // Fields from Event
        populate: { 
          path: 'venue',
          model: 'Venue',
          select: 'name city address capacity type bagPolicy image description' // Fields from Venue
        }
      })
      .lean();

    // 3. Process and Split Data
    const now = new Date();
    const upcoming = [];
    const past = [];

    tickets.forEach(t => {
      if (!t.eventId) return; // Skip if event was deleted

      const eventDate = new Date(t.eventId.date);
      
      // Format Data for Frontend
      const formattedTicket = {
        id: t._id.toString(),
        artist: t.eventId.artist,
        tour: t.eventId.title, // Using Event Title as Tour Name
        // Format Date: "NOV 14" or "Oct 22, 2022"
        dateRaw: eventDate, 
        dateDisplay: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
        dateFull: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        day: eventDate.getDate(),
        month: eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        time: t.eventId.time || "TBD",
        venue: t.eventId.venue?.name || "Unknown Venue",
        venueDetails: t.eventId.venue, // Pass full venue object for modal
        seat: t.seat || "GA",
        type: t.seat.toLowerCase().includes('vip') ? "VIP Admission" : "Standard",
        status: t.status,
        bgImage: t.eventId.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745",
        qrCode: t.qrCode || `ID-${t._id.toString().slice(-6).toUpperCase()}`
      };

      if (eventDate >= now) {
        upcoming.push(formattedTicket);
      } else {
        past.push(formattedTicket);
      }
    });

    // 4. Sort Lists
    // Upcoming: Soonest first
    upcoming.sort((a, b) => a.dateRaw - b.dateRaw);
    // Past: Most recent first
    past.sort((a, b) => b.dateRaw - a.dateRaw);

    return NextResponse.json({ 
      success: true, 
      data: { upcoming, past } 
    });

  } catch (error) {
    console.error("Tickets API Error:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}