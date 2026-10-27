import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import mongoose from 'mongoose';
import { verifyAuth } from '@/lib/auth';
import dbConnect from '@/lib/db'; // Your DB connection utility
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import Review from '@/models/Review'; // Ensure this model exists!

export async function GET(req) {
  try {
    await dbConnect();
    const payload = await verifyAuth(req); // payload.userId contains the organizerId
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId'); // Expecting the MongoDB _id

    if (!eventId) {
      return NextResponse.json({ message: 'Event ID is required' }, { status: 400 });
    }
    const objectId = new mongoose.Types.ObjectId(eventId);
    
    const eventExists = await Event.findOne({ 
      _id: objectId, 
      organizerId: payload.userId 
    });

    if (!eventExists) {
      return NextResponse.json({ message: 'Event not found or access denied' }, { status: 403 });
    }
    
    const salesStats = await Ticket.aggregate([
      { 
        $match: { 
          event: objectId, // Matching the event ref
          status: { $in: ['confirmed', 'paid', 'valid'] } // Adjust based on your Ticket status enum
        } 
      },
      {
        $facet: {
          "totalSales": [
            {
              $group: {
                _id: null,
                totalTickets: { $sum: 1 },
                totalRevenue: { $sum: "$price" }
              }
            }
          ],
          "monthlyTrend": [
            {
              $group: {
                _id: { 
                  month: { $month: "$purchaseDate" }, 
                  year: { $year: "$purchaseDate" },
                },
                count: { $sum: 1 },
                revenue: { $sum: "$price" }
              }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            {
              $project: { 
                _id: 0,
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
    
    let sentimentStats = [{ sentimentCounts: [], trendingKeywords: [], recentReviews: [] }];
    if (Review) {
      sentimentStats = await Review.aggregate([
        { $match: { event: objectId } },
        {
          $facet: {
            "sentimentCounts": [
              {
                $group: {
                  _id: "$sentiment", // 'positive', 'negative', 'neutral'
                  count: { $sum: 1 }
                }
              }
            ],
            "trendingKeywords": [
              { $unwind: "$tags" },
              {
                $group: {
                  _id: "$tags",
                  count: { $sum: 1 },
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
    
    const salesData = salesStats[0];
    const reviewData = sentimentStats[0];

    return NextResponse.json({
      success: true,
      kpi: {
        totalTickets: salesData.totalSales[0]?.totalTickets || 0,
        totalRevenue: salesData.totalSales[0]?.totalRevenue || 0,
      },
      charts: {
        salesOverTime: salesData.monthlyTrend || [], 
      },
      sentiment: {
        breakdown: reviewData.sentimentCounts || [],
        keywords: reviewData.trendingKeywords || [],
        recent: reviewData.recentReviews || []
      }
    });

  } catch (error) {
    return apiError(error, '/api/analysis');
  }
}