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

    // 2. Helper: Find or Create Venue (Defined BEFORE use)
    const findOrCreateVenue = async (data) => {
      let venue = await Venue.findOne({ name: data.name });
      if (!venue) venue = await Venue.create(data);
      return venue;
    };

    // 3. Create Common Test Event (ID: 999) - Accessible by ALL
    // Create Venue for Test
    const demoVenue = await findOrCreateVenue({
      name: "StageVerse Virtual Arena",
      city: "Metaverse",
      address: "123 Digital Blvd",
      capacity: 100000,
      type: "Virtual Stage"
    });

    // Create Test Event
    const testEventData = {
      eventId: 999, // Unique ID for the Demo
      title: "StageVerse Experience (Official Demo)",
      artist: "The Developers",
      genre: "Tech House",
      date: new Date(), // TODAY
      time: "20:00",
      venue: demoVenue._id,
      image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14",
      price: 0,
      organizerId: userId, // Assigned to whoever runs the seed
      city: "Virtual Stage",
      description: "The official demo event for testing StageVerse real-time features."
    };

    // Check if exists
    let testEvent = await Event.findOne({ title: testEventData.title });
    if (!testEvent) {
      testEvent = await Event.create(testEventData);
    }

    // Create Songs
    const Song = require("@/models/Song").default;
    const Setlist = require("@/models/Setlist").default;

    // Helper: Random Duration
    const getRandomDuration = () => {
      const minSec = 150; // 2:30
      const maxSec = 285; // 4:45
      const totalSec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
      const m = Math.floor(totalSec / 60);
      const s = (totalSec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    const songs = await Song.insertMany([
      { title: "Hello World", artist: "The Developers", bpm: 128, key: "Am", duration: getRandomDuration(), color: "#00d4ff", artistId: userId },
      { title: "Runtime Error", artist: "The Developers", bpm: 140, key: "F#", duration: getRandomDuration(), color: "#e74c3c", artistId: userId },
      { title: "Git Push Force", artist: "The Developers", bpm: 110, key: "Em", duration: getRandomDuration(), color: "#2ecc71", artistId: userId },
      { title: "Infinite Loop", artist: "The Developers", bpm: 130, key: "C", duration: getRandomDuration(), color: "#9b59b6", artistId: userId },
      { title: "Null Pointer", artist: "The Developers", bpm: 95, key: "Dm", duration: getRandomDuration(), color: "#f1c40f", artistId: userId }
    ]);

    // Create Setlist
    // Clear old versions to prevent schema conflicts because we changed duplications/structure
    await Setlist.deleteMany({ eventId: testEvent._id });

    await Setlist.create({
      eventId: testEvent._id,
      artistId: userId,
      items: songs.map(s => ({
        songId: s._id,
        title: s.title,
        duration: s.duration, // Copy duration
        bpm: s.bpm.toString(),
        key: s.key,
        status: 'pending'
      })),
      status: 'pending', // Enum is pending/live/completed, not draft
      logs: [] // Initialize logs
    });

    // 4. Create Venues
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

    // 5. Create Events (IDs starting at 200 to avoid conflicts)
    // We calculate dates relative to NOW to ensure they appear in the correct tabs
    const today = new Date();
    const nextMonth = new Date(today); nextMonth.setMonth(today.getMonth() + 1);
    const twoMonthsOut = new Date(today); twoMonthsOut.setMonth(today.getMonth() + 2);
    const lastYear = new Date(today); lastYear.setFullYear(today.getFullYear() - 1);
    const twoYearsAgo = new Date(today); twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const eventDataList = [
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
    ];

    const events = [];
    for (const data of eventDataList) {
      let event = await Event.findOne({ eventId: data.eventId });
      if (!event) {
        event = await Event.create(data);
      }
      events.push(event);
    }

    // 6. Create Tickets
    // 6. Create Tickets
    // Include the Common Test Event (testEvent) + the generated list
    const allEventsForTickets = [testEvent, ...events];

    const tickets = allEventsForTickets.map((event, index) => {
      // Logic for Seats
      let seat = "Sec 100, Row A, Seat 12";
      let type = "Standard";

      if (event.artist === "Taylor Swift") {
        seat = "Floor A, Row 5, Seat 10";
        type = "VIP Package";
      } else if (event.artist === "Olivia Rodrigo") {
        seat = "GA Standing";
        type = "General Admission";
      } else if (event.eventId === 999) {
        seat = "Virtual VIP";
        type = "All Access";
      }

      return {
        userId: userId,
        eventId: event._id,
        status: "Confirmed",
        purchaseDate: new Date(),
        pricePaid: event.price,
        seat: seat,
        // Make QR Code unique
        qrCode: `TICKET-${event.eventId || 999}-${Date.now()}-${index}`
      };
    });

    await Ticket.insertMany(tickets);

    return NextResponse.json({
      success: true,
      message: `Added demo event & ${tickets.length} tickets to user ${userId}`
    });

  } catch (error) {
    console.error("Seeding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}