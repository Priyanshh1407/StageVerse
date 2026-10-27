import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Venue from '@/models/Venue';
import Task from '@/models/Task';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
                console.log("ARTIST DASHBOARD FETCH - Artist ID:", user.userId); // DEBUG LOG
        const allEvents = await Event.find({ artistId: user.userId }).select('title city ticketTiers date');

        let totalTicketsSold = 0;
        let totalCapacity = 0;
        let grossRevenue = 0;
        const revenueBreakdown = [];

        allEvents.forEach(event => {
            let eventRevenue = 0;
            if (event.ticketTiers) {
                event.ticketTiers.forEach(tier => {
                    const s = tier.sold || 0;
                    const c = tier.capacity || 0;
                    const p = tier.price || 0;

                    totalTicketsSold += s;
                    totalCapacity += c;
                    eventRevenue += (s * p);
                });
            }
            grossRevenue += eventRevenue;
            revenueBreakdown.push({
                eventId: event._id,
                city: event.city,
                date: event.date,
                revenue: eventRevenue
            });
        });
        revenueBreakdown.sort((a, b) => new Date(a.date) - new Date(b.date));
        let fanPulseLabel = "Low";
        let fanPulseTrend = false;
        if (totalCapacity > 0) {
            const sellOutRate = (totalTicketsSold / totalCapacity);
            if (sellOutRate > 0.8) { fanPulseLabel = "High Eng."; fanPulseTrend = true; }
            else if (sellOutRate > 0.5) { fanPulseLabel = "Steady"; fanPulseTrend = true; }
            else { fanPulseLabel = "Cooling"; fanPulseTrend = false; }
        }
        const nextShow = await Event.findOne({
            artistId: user.userId
        })
            .sort({ date: -1 })
            .populate('venue', 'name city') // Ensure we get venue details
            .select('title date city venue ticketTiers images');
        const upcomingQuery = { artistId: user.userId };
        if (nextShow && nextShow._id) {
            upcomingQuery._id = { $ne: nextShow._id };
        }
        const upcomingStops = await Event.find(upcomingQuery)
            .sort({ date: -1 })
            .populate('venue', 'name')
            .select('date city venue ticketTiers status'); // Added ticketTiers/status
        let currentShowStats = { sold: 0, capacity: 0, percentage: 0, vipPercent: 0, gaPercent: 0, soldOut: false };
        let activeAlert = null;

        if (nextShow) {
            let vipSold = 0, vipCap = 0, gaSold = 0, gaCap = 0;

            if (nextShow.ticketTiers) {
                nextShow.ticketTiers.forEach(tier => {
                    const s = tier.sold || 0;
                    const c = tier.capacity || 0;
                    currentShowStats.sold += s;
                    currentShowStats.capacity += c;

                    if (tier.name.toLowerCase().includes('vip')) { vipSold += s; vipCap += c; }
                    else { gaSold += s; gaCap += c; }
                });
            }

            if (currentShowStats.capacity > 0) {
                currentShowStats.percentage = Math.round((currentShowStats.sold / currentShowStats.capacity) * 100);
                currentShowStats.vipPercent = vipCap > 0 ? Math.round((vipSold / vipCap) * 100) : 0;
                currentShowStats.gaPercent = gaCap > 0 ? Math.round((gaSold / gaCap) * 100) : 0;
                if (currentShowStats.percentage >= 100) currentShowStats.soldOut = true;
            }
            const myEventIds = (await Event.find({ artistId: user.userId }).select('_id')).map((e) => e._id);
            const urgentTasks = await Task.find({
                $or: [
                    { eventId: nextShow._id, priority: 'High' }, // Normal urgent tasks for this show
                    // Crew messages, but only for this artist's own shows
                    { eventId: { $in: myEventIds }, title: { $regex: '^Crew Message:', $options: 'i' }, urgent: true }
                ],
                status: { $ne: 'Done' }
            }).select('title status priority dueDate');

            const urgentTasksCount = urgentTasks.length;

            if (urgentTasksCount > 0) {
                activeAlert = {
                    active: true,
                    title: "Logistics Attention Needed",
                    message: `You have ${urgentTasksCount} Urgent Tasks Pending`,
                    type: "critical", // critical | warning | info
                    tasks: urgentTasks // Pass the actual tasks
                };
            } else if (currentShowStats.percentage < 50 && (new Date(nextShow.date) - new Date()) < 86400000 * 3) {
                activeAlert = {
                    active: true,
                    title: "Sales Alert",
                    message: "Ticket sales are below 50% for",
                    highlight: nextShow.city
                };
            } else if (currentShowStats.soldOut) {
                activeAlert = {
                    active: true,
                    title: "Milestone Reached",
                    message: "Congratulations! Only waitlist remaining for",
                    highlight: nextShow.city
                };
            }
        }
        const tourName = "World Tour 2026";
        const systemStatus = "Online";
        let dashboardData = {
            tourName,
            systemStatus,
            currentShow: nextShow ? {
                id: nextShow._id, // Add ID for API calls
                city: nextShow.city,
                venue: nextShow.venue?.name || "Unknown Venue",
                doorsOpen: "18:00 PM",
                showStart: "20:00 PM",
                localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                statusLabel: "Live Tonight",
                isLive: true,
                image: nextShow.images?.hero || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=2548&auto=format&fit=crop"
            } : null,
            ticketStats: currentShowStats,
            alert: activeAlert,
            revenueBreakdown, // Pass for the popup
            quickStats: [
                { label: "Fan Pulse", value: fanPulseLabel, sub: "Based on sales", iconName: "Heart", trend: fanPulseTrend },
                { label: "Weather", value: "22°C Clear", sub: "Humidity: 45%", iconName: "Sun", trend: false },
                { label: "Gross Rev", value: `$${(grossRevenue / 1000).toFixed(1)}k`, sub: "Click for details", iconName: "DollarSign", trend: true, action: "revenue_breakdown" },
                { label: "Streams", value: "2.4M", sub: "Top City: Mumbai", iconName: "BarChart3", trend: false, success: true },
            ],
            stops: upcomingStops.map(stop => {
                let sold = 0; let cap = 0;
                if (stop.ticketTiers) stop.ticketTiers.forEach(t => { sold += (t.sold || 0); cap += (t.capacity || 0); });
                const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0;

                return {
                    date: new Date(stop.date).getDate().toString(),
                    month: new Date(stop.date).toLocaleString('default', { month: 'short' }).toUpperCase(),
                    city: stop.city,
                    venue: stop.venue?.name || "TBA",
                    status: stop.status,
                    percentSold: pct
                };
            })
        };

        return NextResponse.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        return apiError(error, '/api/artist/dashboard');
    }
}
