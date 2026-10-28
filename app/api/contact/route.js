import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import Contact from '@/models/Contact';

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { name, email, subject, message } = body;
        if (!name || !email || !message) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const newContact = await Contact.create({
            name,
            email,
            subject,
            message
        });

        return NextResponse.json({ success: true, data: newContact });

    } catch (error) {
        return apiError(error, '/api/contact');
    }
}
