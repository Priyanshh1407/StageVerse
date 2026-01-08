import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/models/Order";
import Event from "@/models/Event";
import { jwtVerify } from "jose";
import { nanoid } from "nanoid";

const ALLOWED_ROLES = ['fan'];

export async function POST(req) {
    try {
        await dbConnect();

        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ message: 'Please login to continue....' }, { status: 401 });

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (!ALLOWED_ROLES.includes(payload.role)) {
            return NextResponse.json({ message: 'Ticket purchases are currently restricted to Fans only.' }, { status: 403 });
        }

        const { eventId, ticketTierId, quantity, buyerName } = await req.json();

        if (!eventId || !ticketTierId || !quantity || !buyerName) {
            return NextResponse.json({ message: 'Missing required details' }, { status: 400 });
        }

        const event = await Event.findById(eventId);
        if (!event) return NextResponse.json({ message: 'Event not found' }, { status: 404 });

        const tier = event.ticketTiers.id(ticketTierId);
        if (!tier) return NextResponse.json({ message: 'Ticket Tier not found' }, { status: 404 });

        if (tier.status !== 'Active') {
            return NextResponse.json({ message: 'Ticket Sales are unavaiable' }, { status: 400 });
        }

        const available = tier.capacity - tier.sold;
        if (quantity > available) {
            return NextResponse.json({ message: `Only ${available} tickets left!` }, { status: 400 });
        }

        tier.sold += quantity;
        if (tier.sold >= tier.capacity) tier.status = 'Sold Out';
        await event.save()

        const transactionId = `TRX-${nanoid(8).toUpperCase()}`;// e.g., TRX-9A2B3C4D
        const priceAtPurchase = tier.price;
        const totalAmount = priceAtPurchase * quantity;

        const newOrder = await Order.create({
            transactionId,
            eventId: event._id,
            buyerId: payload.userId,
            buyerName: buyerName,
            items: [{
                tierName: tier.name,
                quantity: quantity,
                price: priceAtPurchase
            }],
            totalAmount,
            status: 'Paid',
            paymentMethod: 'Credit Card'
        });

        return NextResponse.json({
            success: true,
            message: 'Order Confirmed',
            orderId: newOrder._id,
            trxId: transactionId
        }, { status: 201 });
    } catch (error) {
        console.error('Order Error: ', error);
        return NextResponse.json({ message: 'Transaction Failed' }, { status: 500 });
    }
}