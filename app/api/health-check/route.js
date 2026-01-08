// app/api/health-check/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import cloudinary from '@/lib/cloudinary';

export async function GET() {
  const status = {
    mongodb: 'Testing...',
    cloudinary: 'Testing...',
  };

  try {
    // 1. Test MongoDB
    console.log('🔌 Attempting MongoDB connection...');
    await dbConnect();
    status.mongodb = '✅ Connected successfully';
    console.log('✅ MongoDB Connected');

    // 2. Test Cloudinary
    console.log('☁️ Attempting Cloudinary Ping...');
    // .ping() is a lightweight method just to check credentials
    const cloudResult = await cloudinary.api.ping(); 
    status.cloudinary = `✅ Connected (Status: ${cloudResult.status})`;
    console.log('✅ Cloudinary Connected');

    return NextResponse.json(status, { status: 200 });

  } catch (error) {
    console.error('❌ Connection Error:', error);
    
    // Determine which one failed
    if (status.mongodb === 'Testing...') {
      status.mongodb = `❌ Failed: ${error.message}`;
    } else {
      status.cloudinary = `❌ Failed: ${error.message}`;
    }

    return NextResponse.json(status, { status: 500 });
  }
}