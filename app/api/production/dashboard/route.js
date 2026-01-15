
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue'; // Assuming this exists, based on Ref
import Patch from '@/models/Patch';
import Activity from '@/models/Activity'; // IMPORT ACTIVITY
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();

        // 1. Auth Check
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch User's Events (Shows + Requests)
        const events = await Event.find({
            $or: [{ organizerId: user.userId }, { assignedTo: user.userId }]
        }).populate('venue').sort({ date: 1 });

        // 3. Map Events to Dashboard Format
        const shows = events.map(event => {
            return {
                id: event.eventId || event._id.toString(),
                eventId: event.eventId,
                title: event.title,
                venue: event.city || (event.venue?.name || 'Unknown Venue'),
                date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                status: event.status, // active, archived, requested
                type: event.genre || 'General',
                typeColor: getColorForGenre(event.genre),
                image: event.images?.hero || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'
            };
        });

        // 4. Calculate Stats
        const activeShows = shows.filter(s => s.status === 'active');
        const archivedShows = shows.filter(s => s.status === 'archived');
        const requestedShows = shows.filter(s => s.status === 'requested');

        // CHECK FOR CONFLICTS (Dynamic Analysis)
        let conflictCount = 0;
        const activeEventIds = events.filter(e => e.status === 'active').map(e => e._id);
        if (activeEventIds.length > 0) {
            const patches = await Patch.find({ eventId: { $in: activeEventIds } });

            patches.forEach(p => {
                const hasIssues = p.fixtures.some(f => f.status === 'error' || f.status === 'collision');
                if (hasIssues) conflictCount++;
            });
        }

        const stats = {
            active: activeShows.length,
            archived: archivedShows.length,
            pending: requestedShows.length,
            conflicts: conflictCount
        };

        // 5. FETCH REAL ACTIVITY LOGS
        // Limit to last 10
        const logs = await Activity.find({ userId: user.userId })
            .sort({ timestamp: -1 })
            .limit(10);

        const activity = logs.map(log => ({
            id: log._id,
            text: log.details,
            time: formatTimeAgo(log.timestamp),
            type: log.type,
            link: log.link
        }));

        // 6. Mock Tasks (Still Mocked as requested to keep "Personal Planner")
        const tasks = [
            { id: 1, title: 'Finalize patch list', priority: 'High', color: 'red', due: '2h' },
            { id: 2, title: 'Review plot conflicts', priority: 'In Progress', color: 'amber', due: 'Tomorrow' },
            { id: 3, title: 'Update fixture inventory', priority: 'To Do', color: 'blue', due: 'Nov 10' }
        ];

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    name: user.name || 'Producer',
                    role: 'Production Manager',
                    currentProject: activeShows[0]?.title || 'No Active Projects'
                },
                stats,
                shows: shows, // Return all
                tasks,
                activity // REAL ACTIVITY
            }
        });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

function getColorForGenre(genre) {
    if (!genre) return 'bg-gray-500';
    const g = genre.toLowerCase();
    if (g.includes('rock') || g.includes('metal')) return 'bg-red-500';
    if (g.includes('pop') || g.includes('dance')) return 'bg-pink-500';
    if (g.includes('jazz') || g.includes('classical')) return 'bg-amber-500';
    if (g.includes('festival')) return 'bg-indigo-500';
    if (g.includes('corporate')) return 'bg-slate-500';
    return 'bg-blue-500'; // Default
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
}
