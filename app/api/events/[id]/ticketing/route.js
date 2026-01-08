import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Order from '@/models/Order'; // Keep this if you use it, or remove if unused
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';

// --- 1. SMART AUTH CHECK ---
async function checkAuth(req, idParam) {
    const token = req.cookies.get('token')?.value;
    if (!token) throw new Error('Unauthorized');

    // Verify JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    let event;

    // A: Check if the ID provided is a standard Mongo ObjectId (the long string)
    if (mongoose.isValidObjectId(idParam)) {
        event = await Event.findById(idParam);
    }

    // B: If it wasn't found (or isn't a valid ObjectId), try finding by your custom 'eventId'
    if (!event) {
        // We treat idParam as the 'eventId' (e.g., 9)
        event = await Event.findOne({ eventId: idParam });
    }

    // C: Final Check
    if (!event) throw new Error('Event not found');

    // D: Ownership Check
    if (event.organizerId.toString() !== payload.userId) {
        throw new Error('Forbidden');
    }

    return event;
}

// --- 2. GET: Fetch Dashboard Data ---
export async function GET(req, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const event = await checkAuth(req, id);

        // Convert to plain object to ensure we can read fields even if Schema is strict
        const eventObj = event.toObject();

        // ⚡ FIX: Check both 'discount' (singular DB) and 'discounts' (plural DB)
        // This ensures data loads regardless of how it was saved
        const discountsData = eventObj.discount || eventObj.discounts || [];

        // Calculate Stats
        let totalRevenue = 0;
        let totalSold = 0;
        let totalInventory = 0;

        const processedTiers = (eventObj.ticketTiers || []).map(tier => {
            const revenue = (tier.price || 0) * (tier.sold || 0);
            totalRevenue += revenue;
            totalSold += (tier.sold || 0);
            totalInventory += (tier.capacity || 0) - (tier.sold || 0);

            return {
                ...tier,
                revenue,
                status: (tier.sold >= tier.capacity) ? 'Sold Out' : tier.status
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                eventTitle: eventObj.title,
                tiers: processedTiers,

                // ⭐ THIS LINE MAKES THEM VISIBLE
                // We send the data as 'discounts' (plural) so the frontend can read it
                discounts: discountsData,

                orders: [],
                stats: {
                    revenue: totalRevenue,
                    sold: totalSold,
                    inventory: totalInventory
                }
            }
        });

    } catch (error) {
        console.error("GET Error:", error);
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}

// --- 3. POST: Create/Update Tiers & Discounts ---
export async function POST(req, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        // 1. Auth Check
        const event = await checkAuth(req, id);

        // 2. Parse Data
        const { type, action, data } = await req.json();

        // === 🎫 TICKET TIER LOGIC ===
        if (type === 'tier') {
            if (action === 'create') {
                event.ticketTiers.push({
                    name: data.name,
                    price: Number(data.price),
                    capacity: Number(data.capacity),
                    sold: 0,
                    status: 'Active'
                });
            }
            else if (action === 'update') {
                const t = event.ticketTiers.id(data._id);
                if (t) {
                    // FIX: Only update fields that are actually sent (Partial Update)
                    if (data.name !== undefined) t.name = data.name;
                    if (data.price !== undefined) t.price = Number(data.price);
                    if (data.capacity !== undefined) t.capacity = Number(data.capacity);
                    // Note: We deliberately do not update 'sold' here
                }
            }
            else if (action === 'delete') {
                event.ticketTiers.pull({ _id: data._id });
            }
            else if (action === 'toggle_status') {
                const t = event.ticketTiers.id(data._id);
                if (t) t.status = t.status === 'Active' ? 'Paused' : 'Active';
            }
        }

        // === 🏷️ DISCOUNT LOGIC ===
        else if (type === 'discount') {

            // 1. Initialize singular array 'discount' if missing
            if (!event.discount) event.discount = [];

            // 2. Helper to map Frontend lowercase -> Schema Strict Enum
            const mapTypeToSchema = (t) => {
                if (!t) return 'Percentage';
                const lower = t.toLowerCase();
                if (lower === 'fixed') return 'Fixed Amount';
                return 'Percentage';
            };

            if (action === 'create') {
                event.discount.push({
                    code: data.code.toUpperCase(), // Schema requires uppercase: true
                    type: mapTypeToSchema(data.type), // Maps 'percentage' -> 'Percentage'
                    value: Number(data.value)
                });
            }
            else if (action === 'update') {
                const d = event.discount.id(data._id);
                if (d) {
                    if (data.code !== undefined) d.code = data.code.toUpperCase();
                    if (data.type !== undefined) d.type = mapTypeToSchema(data.type);
                    if (data.value !== undefined) d.value = Number(data.value);
                }
            }
            else if (action === 'delete') {
                event.discount.pull({ _id: data._id });
            }
        }

        await event.save();
        return NextResponse.json({ success: true, message: 'Updated successfully' });

    } catch (error) {
        console.error("POST Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}