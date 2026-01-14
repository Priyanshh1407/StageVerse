import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import Ticket from '@/models/Ticket';
import Memory from '@/models/Memory';
import bcrypt from 'bcryptjs';

export async function GET(req) {
  try {
    await dbConnect();

    // --- 1. CLEANUP ---
    await Ticket.deleteMany({});
    await Event.deleteMany({});
    await User.deleteMany({});
    await Memory.deleteMany({});
    
    try { await Venue.deleteMany({}); } catch (e) { console.log("Venue cleanup skipped"); }

    console.log("🧹 Database Cleared");

    // --- 2. CREATE VENUES ---
    const venuesData = [
      { name: "Mahalaxmi Race Course", address: "Dr E Moses Marg", city: "Mumbai", capacity: 35000, image: "https://images.unsplash.com/photo-1546707012-c46675f12716?q=80&w=1000" },
      { name: "Jio World Garden", address: "BKC", city: "Mumbai", capacity: 15000, image: "https://images.unsplash.com/photo-1560439514-4e96450cd992?q=80&w=1000" },
      { name: "Jawaharlal Nehru Stadium", address: "Pragati Vihar", city: "New Delhi", capacity: 60000, image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000" },
      { name: "DY Patil Stadium", address: "Nerul", city: "Navi Mumbai", capacity: 55000, image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=1000" },
      { name: "Wembley Stadium", address: "London HA9 0WS", city: "London", capacity: 90000, image: "https://images.unsplash.com/photo-1524368535928-5b5b1c0b3b4f?q=80&w=1000" },
      { name: "SoFi Stadium", address: "Inglewood", city: "Los Angeles", capacity: 70000, image: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=1000" },
      { name: "National Stadium", address: "1 Stadium Dr", city: "Singapore", capacity: 55000, image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000" }
    ];

    const venues = [];
    for (const vData of venuesData) {
      const venue = await Venue.findOneAndUpdate({ name: vData.name }, vData, { upsert: true, new: true });
      venues.push(venue);
    }
    const getVenue = (name) => venues.find(v => v.name === name)?._id;

    // --- 3. CREATE USERS ---
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const usersData = [
      { name: "StageVerse Fan", email: "fan@test.com", password: hashedPassword, role: "fan", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200" },
      { name: "Rohan Das", email: "rohan@test.com", password: hashedPassword, role: "fan", image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200" },
      { name: "Ananya Gupta", email: "ananya@test.com", password: hashedPassword, role: "fan", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200" },
      { name: "Vikram Singh", email: "vikram@test.com", password: hashedPassword, role: "fan", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200" },
      { name: "Global Events Ltd", email: "org@test.com", password: hashedPassword, role: "organizer", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200" }
    ];

    const users = await User.insertMany(usersData);
    const mainUser = users[0];
    const rohan = users[1];
    const ananya = users[2];
    const vikram = users[3];
    const organizer = users[4];

    // --- 4. CREATE EVENTS ---
    const today = new Date(); 
    const getDate = (days) => {
      const d = new Date();
      d.setDate(today.getDate() + days);
      return d;
    };

    let eventsData = [
      {
        title: "Mathematics Tour",
        artist: "Ed Sheeran",
        date: getDate(-200), 
        venue: getVenue("Mahalaxmi Race Course"),
        city: "Mumbai",
        price: 8500,
        genre: "Pop",
        tags: ["Acoustic", "Pop", "Global Star"],
        description: "Ed Sheeran returns to India.",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1000",
        status: "Live"
      },
      {
        title: "Lollapalooza India 2025",
        artist: "Green Day, Shawn Mendes",
        date: getDate(-150), 
        venue: getVenue("Mahalaxmi Race Course"),
        city: "Mumbai",
        price: 12000,
        genre: "Festival",
        tags: ["Festival", "Rock", "Pop"],
        description: "The multi-genre music festival.",
        image: "https://images.unsplash.com/photo-1459749411177-3c0714b62437?q=80&w=1000",
        status: "Live"
      },
      {
        title: "One India Tour",
        artist: "Arijit Singh",
        date: getDate(-90),
        venue: getVenue("Jawaharlal Nehru Stadium"),
        city: "New Delhi",
        price: 5000,
        genre: "Bollywood",
        tags: ["Soulful", "Bollywood", "Romantic"],
        description: "India's most loved voice live.",
        image: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000",
        status: "Live"
      },
      {
        title: "Music of the Spheres",
        artist: "Coldplay",
        date: getDate(10), 
        venue: getVenue("DY Patil Stadium"),
        city: "Navi Mumbai",
        price: 6500,
        genre: "Pop Rock",
        tags: ["Stadium", "Rock", "Experience"],
        description: "Coldplay returns to India.",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000",
        status: "Published"
      },
      {
        title: "Dil-Luminati Tour",
        artist: "Diljit Dosanjh",
        date: getDate(5), 
        venue: getVenue("Jawaharlal Nehru Stadium"),
        city: "New Delhi",
        price: 4500,
        genre: "Punjabi",
        tags: ["Bhangra", "Pop", "High Energy"],
        description: "The G.O.A.T brings his massive tour.",
        image: "https://images.unsplash.com/photo-1549495568-75507116527b?q=80&w=1000",
        status: "Published"
      },
      {
        title: "Sunburn Arena",
        artist: "Martin Garrix",
        date: getDate(2),
        venue: getVenue("Jio World Garden"),
        city: "Mumbai",
        price: 3000,
        genre: "EDM",
        tags: ["DJ", "Rave", "Party"],
        description: "World #1 DJ brings the energy.",
        image: "https://images.unsplash.com/photo-1574155376612-c84efdd3a64f?q=80&w=1000",
        status: "Published"
      },
      {
        title: "Zomaland 2026",
        artist: "Ritviz, Divine",
        date: getDate(25), 
        venue: getVenue("Jio World Garden"),
        city: "Mumbai",
        price: 1999,
        genre: "Festival",
        tags: ["Food", "Indie", "Rap"],
        description: "Food meet Music carnival.",
        image: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=1000",
        status: "Published"
      },
      {
        title: "The Eras Tour",
        artist: "Taylor Swift",
        date: getDate(40),
        venue: getVenue("Wembley Stadium"),
        city: "London",
        price: 15000, 
        genre: "Pop",
        tags: ["Global", "Pop", "Spectacle"],
        description: "The biggest tour in history.",
        image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1000",
        status: "Published"
      },
      {
        title: "After Hours Til Dawn",
        artist: "The Weeknd",
        date: getDate(12),
        venue: getVenue("SoFi Stadium"),
        city: "Los Angeles",
        price: 12000,
        genre: "R&B",
        tags: ["Cinematic", "R&B", "Dark"],
        description: "Abel brings his cinematic universe.",
        image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000",
        status: "Published"
      },
      {
        title: "Radical Optimism Tour",
        artist: "Dua Lipa",
        date: getDate(20),
        venue: getVenue("National Stadium"),
        city: "Singapore",
        price: 9000,
        genre: "Pop",
        tags: ["Dance", "Pop", "Disco"],
        description: "Dua Lipa brings the disco fever.",
        image: "https://images.unsplash.com/photo-1459749411177-3c0714b62437?q=80&w=1000",
        status: "Published"
      }
    ];

    // --- FIX: Add eventId, organizerId, and time ---
    eventsData = eventsData.map((e, i) => ({
        ...e,
        organizerId: organizer._id,
        time: "19:00",
        eventId: i+1 // Unique Event ID generation
    }));

    const events = await Event.insertMany(eventsData);
    console.log("🎵 Events Created");

    // --- 5. SOCIAL & TICKETS ---
    mainUser.following = [rohan._id, ananya._id, vikram._id];
    await mainUser.save();

    const ticketsData = [
      { userId: rohan._id, eventId: events.find(e => e.artist === "Coldplay")?._id, price: 6500, status: "Confirmed", qrCode: "TIX-001" },
      { userId: ananya._id, eventId: events.find(e => e.artist === "Coldplay")?._id, price: 6500, status: "Confirmed", qrCode: "TIX-002" },
      { userId: vikram._id, eventId: events.find(e => e.artist === "Diljit Dosanjh")?._id, price: 4500, status: "Confirmed", qrCode: "TIX-003" },
      { userId: mainUser._id, eventId: events.find(e => e.artist === "Ed Sheeran")?._id, price: 8500, status: "Confirmed", qrCode: "TIX-PAST-01", createdAt: getDate(-200) },
      { userId: ananya._id, eventId: events.find(e => e.artist === "Taylor Swift")?._id, price: 15000, status: "Confirmed", qrCode: "TIX-004" }
    ].filter(t => t.eventId);

    await Ticket.insertMany(ticketsData);
    console.log("🎟️ Tickets Issued");

    // --- 6. MEMORIES ---
    // --- 6. MEMORIES (Expanded) ---
    // We find specific events to attach memories to
    const edSheeran = events.find(e => e.artist === "Ed Sheeran");
    const lolla = events.find(e => e.artist.includes("Green Day"));
    const arijit = events.find(e => e.artist === "Arijit Singh");

    const memoriesData = [];

    if (edSheeran) {
      memoriesData.push(
        {
          userId: mainUser._id,
          type: "photo",
          title: "Ed Sheeran Mumbai!",
          image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800",
          date: getDate(-200),
          location: "Mahalaxmi Race Course",
          artist: "Ed Sheeran",
          venue: "Mahalaxmi Race Course"
        },
        {
          userId: mainUser._id,
          type: "video",
          title: "Shape of You - Live 🎸",
          // Using a Pexels video link that works
          videoSrc: "https://videos.pexels.com/video-files/2022395/2022395-hd_1920_1080_30fps.mp4",
          image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800", // Thumbnail
          date: getDate(-200),
          duration: "3:45",
          location: "Mumbai",
          artist: "Ed Sheeran"
        }
      );
    }

    if (lolla) {
      memoriesData.push(
        {
          userId: mainUser._id,
          type: "photo",
          title: "Lolla Squad 🤘",
          image: "https://images.unsplash.com/photo-1524368535928-5b5b1c0b3b4f?q=80&w=800",
          date: getDate(-150),
          location: "Mumbai",
          artist: "Green Day",
          venue: "Mahalaxmi Race Course"
        },
        {
          userId: mainUser._id,
          type: "video",
          title: "Green Day Finale",
          videoSrc: "https://videos.pexels.com/video-files/4763826/4763826-uhd_2560_1440_24fps.mp4",
          image: "https://images.unsplash.com/photo-1459749411177-3c0714b62437?q=80&w=800",
          date: getDate(-150),
          duration: "0:45",
          location: "Mumbai",
          artist: "Green Day"
        }
      );
    }

    if (arijit) {
      memoriesData.push({
        userId: mainUser._id,
        type: "photo",
        title: "Arijit Magical Night ✨",
        image: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800",
        date: getDate(-90),
        location: "New Delhi",
        artist: "Arijit Singh",
        venue: "Jawaharlal Nehru Stadium"
      });
    }

    if (memoriesData.length > 0) {
      await Memory.insertMany(memoriesData);
    }
    console.log(`📸 ${memoriesData.length} Memories Saved`);

    return NextResponse.json({ 
      success: true, 
      message: "Database Seeded! 🚀",
      credentials: { email: "fan@test.com", password: "password123" }
    });

  } catch (error) {
    console.error("Seed Error:", error);
    return NextResponse.json({ message: "Seed Failed", error: error.message }, { status: 500 });
  }
}