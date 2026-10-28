import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { rateLimit, clientIp, LIMITS } from '@/lib/rateLimit';

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const email = String(body.email ?? '').trim();
        const password = String(body.password ?? '');

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Please provide both email and password.' },
                { status: 400 }
            );
        }

        // Slow down password guessing: 5 attempts per minute per IP + email
        rateLimit(`login:${clientIp(req)}:${email.toLowerCase()}`, LIMITS.login);

        // New accounts store lowercase emails; older ones may not, so accept both spellings
        const user = await User.findOne({ email: { $in: [email, email.toLowerCase()] } }).select('+password');

        if (!user) {
            return NextResponse.json(
                { message: 'Invalid credentials.' },
                { status: 401 }
            );
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json(
                { message: 'Invalid credentials.' },
                { status: 401 }
            );
        }
        const token = await new SignJWT({ userId: String(user._id), role: user.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        const response = NextResponse.json(
            {
                message: 'Login successful',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                }
            }, {
                status: 200
        });
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        return apiError(error, '/api/auth/login');
    }
}