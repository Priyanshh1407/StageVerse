import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { apiError, readJson } from '@/lib/api';
import { verifyAuth } from '@/lib/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';

const PUBLIC_FIELDS = 'name avatar location bio role';
const isObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v) && mongoose.isObjectIdOrHexString(v);

/** Each user's held tickets (not refunded) with the show's title and date, grouped by user id. */
async function showsByUser(userIds) {
    const tickets = await Ticket.find({ userId: { $in: userIds }, status: { $ne: 'Refunded' } })
        .select('userId eventId')
        .populate({ path: 'eventId', model: Event, select: 'title date' })
        .lean();
    const byUser = new Map();
    for (const t of tickets) {
        if (!t.eventId) continue;
        const key = String(t.userId);
        if (!byUser.has(key)) byUser.set(key, new Map());
        byUser.get(key).set(String(t.eventId._id), t.eventId);
    }
    return byUser;
}

// GET -> the people you follow (with shows you share and their next show) and people you might
// know (fans with tickets to the same shows as you)
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const me = await User.findById(user.userId).select('following').lean();
        if (!me) throw new NotFoundError('User not found');

        const followingIds = (me.following || []).map(String);
        const [followingUsers, byUser] = await Promise.all([
            User.find({ _id: { $in: followingIds } }).select(PUBLIC_FIELDS).lean(),
            showsByUser([user.userId, ...followingIds]),
        ]);
        const myShows = byUser.get(String(user.userId)) ?? new Map();
        const now = Date.now();

        const following = followingUsers.map((f) => {
            const shows = [...(byUser.get(String(f._id))?.values() ?? [])];
            const next = shows.filter((s) => new Date(s.date).getTime() >= now).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
            return {
                id: String(f._id), name: f.name, avatar: f.avatar || null, location: f.location || '', bio: f.bio || '',
                sharedShows: shows.filter((s) => myShows.has(String(s._id))).length,
                nextShow: next ? { title: next.title, date: next.date } : null,
            };
        }).sort((a, b) => b.sharedShows - a.sharedShows || a.name.localeCompare(b.name));

        // Fans going to the same shows as you that you don't follow yet, most shows in common first
        const exclude = new Set([String(user.userId), ...followingIds]);
        const sameShowTickets = myShows.size
            ? await Ticket.find({ eventId: { $in: [...myShows.keys()] }, status: { $ne: 'Refunded' } }).select('userId eventId').limit(2000).lean()
            : [];
        const common = new Map();
        for (const t of sameShowTickets) {
            const id = String(t.userId);
            if (exclude.has(id)) continue;
            if (!common.has(id)) common.set(id, new Set());
            common.get(id).add(String(t.eventId));
        }
        const candidates = [...common.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 20);
        const people = await User.find({ _id: { $in: candidates.map(([id]) => id) }, role: 'fan' }).select(PUBLIC_FIELDS).lean();
        const peopleById = new Map(people.map((p) => [String(p._id), p]));
        const suggestions = candidates
            .filter(([id]) => peopleById.has(id))
            .slice(0, 6)
            .map(([id, shows]) => {
                const p = peopleById.get(id);
                return {
                    id, name: p.name, avatar: p.avatar || null, location: p.location || '',
                    sharedShows: shows.size,
                    reason: `Also going to ${myShows.get([...shows][0])?.title ?? 'a show you have tickets for'}`,
                };
            });

        return NextResponse.json({ success: true, following, suggestions });
    } catch (error) {
        return apiError(error, '/api/social');
    }
}

// POST { userId, follow } -> follow (true) or unfollow (false) someone
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const { userId, follow } = await readJson(req);
        if (!isObjectId(userId)) throw new ValidationError('Invalid user id');
        if (typeof follow !== 'boolean') throw new ValidationError('follow must be true or false');
        if (userId === String(user.userId)) throw new ValidationError("You can't follow yourself");
        if (follow && !(await User.exists({ _id: userId }))) throw new NotFoundError('User not found');

        await User.updateOne({ _id: user.userId }, follow ? { $addToSet: { following: userId } } : { $pull: { following: userId } });
        return NextResponse.json({ success: true, following: follow });
    } catch (error) {
        return apiError(error, '/api/social');
    }
}
