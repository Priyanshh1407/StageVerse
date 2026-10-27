
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Patch from '@/models/Patch';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

        let eventDoc = await Event.findOne({
            $or: [{ _id: eventId.match(/^[0-9a-fA-F]{24}$/) ? eventId : null }, { eventId: eventId }]
        });

        if (!eventDoc) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        const patch = await Patch.findOne({ eventId: eventDoc._id });
        if (!patch) return NextResponse.json({ success: true, data: { fixtures: [] } });

        return NextResponse.json({ success: true, data: patch });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        const body = await req.json();
        const { eventId, fixtures } = body;

        if (!eventId || !fixtures || !Array.isArray(fixtures)) {
            return NextResponse.json({ error: 'Missing eventId or fixtures array' }, { status: 400 });
        }

        let eventDoc = await Event.findOne({
            $or: [{ _id: eventId.match(/^[0-9a-fA-F]{24}$/) ? eventId : null }, { eventId: eventId }]
        });

        if (!eventDoc) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        const processedFixtures = fixtures.map(f => ({ ...f, status: 'ok' }));

        const universeMap = {};
        for (const fixture of processedFixtures) {
            const u = fixture.universe;
            if (!universeMap[u]) universeMap[u] = [];
            universeMap[u].push(fixture);
        }

        let collisionCount = 0;

        for (const u in universeMap) {
            const fixturesInUniv = universeMap[u];
            fixturesInUniv.sort((a, b) => a.address - b.address);

            for (let i = 0; i < fixturesInUniv.length - 1; i++) {
                const current = fixturesInUniv[i];
                const next = fixturesInUniv[i + 1];
                const currentEnd = current.address + current.channels - 1;

                if (currentEnd >= next.address) {
                    current.status = 'collision';
                    next.status = 'collision';
                    current.notes = `Overlaps with fixture at ${next.address}`;
                    next.notes = `Overlaps with fixture at ${current.address}`;
                    collisionCount++;
                }
            }
        }
        const updatedPatch = await Patch.findOneAndUpdate(
            { eventId: eventDoc._id },
            {
                eventId: eventDoc._id,
                fixtures: processedFixtures,
                ...(body.version && { version: body.version }),
                ...(body.showName && { showName: body.showName })
            },
            { upsert: true, new: true }
        );
        const logType = collisionCount > 0 ? 'warning' : 'success';
        const logMsg = collisionCount > 0
            ? `Saved Patch with ${collisionCount} collisions`
            : `Saved Patch: ${fixtures.length} fixtures`;

        await logActivity(
            user.userId,
            'update',
            'Patch',
            logMsg,
            logType,
            `/patch-studio/${eventId}`
        );

        return NextResponse.json({ success: true, data: updatedPatch }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
