
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import Patch from '@/models/Patch';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Find or create a venue
        let venue = await Venue.findOne({ name: 'Madison Square Garden' });
        if (!venue) {
            venue = await Venue.create({
                name: 'Madison Square Garden',
                city: 'New York',
                capacity: 20000,
                location: '4 Pennsylvania Plaza'
            });
        }

        // 1. Create Mock "Requested" Event (Eras Tour)
        const erasTour = await Event.findOneAndUpdate(
            { title: 'The Eras Tour (Artist Assign Test)' },
            {
                eventId: Math.floor(9000 + Math.random() * 1000),
                title: 'The Eras Tour (Artist Assign Test)',
                description: 'Massive stadium tour requesting top-tier production.',
                date: new Date('2026-06-15'),
                time: '19:00',
                venue: venue._id,
                city: venue.city,
                artist: 'Taylor Swift',
                genre: 'Pop',
                status: 'requested', // SPECIAL STATUS
                organizerId: user.userId,
                assignedTo: user.userId,
                images: {
                    hero: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000'
                }
            },
            { upsert: true, new: true }
        );

        // 2. Create/Restore Show 13 (The Weeknd)
        const weekndShow = await Event.findOneAndUpdate(
            { eventId: 13 },
            {
                eventId: 13,
                title: 'The Weeknd - After Hours',
                description: 'Global Stadium Tour 2026',
                date: new Date(), // Today
                time: '21:00',
                venue: venue._id,
                city: 'Los Angeles',
                artist: 'The Weeknd',
                genre: 'R&B',
                status: 'active', // ACTIVE immediately
                organizerId: user.userId,
                assignedTo: user.userId,
                images: {
                    hero: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000'
                }
            },
            { upsert: true, new: true }
        );

        // 3. Create Colliding Patch for Show 13 (Test Case)
        const collidingFixtures = [
            { fixtureId: 101, profile: 'Clay Paky Sharpy', mode: 'Standard', channels: 20, universe: 1, address: 1, status: 'ok' },
            { fixtureId: 102, profile: 'Clay Paky Sharpy', mode: 'Standard', channels: 20, universe: 1, address: 5, status: 'ok' }
        ];

        // Manually mark collisions for demonstration
        collidingFixtures[0].status = 'collision';
        collidingFixtures[0].notes = 'Overlaps with fixture at 5';
        collidingFixtures[1].status = 'collision';
        collidingFixtures[1].notes = 'Overlaps with fixture at 1';

        await Patch.findOneAndUpdate(
            { eventId: weekndShow._id },
            {
                eventId: weekndShow._id,
                fixtures: collidingFixtures,
                version: '1.0',
                showName: 'Collision Test Patch'
            },
            { upsert: true, new: true }
        );

        // Explicitly Log the Warning
        const Activity = (await import('@/models/Activity')).default;
        await Activity.create({
            userId: user.userId,
            action: 'update',
            entityType: 'Patch',
            details: 'Saved Patch with 1 collisions',
            type: 'warning',
            link: `/patch-studio/${weekndShow.eventId}`
        });

        return NextResponse.json({
            success: true,
            data: {
                eras: erasTour,
                weeknd: weekndShow,
                message: "Seeded with Collision Patch on Show 13"
            }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
