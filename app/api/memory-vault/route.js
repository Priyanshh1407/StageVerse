import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import dbConnect from "@/lib/db";
import Memory from "@/models/Memory";

// 1. POST: Create a new Memory
export async function POST(req) {
    try {
        await dbConnect();

        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        
        const body = await req.json();
        const { imageUrl, videoSrc, title, date, location, artist, venue } = body;

        if (!imageUrl && !videoSrc) {
            return NextResponse.json({ message: 'Media URL required' }, { status: 400 });
        }

        const newMemory = await Memory.create({
            userId: payload.userId,
            type: videoSrc ? 'video' : 'photo',
            title: title || 'Untitled Memory',
            image: imageUrl,
            videoSrc: videoSrc,
            date: date || new Date(),
            location: location || 'Unknown location',
            venue: venue,
            artist: artist
        });

        return NextResponse.json({ success: true, data: newMemory });
    } catch (error) {
        console.error('Memory Vault POST error: ', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

// 2. GET: Fetch User's Memories
export async function GET(req) {
    try {
        await dbConnect();

        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        
        // --- FIX IS HERE: Token first, Secret second ---
        const { payload } = await jwtVerify(token, secret); 

        const memories = await Memory.find({ userId: payload.userId }).sort({ date: -1 });

        return NextResponse.json({ success: true, data: memories });
    } catch (error) {
        console.error('Memory Vault GET error: ', error);
        // If the token is bad, return 401 so the frontend can redirect to login
        if (error.code === 'ERR_JWS_INVALID') {
             return NextResponse.json({ message: 'Invalid Token' }, { status: 401 });
        }
        return NextResponse.json({ message: 'Server Error' }, { status: 500 });
    }
}