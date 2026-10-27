import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import { verifyAuth } from '@/lib/auth';
import dbConnect from "@/lib/db";
import Memory from "@/models/Memory";
export async function POST(req) {
    try {
        await dbConnect();

        const payload = await verifyAuth(req);
        
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
        return apiError(error, '/api/memory-vault');
    }
}
export async function GET(req) {
    try {
        await dbConnect();

        const payload = await verifyAuth(req); 

        const memories = await Memory.find({ userId: payload.userId }).sort({ date: -1 });

        return NextResponse.json({ success: true, data: memories });
    } catch (error) {
        if (error.code === 'ERR_JWS_INVALID') {
             return NextResponse.json({ message: 'Invalid Token' }, { status: 401 });
        }
        return apiError(error, '/api/memory-vault');
    }
}