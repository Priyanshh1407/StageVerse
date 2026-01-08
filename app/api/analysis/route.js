import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/db'; // Your DB connection utility
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import Review from '@/models/Review'; // Ensure this model exists!

export async function GET(req) {
  try {
    // 1. Connect to DB
    await dbConnect();

    // 2. Authentication Check (Protect Analytics Data)
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret); // payload.userId contains the organizerId

    // 3. Get Event ID from URL
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId'); // Expecting the MongoDB _id

    if (!eventId) {
      return NextResponse.json({ message: 'Event ID is required' }, { status: 400 });
    }

    // 4. Verification: Ensure this event belongs to the logged-in Organizer
    // We cast eventId to ObjectId to ensure valid format
    const objectId = new mongoose.Types.ObjectId(eventId);
    
    const eventExists = await Event.findOne({ 
      _id: objectId, 
      organizerId: payload.userId 
    });

    if (!eventExists) {
      return NextResponse.json({ message: 'Event not found or access denied' }, { status: 403 });
    }

    // =================================================================
    // AGGREGATION 1: SALES ANALYTICS (Tickets)
    // =================================================================
    // This pipeline assumes your Ticket model has fields: 'event' (ObjectId), 'price' (Number), 'purchaseDate' (Date)
    
    const salesStats = await Ticket.aggregate([
      { 
        $match: { 
          event: objectId, // Matching the event ref
          status: { $in: ['confirmed', 'paid', 'valid'] } // Adjust based on your Ticket status enum
        } 
      },
      {
        $facet: {
          // A. KPI Totals
          "totalSales": [
            {
              $group: {
                _id: null,
                totalTickets: { $sum: 1 },
                totalRevenue: { $sum: "$price" }
              }
            }
          ],
          // B. Monthly Trend (For the Line/Bar Chart)
          "monthlyTrend": [
            {
              $group: {
                _id: { 
                  month: { $month: "$purchaseDate" }, 
                  year: { $year: "$purchaseDate" },
                  // Optional: if you want day granularity for short events:
                  // day: { $dayOfMonth: "$purchaseDate" } 
                },
                count: { $sum: 1 },
                revenue: { $sum: "$price" }
              }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            {
              $project: { 
                _id: 0,
                // Format label for frontend (e.g., "9/2023")
                time: { 
                  $concat: [
                    { $toString: "$_id.month" }, "/", 
                    { $toString: "$_id.year" }
                  ] 
                },
                value: "$count", // or "$revenue" depending on what you want to graph
                type: "positive" // visual helper
              }
            }
          ]
        }
      }
    ]);

    // =================================================================
    // AGGREGATION 2: SENTIMENT ANALYTICS (Reviews)
    // =================================================================
    // If you don't have a Review model yet, this section will return empty arrays safely.
    
    let sentimentStats = [{ sentimentCounts: [], trendingKeywords: [], recentReviews: [] }];

    // Only run if Review model is imported and exists
    if (Review) {
      sentimentStats = await Review.aggregate([
        { $match: { event: objectId } },
        {
          $facet: {
            // A. Breakdown (Positive/Negative counts)
            "sentimentCounts": [
              {
                $group: {
                  _id: "$sentiment", // 'positive', 'negative', 'neutral'
                  count: { $sum: 1 }
                }
              }
            ],
            // B. Keywords (Unwinding tags array)
            "trendingKeywords": [
              { $unwind: "$tags" },
              {
                $group: {
                  _id: "$tags",
                  count: { $sum: 1 },
                  // Calculate average sentiment for this tag (1=pos, 0=neg)
                  avgScore: { 
                    $avg: { $cond: [{ $eq: ["$sentiment", "positive"] }, 1, 0] } 
                  }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
              {
                $project: {
                  label: "$_id",
                  size: { // Dynamic sizing logic for UI
                    $cond: [{ $gte: ["$count", 10] }, "text-xl", "text-sm"] 
                  },
                  type: {
                    $cond: [{ $gte: ["$avgScore", 0.6] }, "positive", "negative"]
                  }
                }
              }
            ],
            // C. Recent 5 Reviews
            "recentReviews": [
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              {
                $project: {
                  id: "$_id",
                  user: "$userName", // Adjust based on your schema
                  ticket: "$ticketType",
                  text: "$comment",
                  sentiment: "$sentiment"
                }
              }
            ]
          }
        }
      ]);
    }

    // =================================================================
    // FORMAT RESPONSE
    // =================================================================
    
    const salesData = salesStats[0];
    const reviewData = sentimentStats[0];

    return NextResponse.json({
      success: true,
      // Sales Data
      kpi: {
        totalTickets: salesData.totalSales[0]?.totalTickets || 0,
        totalRevenue: salesData.totalSales[0]?.totalRevenue || 0,
      },
      charts: {
        // This maps directly to your <BarChart data={...} />
        salesOverTime: salesData.monthlyTrend || [], 
      },
      // Sentiment Data
      sentiment: {
        breakdown: reviewData.sentimentCounts || [],
        keywords: reviewData.trendingKeywords || [],
        recent: reviewData.recentReviews || []
      }
    });

  } catch (error) {
    console.error('Analysis API Error:', error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}