import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import { containsRegex } from '@/lib/escapeRegex';
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Venue from "@/models/Venue"; // Import to ensure model registration

export async function GET(req) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const searchQuery = searchParams.get('search');
        const genre = searchParams.get('genre');
        const city = searchParams.get('city');
        const vibe = searchParams.get('vibe');
        const dateFilter = searchParams.get('date');

        const matchStage = {
            status: { $in: ['Published', 'Scheduled', 'Live'] }
        };

        if (dateFilter && dateFilter !== 'All') {
            const now = new Date();
            let start = new Date(now);
            let end = new Date(now);

            const filterUpper = dateFilter.toUpperCase();

            if (filterUpper === 'TODAY') {
                end.setHours(23, 59, 59, 999);
                matchStage.date = { $gte: now, $lte: end };
            }
            else if (filterUpper === 'WEEK' || filterUpper === 'THIS WEEK') {
                end.setDate(now.getDate() + 7);
                matchStage.date = { $gte: now, $lte: end };
            }
            else if (filterUpper === 'MONTH' || filterUpper === 'THIS MONTH') {
                end.setMonth(now.getMonth() + 1);
                end.setDate(0);
                end.setHours(23, 59, 59, 999);
                matchStage.date = { $gte: now, $lte: end };
            }
            else {
                const monthIndex = new Date(`${dateFilter} 1, 2000`).getMonth();
                if (!isNaN(monthIndex)) {
                    let year = now.getFullYear();
                    // If the selected month (e.g., "OCT") is earlier than current month (e.g., NOV), assume next year
                    if (monthIndex < now.getMonth()) {
                        year += 1;
                    }
                    const monthStart = new Date(year, monthIndex, 1);
                    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
                    matchStage.date = { $gte: monthStart, $lte: monthEnd };
                }
            }
        }

        if (genre && genre !== 'All') {
            matchStage.genre = containsRegex(genre);
        }
        if (vibe && vibe !== 'All') {
            matchStage.tags = containsRegex(vibe);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'venues',
                    localField: 'venue',
                    foreignField: '_id',
                    as: 'venueData'
                }
            },
            {
                $unwind: {
                    path: '$venueData',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        if (city && city !== 'All') {
            pipeline.push({
                $match: {
                    'venueData.city': containsRegex(city)
                }
            });
        }

        if (searchQuery) {
            pipeline.push({
                $match: {
                    $or: [
                        { artist: containsRegex(searchQuery) },
                        { title: containsRegex(searchQuery) },
                        { 'venueData.name': containsRegex(searchQuery) },
                        { 'venueData.city': containsRegex(searchQuery) }
                    ]
                }
            });
        }

        pipeline.push(
            { $sort: { date: 1 } },
            { $limit: 20 },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    artist: 1,
                    date: 1,
                    genre: 1,
                    tags: 1,
                    price: 1,
                    image: { $ifNull: ['$images.hero', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745'] },
                    venue: { $ifNull: ['$venueData', null] }
                }
            }
        );

        const events = await Event.aggregate(pipeline);

        // Fetch facets independently for the dropdowns
        const genres = await Event.distinct('genre', { status: { $in: ['Published', 'Scheduled', 'Live'] } });
        const cities = await Venue.distinct('city');

        return NextResponse.json({
            success: true,
            count: events.length,
            data: events,
            facets: {
                genres: genres.filter(Boolean).sort(),
                cities: cities.filter(Boolean).sort()
            }
        });
    } catch (error) {
        return apiError(error, '/api/discover');
    }
}