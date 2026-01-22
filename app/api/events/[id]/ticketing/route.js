import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Order from '@/models/Order'; // Keep this if you use it, or remove if unused
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
async function checkAuth(req, idParam) {
    const token = req.cookies.get('token')?.value;
    if (!token) throw new Error('Unauthorized');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    let event;
    if (mongoose.isValidObjectId(idParam)) {
        event = await Event.findById(idParam);
    }
    if (!event) {
        event = await Event.findOne({ eventId: idParam });
    }
    if (!event) throw new Error('Event not found');
    if (event.organizerId.toString() !== payload.userId) {
        throw new Error('Forbidden');
    }

    return event;
}
export async function GET(req, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const event = await checkAuth(req, id);
        const eventObj = event.toObject();
        const discountsData = eventObj.discount || eventObj.discounts || [];
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
export async function POST(req, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const event = await checkAuth(req, id);
        const { type, action, data } = await req.json();

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
                    if (data.name !== undefined) t.name = data.name;
                    if (data.price !== undefined) t.price = Number(data.price);
                    if (data.capacity !== undefined) t.capacity = Number(data.capacity);
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
        else if (type === 'discount') {
            if (!event.discounts) event.discounts = [];

            const mapTypeToSchema = (t) => {
                if (!t) return 'Percentage';
                const lower = t.toLowerCase();
                if (lower === 'fixed') return 'Fixed Amount';
                return 'Percentage';
            };

            if (action === 'create') {
                event.discounts.push({
                    code: data.code.toUpperCase(),
                    type: mapTypeToSchema(data.type),
                    value: Number(data.value)
                });
            }
            else if (action === 'update') {
                const d = event.discounts.id(data._id);
                if (d) {
                    if (data.code !== undefined) d.code = data.code.toUpperCase();
                    if (data.type !== undefined) d.type = mapTypeToSchema(data.type);
                    if (data.value !== undefined) d.value = Number(data.value);
                }
            }
            else if (action === 'delete') {
                event.discounts.pull({ _id: data._id });
            }
        }

        await event.save();
        return NextResponse.json({ success: true, message: 'Updated successfully' });

    } catch (error) {
        console.error("POST Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}