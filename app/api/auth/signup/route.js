import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { rateLimit, clientIp, LIMITS } from '@/lib/rateLimit';

const ROLES = ['fan', 'artist', 'organizer', 'production'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export async function POST(req) {
    try {
        await dbConnect();

        rateLimit(`signup:${clientIp(req)}`, LIMITS.signup);
        const body = await req.json();
        const name = String(body.name ?? '').trim();
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');
        // Roles are self-selected at signup (product decision for this demo); only known roles are accepted.
        const role = body.role ?? 'fan';

        if (!name || !email || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }
        if (!EMAIL.test(email)) {
            return NextResponse.json({ message: 'Please enter a valid email address' }, { status: 400 });
        }
        if (password.length < MIN_PASSWORD) {
            return NextResponse.json({ message: `Password must be at least ${MIN_PASSWORD} characters` }, { status: 400 });
        }
        if (!ROLES.includes(role)) {
            return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return NextResponse.json(
                { message: 'User already exists' },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
        });

        return NextResponse.json({
            message: 'User created successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            }
        }, { status: 201 });

    } catch (error) {
        return apiError(error, '/api/auth/signup');
    }
}