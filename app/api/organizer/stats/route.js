import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
const trend = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? 100 : 0);

// GET -> the organizer dashboard's KPI cards, from the organizer's own events and their tickets:
// revenue (and its 30-day trend), tickets sold (and how full the upcoming shows are), upcoming shows
export async function GET(req) {
    try {
        await dbConnect();
        const payload = await verifyAuth(req);
        requireRole(payload, 'organizer');

        const events = await Event.find({ organizerId: payload.userId }).select('_id title date ticketTiers').lean();
        const ids = events.map((e) => e._id);
        const now = Date.now();
        const upcoming = events.filter((e) => e.date && new Date(e.date).getTime() >= now - DAY / 2)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const upcomingIds = new Set(upcoming.map((e) => String(e._id)));

        const tickets = ids.length
            ? await Ticket.find({ eventId: { $in: ids }, status: { $ne: 'Refunded' } }).select('eventId price createdAt').lean()
            : [];
        let revenue = 0, last30 = 0, prev30 = 0, soldLast30 = 0, soldPrev30 = 0, soldUpcoming = 0;
        for (const t of tickets) {
            const price = t.price || 0;
            const age = now - new Date(t.createdAt).getTime();
            revenue += price;
            if (age <= 30 * DAY) { last30 += price; soldLast30++; } else if (age <= 60 * DAY) { prev30 += price; soldPrev30++; }
            if (upcomingIds.has(String(t.eventId))) soldUpcoming++;
        }
        const upcomingCapacity = upcoming.reduce((sum, e) => sum + (e.ticketTiers || []).reduce((s, tier) => s + (tier.capacity || 0), 0), 0);
        const next = upcoming[0];

        return NextResponse.json({
            success: true,
            stats: {
                revenue,
                revenueTrend: trend(last30, prev30),
                ticketsSold: tickets.length,
                ticketsTrend: trend(soldLast30, soldPrev30),
                // one decimal below 1% (a big festival's capacity makes early sales a fraction of a percent)
                capacityPercent: upcomingCapacity > 0 ? Math.min(100, Math.round((soldUpcoming / upcomingCapacity) * 1000) / 10) : 0,
                upcomingShows: upcoming.length,
                nextShow: next ? { title: next.title, date: next.date } : null,
            },
        });
    } catch (error) {
        return apiError(error, '/api/organizer/stats');
    }
}
