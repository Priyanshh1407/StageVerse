import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import Ticket from "@/models/Ticket";
import Event from "@/models/Event";
import Venue from "@/models/Venue";

export async function GET() {
  try {
    await dbConnect();

    // 1. Auth Check
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) return NextResponse.json({ message: "Login first" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token.value, secret);
    const userId = payload.userId;

    // 2. Helper: Find or Create Venue
    const findOrCreateVenue = async (data) => {
      let venue = await Venue.findOne({ name: data.name });
      if (!venue) venue = await Venue.create(data);
      return venue;
    };

    // 3. Create Venues
    const sofi = await findOrCreateVenue({ 
      name: "SoFi Stadium", 
      city: "Los Angeles", 
      address: "1001 Stadium Dr, Inglewood, CA 90301", 
      capacity: 70000,
      type: "Indoor-Outdoor Stadium",
      bagPolicy: "Clear Bags Only"
    });

    const o2 = await findOrCreateVenue({ 
      name: "The O2 Arena", 
      city: "London", 
      address: "Peninsula Square, London SE10 0DX",
      capacity: 20000,
      type: "Indoor Arena"
    });

    const msg = await findOrCreateVenue({ 
      name: "Madison Square Garden", 
      city: "New York", 
      address: "4 Pennsylvania Plaza, New York, NY 10001",
      capacity: 19500 
    });

    // 4. Create Events (IDs starting at 200 to avoid conflicts)
    // We calculate dates relative to NOW to ensure they appear in the correct tabs
    const today = new Date();
    const nextMonth = new Date(today); nextMonth.setMonth(today.getMonth() + 1);
    const twoMonthsOut = new Date(today); twoMonthsOut.setMonth(today.getMonth() + 2);
    const lastYear = new Date(today); lastYear.setFullYear(today.getFullYear() - 1);
    const twoYearsAgo = new Date(today); twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const events = await Event.insertMany([
      // --- UPCOMING ---
      {
        eventId: 206,
        title: "The Eras Tour",
        artist: "Taylor Swift",
        genre: "Pop",
        date: nextMonth, // Upcoming
        time: "19:00",
        venue: sofi._id,
        image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14", // Concert crowd
        price: 450,
        organizerId: userId,
        city: "Los Angeles",
        description: "The history-making tour celebrating every era of her career."
      },
      {
        eventId: 207,
        title: "Guts World Tour",
        artist: "Olivia Rodrigo",
        genre: "Pop Rock",
        date: twoMonthsOut, // Upcoming
        time: "20:00",
        venue: o2._id,
        image: "https://images.unsplash.com/photo-1459749411177-3c0714b62437", // Purple lights
        price: 120,
        organizerId: userId,
        city: "London",
        description: "Spilling her guts live in London."
      },
      
      // --- PAST ---
      {
        eventId: 208,
        title: "Renaissance World Tour",
        artist: "Beyoncé",
        genre: "R&B / House",
        date: lastYear, // Past
        time: "19:30",
        venue: sofi._id,
        image: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9", // Stage lights
        price: 300,
        organizerId: userId,
        city: "Los Angeles",
        description: "The chrome-filled disco party of the century."
      },
      {
        eventId: 209,
        title: "Love On Tour",
        artist: "Harry Styles",
        genre: "Pop",
        date: twoYearsAgo, // Past
        time: "20:00",
        venue: msg._id,
        image: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9", // Colorful lights
        price: 250,
        organizerId: userId,
        city: "New York",
        description: "Harry's house, live at the Garden."
      },
      {
        eventId: 210,
        title: "Chromatica Ball",
        artist: "Lady Gaga",
        genre: "Pop",
        date: new Date("2022-09-10"), // Specific Past Date
        time: "20:30",
        venue: sofi._id,
        image: "https://images.unsplash.com/photo-1516280440614-6697288d5d38", // Dark moody stage
        price: 200,
        organizerId: userId,
        city: "Los Angeles",
        description: "The stadium tour event."
      }
    ]);

    // 5. Create Tickets
    const tickets = events.map((event, index) => {
      // Logic for Seats
      let seat = "Sec 100, Row A, Seat 12";
      let type = "Standard";
      
      if (event.artist === "Taylor Swift") {
        seat = "Floor A, Row 5, Seat 10";
        type = "VIP Package";
      } else if (event.artist === "Olivia Rodrigo") {
        seat = "GA Standing";
        type = "General Admission";
      }

      return {
        userId: userId,
        eventId: event._id,
        status: "Confirmed",
        purchaseDate: new Date(),
        pricePaid: event.price,
        seat: seat,
        // Make QR Code unique
        qrCode: `TICKET-${event.eventId}-${Date.now()}-${index}`
      };
    });

    await Ticket.insertMany(tickets);

    return NextResponse.json({ 
      success: true, 
      message: `Added ${tickets.length} tickets (2 Upcoming, 3 Past) to user ${userId}` 
    });

  } catch (error) {
    console.error("Seeding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}