import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/db';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import User from '@/models/User';

export async function GET(req) {
  try {
    await dbConnect();

    // 1. Authentication
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const { searchParams } = new URL(req.url);
    const eventIdParam = searchParams.get('eventId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'Financial Overview';

    // 2. Get User's Events (For Dropdown)
    // We select _id and title to populate the UI select box
    const myEvents = await Event.find({ organizerId: payload.userId }).select('_id title');

    // 3. Define Date Ranges for Trends
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    const sixtyDaysAgo = new Date(new Date().setDate(today.getDate() - 60));

    // 4. Build Match Stage
    let matchStage = {};

    // If "All Events" is selected (empty string) OR user has no events, fetch everything for this user
    if (!eventIdParam || eventIdParam === 'All Events') {
       matchStage.eventId = { $in: myEvents.map(e => e._id) };
    } else {
       matchStage.eventId = new mongoose.Types.ObjectId(eventIdParam);
    }

    let chartValueExpr = { $sum: "$price" }; 
    let typeValueExpr = { $sum: "$price" };
    
    // Switch logic
    if (category === 'Ticket Sales Trends') {
        // Count tickets instead of price
        chartValueExpr = { $sum: 1 };
        typeValueExpr = { $sum: 1 };
    } 
    else if (category === 'Attendee Demographics') {
        // For demographics, we'll map Ticket Types as "Segments" (Count)
        chartValueExpr = { $sum: 1 }; 
        typeValueExpr = { $sum: 1 };
    }

    // 5. Aggregation Pipeline
    const statsData = await Ticket.aggregate([
      { $match: { ...matchStage, createdAt: { $gte: sixtyDaysAgo } } },
      {
        $facet: {
          // A. Current Period Stats (Last 30 Days)
          "current": [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$price" },
                tickets: { $sum: 1 },
                avgPrice: { $avg: "$price" }
              }
            }
          ],
          // B. Previous Period Stats (30-60 Days Ago) - For Trend %
          "previous": [
            { $match: { createdAt: { $lt: thirtyDaysAgo, $gte: sixtyDaysAgo } } },
             {
              $group: {
                _id: null,
                revenue: { $sum: "$price" },
                tickets: { $sum: 1 }
              }
            }
          ],
          // C. Daily Chart Data
          "dailyChart": [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                value: chartValueExpr
              }
            },
            { $sort: { _id: 1 } }
          ],
          // D. Revenue By Type
          "byType": [
             { $match: { createdAt: { $gte: thirtyDaysAgo } } },
             {
               $group: {
                 _id: "$type",
                 value: typeValueExpr,
               }
             }
          ]
        }
      }
    ]);

    // 6. Fetch Transaction Table Data (Paginated)
    let trxQuery = { ...matchStage };
    // If search provided, filter by Ticket ID (simple regex)
    if (search) {
       trxQuery.qrCode = { $regex: search, $options: 'i' }; 
    }

    const transactions = await Ticket.find(trxQuery)
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('eventId', 'title');

    const totalTrx = await Ticket.countDocuments(trxQuery);

    // 7. Process & Format Data
    const current = statsData[0].current[0] || { revenue: 0, tickets: 0, avgPrice: 0 };
    const prev = statsData[0].previous[0] || { revenue: 0, tickets: 0 };

    const calcTrend = (curr, old) => {
        if (!old || old === 0) return 100;
        return ((curr - old) / old) * 100;
    };

    const responseData = {
      kpi: [
        { id: 'revenue', label: "Total Revenue", value: current.revenue, type: 'currency', trend: calcTrend(current.revenue, prev.revenue) },
        { id: 'tickets', label: "Tickets Sold", value: current.tickets, type: 'number', trend: calcTrend(current.tickets, prev.tickets) },
        { id: 'avg_price', label: "Avg. Ticket Price", value: current.avgPrice || 0, type: 'currency', trend: 0 },
        { id: 'refunds', label: "Refund Rate", value: 0.8, type: 'percentage', trend: -0.5 } // Hardcoded for demo
      ],
      chart: statsData[0].dailyChart.map(item => ({ name: item._id, value: item.value })),
      revenueTypes: statsData[0].byType.map(item => ({
        label: item._id || 'Standard',
        value: item.value,
        percent: current.revenue ? ((item.value / current.revenue) * 100).toFixed(1) : 0
      })),
      transactions: transactions.map(t => ({
        id: t.qrCode || t._id.toString().slice(-6).toUpperCase(),
        date: new Date(t.createdAt).toLocaleDateString(),
        customer: "Guest User", // In a real app, populate from User
        type: t.type,
        qty: 1,
        amount: t.price,
        status: t.status
      })),
      pagination: { total: totalTrx },
      eventsList: myEvents // <--- Sends the list for the dropdown
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}