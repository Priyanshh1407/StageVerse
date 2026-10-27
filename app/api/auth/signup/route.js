import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
    try {
        await dbConnect();

        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
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
            role: role || 'fan',
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