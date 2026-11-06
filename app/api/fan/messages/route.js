import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { apiError, readJson } from '@/lib/api';
import { verifyAuth } from '@/lib/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { LIMITS, rateLimit } from '@/lib/rateLimit';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const isObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v) && mongoose.isObjectIdOrHexString(v);
const PUBLIC_FIELDS = 'name avatar';
const MAX_LENGTH = 1000;

const shape = (m, me) => ({ id: String(m._id), text: m.text, mine: String(m.from) === me, read: m.read, createdAt: m.createdAt });

// GET            -> my conversations: the other person, the last message, unread count (newest first)
// GET ?with=<id> -> my conversation with that person (oldest first, up to 200), marked read
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const me = String(user.userId);
        const other = new URL(req.url).searchParams.get('with');

        if (other) {
            if (!isObjectId(other)) throw new ValidationError('Invalid user id');
            const person = await User.findById(other).select(PUBLIC_FIELDS).lean();
            if (!person) throw new NotFoundError('User not found');
            const messages = await Message.find({ $or: [{ from: me, to: other }, { from: other, to: me }] })
                .sort({ createdAt: 1 }).limit(200).lean();
            await Message.updateMany({ from: other, to: me, read: false }, { $set: { read: true } });
            return NextResponse.json({
                success: true,
                with: { id: String(person._id), name: person.name, avatar: person.avatar || null },
                messages: messages.map((m) => shape(m, me)),
            });
        }

        const mine = await Message.find({ $or: [{ from: me }, { to: me }] }).sort({ createdAt: -1 }).limit(500).lean();
        const byPerson = new Map();
        for (const m of mine) {
            const otherId = String(m.from) === me ? String(m.to) : String(m.from);
            const entry = byPerson.get(otherId) ?? { last: m, unread: 0 };
            if (String(m.to) === me && !m.read) entry.unread++;
            byPerson.set(otherId, entry);
        }
        const people = await User.find({ _id: { $in: [...byPerson.keys()] } }).select(PUBLIC_FIELDS).lean();
        const conversations = people.map((p) => {
            const { last, unread } = byPerson.get(String(p._id));
            return { with: { id: String(p._id), name: p.name, avatar: p.avatar || null }, last: shape(last, me), unread };
        }).sort((a, b) => new Date(b.last.createdAt) - new Date(a.last.createdAt));
        return NextResponse.json({ success: true, conversations });
    } catch (error) {
        return apiError(error, '/api/fan/messages');
    }
}

// POST { to, text } -> send a message
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const me = String(user.userId);
        rateLimit(`message:${me}`, LIMITS.message);
        const { to, text } = await readJson(req);
        if (!isObjectId(to)) throw new ValidationError('Invalid recipient');
        if (to === me) throw new ValidationError("You can't message yourself");
        const body = typeof text === 'string' ? text.trim() : '';
        if (!body) throw new ValidationError('Write a message first');
        if (body.length > MAX_LENGTH) throw new ValidationError(`Messages can be up to ${MAX_LENGTH} characters`);
        if (!(await User.exists({ _id: to }))) throw new NotFoundError('User not found');
        const message = await Message.create({ from: me, to, text: body });
        return NextResponse.json({ success: true, message: shape(message, me) }, { status: 201 });
    } catch (error) {
        return apiError(error, '/api/fan/messages');
    }
}
