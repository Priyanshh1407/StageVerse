import { NextResponse } from "next/server";
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
        
        // --- FIX 1: DEFINE DATEFILTER ---
        const dateFilter = searchParams.get('date'); 

        // 1. Initial Match Stage (Status & Date & Genre & Vibe)
        const matchStage = {
            status: { $in: ['Published', 'Scheduled', 'Live'] }
        };

        // 2. Date Logic
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
                // Specific Month (e.g. "OCT")
                const monthIndex = new Date(`${dateFilter} 1, 2000`).getMonth();
                if (!isNaN(monthIndex)) {
                    let year = now.getFullYear();
                    // If month has passed this year, assume next year
                    if (monthIndex < now.getMonth()) {
                        year += 1;
                    }
                    const monthStart = new Date(year, monthIndex, 1);
                    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
                    matchStage.date = { $gte: monthStart, $lte: monthEnd };
                }
            }
        }

        // 3. Direct Attribute Filters
        if (genre && genre !== 'All') {
            matchStage.genre = { $regex: genre, $options: 'i' };
        }
        if (vibe && vibe !== 'All') {
            matchStage.tags = { $regex: vibe, $options: 'i' };
        }

        // 4. Build Pipeline
        const pipeline = [
            // A. Apply Primary Filters First (Efficiency)
            { $match: matchStage },
            
            // B. Populate Venue
            {
                $lookup: {
                    from: 'venues',
                    localField: 'venue',
                    foreignField: '_id',
                    as: 'venueData'
                }
            },
            
            // --- FIX 2: PRESERVE EVENTS WITHOUT VENUES ---
            // If an event has no venue or invalid venue ID, keep it in results instead of deleting it
            { 
                $unwind: {
                    path: '$venueData',
                    preserveNullAndEmptyArrays: true 
                } 
            }
        ];

        // 5. Secondary Filters (City) - Depends on Venue Data
        if (city && city !== 'All') {
            pipeline.push({
                $match: {
                    'venueData.city': { $regex: city, $options: 'i' }
                }
            });
        }

        // 6. Search Logic (Depends on Venue Data)
        if (searchQuery) {
            pipeline.push({
                $match: {
                    $or: [
                        { artist: { $regex: searchQuery, $options: 'i' } },
                        { title: { $regex: searchQuery, $options: 'i' } },
                        { 'venueData.name': { $regex: searchQuery, $options: 'i' } },
                        { 'venueData.city': { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            });
        }

        // 7. Sort & Project
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
                    image: 1,
                    // Return venue object if exists, otherwise fallback to original field or null
                    venue: { $ifNull: ['$venueData', null] }
                }
            }
        );

        const events = await Event.aggregate(pipeline);

        return NextResponse.json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        console.error('Discover API error: ', error);
        return NextResponse.json({ message: 'Server Error' }, { status: 500 });
    }
}