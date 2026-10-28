import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { AuthError } from '@/lib/errors';

// The JWT only carries { userId, role }, so profile fields are read from the database.
// This also means a renamed user sees the new name without logging in again.
export async function GET(req) {
  try {
    const session = await verifyAuth(req);
    await dbConnect();
    const user = await User.findById(session.userId).select('name email role avatar');
    if (!user) throw new AuthError('Account no longer exists');

    return NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    }, { status: 200 });
  } catch (error) {
    if (error.status === 401) return NextResponse.json({ user: null }, { status: 401 });
    return apiError(error, '/api/auth/me');
  }
}
