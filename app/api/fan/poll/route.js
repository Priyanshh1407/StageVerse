import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { apiError, readJson } from '@/lib/api';
import dbConnect from '@/lib/db';
import Poll from '@/models/Poll';
import Vote from '@/models/Vote';
import { verifyAuth } from '@/lib/auth';
import { loadEventFor, hasEventRelation, SHOW_CONTROL } from '@/lib/authz';
import { resolveEvent } from '@/lib/events';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { emitToEvent, pollPayload } from '@/lib/realtime';
import { pickWinner } from '@/lib/polls';

const isObjectId = (v) => mongoose.isObjectIdOrHexString(v) && /^[0-9a-fA-F]{24}$/.test(String(v));

// GET ?eventId=  -> the active poll for an event (any logged-in user)
// GET ?eventId=&all=true -> every poll for the event (artist / crew only)
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        if (!eventId) throw new ValidationError('Event ID required');
        const fetchAll = searchParams.get('all') === 'true';

        const event = fetchAll
            ? await loadEventFor(user, eventId, SHOW_CONTROL)
            : await resolveEvent(eventId);

        if (fetchAll) {
            const polls = await Poll.find({ eventId: event._id }).sort({ createdAt: -1 }).limit(10);
            return NextResponse.json({ success: true, polls });
        }

        const poll = await Poll.findOne({ eventId: event._id, isActive: true }).sort({ createdAt: -1 });
        let votedOptionId = null;
        if (poll) {
            const vote = await Vote.findOne({ pollId: poll._id, userId: user.userId }).select('optionId');
            votedOptionId = vote ? String(vote.optionId) : null;
        }
        return NextResponse.json({ success: true, poll, votedOptionId });
    } catch (e) {
        return apiError(e, '/api/fan/poll');
    }
}

// PUT { pollId, isActive } -> open or close a poll (artist / crew of that event)
export async function PUT(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);

        const { pollId, isActive } = await readJson(req);
        if (!isObjectId(pollId)) throw new ValidationError('Missing or invalid Poll ID');
        if (typeof isActive !== 'boolean') throw new ValidationError('isActive must be a boolean');

        const existing = await Poll.findById(pollId);
        if (!existing) throw new NotFoundError('Poll not found');
        await loadEventFor(user, existing.eventId, SHOW_CONTROL);

        if (isActive) {
            // Only one poll per event can be open at a time
            await Poll.updateMany({ eventId: existing.eventId, isActive: true, _id: { $ne: existing._id } }, { isActive: false });
        }
        // Closing a poll fixes its winner from the persisted counts, so every screen reveals the same result
        const update = isActive ? { isActive, $unset: { winner: 1 } } : { isActive, winner: pickWinner(existing.options) };
        const poll = await Poll.findByIdAndUpdate(pollId, update, { new: true });

        emitToEvent(poll.eventId, isActive ? 'poll:start' : 'poll:end', pollPayload(poll));
        return NextResponse.json({ success: true, poll });
    } catch (e) {
        return apiError(e, '/api/fan/poll');
    }
}

// POST { create: true, eventId, question, options[] } -> create and open a poll (event's artist)
// POST { pollId, optionId } -> cast a vote (any logged-in user, once per poll)
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const body = await readJson(req);

        if (body.create) {
            const { question, options, eventId } = body;
            if (!question || !Array.isArray(options) || options.length < 2) {
                throw new ValidationError('A poll needs a question and at least 2 options');
            }
            const event = await loadEventFor(user, eventId, ['artist']);

            await Poll.updateMany({ eventId: event._id, isActive: true }, { isActive: false });
            const newPoll = await Poll.create({
                eventId: event._id,
                question,
                options: options.map((txt) => ({ text: String(txt), votes: 0 })),
                isActive: true,
                createdBy: user.userId,
            });
            emitToEvent(event._id, 'poll:start', pollPayload(newPoll));
            return NextResponse.json({ success: true, poll: newPoll });
        }

        const { pollId, optionId } = body;
        if (!isObjectId(pollId) || !isObjectId(optionId)) throw new ValidationError('Missing fields');

        const poll = await Poll.findOne({ _id: pollId, 'options._id': optionId });
        if (!poll) throw new NotFoundError('Poll or option not found');
        if (!poll.isActive) throw new ConflictError('This poll is closed');

        // Record the vote first: the unique (pollId, userId) index rejects a second vote
        // even if two requests from the same user arrive at the same time.
        try {
            await Vote.create({ pollId, userId: user.userId, optionId });
        } catch (err) {
            if (err?.code === 11000) throw new ConflictError('You have already voted in this poll');
            throw err;
        }

        const updated = await Poll.findOneAndUpdate(
            { _id: pollId, isActive: true, 'options._id': optionId },
            { $inc: { 'options.$.votes': 1 } },
            { new: true },
        );
        if (!updated) {
            // Poll closed between the check and the increment: undo the vote record
            await Vote.deleteOne({ pollId, userId: user.userId });
            throw new ConflictError('This poll is closed');
        }

        emitToEvent(updated.eventId, 'poll:update', pollPayload(updated));
        return NextResponse.json({ success: true, poll: updated, votedOptionId: String(optionId) });
    } catch (e) {
        return apiError(e, '/api/fan/poll');
    }
}
