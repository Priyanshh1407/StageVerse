import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Venue from "@/models/Venue";
import Task from "@/models/Task";
import Patch from "@/models/Patch";
import FixtureProfile from "@/models/FixtureProfile";

// Helper to get user ID if logged in, else mock
async function getUserId() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token");
        if (token) {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            const { payload } = await jwtVerify(token.value, secret);
            return payload.userId;
        }
    } catch (e) {
        console.warn("No valid token found for seeding, using generic ID");
    }
    // Return a dummy object ID if no user found (so seed works for testing)
    // In real app, you'd fail. 
    return "65f2d656093510061904a08f";
}

export async function GET() {
    try {
        await dbConnect();
        const userId = await getUserId();
        console.log("Seeding for User:", userId);

        // 1. Create Venues
        const venuesData = [
            { name: "SoFi Stadium", city: "Los Angeles", address: "1001 Stadium Dr", capacity: 70000, type: "Stadium" },
            { name: "The O2 Arena", city: "London", address: "Peninsula Square", capacity: 20000, type: "Arena" },
            { name: "Madison Square Garden", city: "New York", address: "4 Penn Plaza", capacity: 19500, type: "Arena" }
        ];

        const venues = [];
        for (const v of venuesData) {
            let venue = await Venue.findOne({ name: v.name });
            if (!venue) venue = await Venue.create(v);
            venues.push(venue);
        }

        // 2. Create Events
        const eventsData = [
            {
                eventId: 206,
                title: "The Eras Tour",
                artist: "Taylor Swift",
                genre: "Pop",
                date: new Date(Date.now() + 86400000 * 30),
                time: "19:00",
                venue: venues[0]._id,
                price: 450,
                organizerId: userId,
                city: "Los Angeles",
                description: "The history-making tour."
            },
            {
                eventId: 207,
                title: "Guts World Tour",
                artist: "Olivia Rodrigo",
                genre: "Pop Rock",
                date: new Date(Date.now() + 86400000 * 60),
                time: "20:00",
                venue: venues[1]._id,
                price: 120,
                organizerId: userId,
                city: "London",
                description: "Live in London."
            },
            {
                eventId: 13, // The one referenced in Logistics ID
                title: "After Hours Til Dawn",
                artist: "The Weeknd",
                genre: "R&B",
                date: new Date(Date.now() + 86400000 * 10),
                time: "18:30",
                venue: venues[1]._id,
                price: 180,
                organizerId: userId,
                city: "London",
                description: "Global stadium tour."
            }
        ];

        const createdEvents = [];
        for (const e of eventsData) {
            // Check by unique eventId to prevent Duplicate Key Error
            let event = await Event.findOne({ eventId: e.eventId });

            if (!event) {
                event = await Event.create(e);
            } else {
                console.log(`Event ${e.eventId} already exists.`);
            }
            createdEvents.push(event);
        }

        // 3. Create Tasks (Logistics)
        const tasksFn = (evtId) => [
            { eventId: evtId, title: 'Finalize Stage Plot', columnId: 'preprod', status: 'pending', priority: 'High', dueDate: 'Tomorrow', tag: 'Admin', tagColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
            { eventId: evtId, title: 'Load In Audio', columnId: 'loadin', status: 'pending', priority: 'High', urgent: true, tag: 'Audio', tagColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
            { eventId: evtId, title: 'Patch Fixtures', columnId: 'show', status: 'pending', priority: 'Medium', tag: 'Lighting', tagColor: 'bg-green-500/10 text-green-400 border border-green-500/20' },
        ];

        for (const evt of createdEvents) {
            // Check if tasks exist
            const count = await Task.countDocuments({ eventId: evt._id });
            if (count === 0) {
                await Task.insertMany(tasksFn(evt._id));
            }
        }

        // 4. Create Patches (Patch Studio)
        const patchData = {
            eventId: createdEvents[2]._id, // Weeknd
            showName: "After Hours Patch v1",
            version: "1.0",
            fixtures: [
                { fixtureId: 101, profile: "Martin MAC Aura XB", universe: 1, address: 1, channels: 25, mode: "Standard", status: "ok" },
                { fixtureId: 102, profile: "Martin MAC Aura XB", universe: 1, address: 26, channels: 25, mode: "Standard", status: "ok" },
                { fixtureId: 201, profile: "Robe MegaPointe", universe: 2, address: 1, channels: 42, mode: "Ext", status: "ok" }
            ]
        };

        // Upsert Patch
        await Patch.findOneAndUpdate({ eventId: patchData.eventId }, patchData, { upsert: true });

        // 5. Create Fixture Profiles (Library)
        const profiles = [
            { manufacturer: "Clay Paky", model: "Sharpy", type: "Moving Head", modes: [{ name: "Standard (16ch)", channels: 16 }] },
            { manufacturer: "Martin", model: "MAC Aura XB", type: "Moving Head", modes: [{ name: "Standard (25ch)", channels: 25 }] },
            { manufacturer: "Robe", model: "MegaPointe", type: "Moving Head", modes: [{ name: "Mode 1 (39ch)", channels: 39 }, { name: "Mode 2 (22ch)", channels: 22 }] },
            { manufacturer: "GLP", model: "JDC1", type: "Strobe", modes: [{ name: "Mode 3 (68ch)", channels: 68 }] },
            { manufacturer: "Generic", model: "Dimmer", type: "Dimmer", modes: [{ name: "Standard (1ch)", channels: 1 }] }
        ];

        for (const p of profiles) {
            const exists = await FixtureProfile.findOne({ manufacturer: p.manufacturer, model: p.model });
            if (!exists) {
                await FixtureProfile.create(p);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${createdEvents.length} events, tasks, patches, and ${profiles.length} fixture profiles for user ${userId}`
        });

    } catch (error) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
