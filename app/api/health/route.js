import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

export const dynamic = 'force-dynamic';

// Liveness/readiness probe for the host. Reports only up/down: no error messages,
// versions or connection details, because this endpoint is public.
export async function GET() {
    const started = Date.now();
    try {
        await dbConnect();
        await mongoose.connection.db.admin().ping();
        return NextResponse.json({ status: 'ok', db: 'up', latencyMs: Date.now() - started });
    } catch {
        return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 });
    }
}
