import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import dbConnect from '@/lib/db';
import cloudinary from '@/lib/cloudinary';

export async function GET() {
  const status = {
    mongodb: 'Testing...',
    cloudinary: 'Testing...',
  };

  try {
    console.log('🔌 Attempting MongoDB connection...');
    await dbConnect();
    status.mongodb = '✅ Connected successfully';
    console.log('✅ MongoDB Connected');
    console.log('☁️ Attempting Cloudinary Ping...');
    const cloudResult = await cloudinary.api.ping(); 
    status.cloudinary = `✅ Connected (Status: ${cloudResult.status})`;
    console.log('✅ Cloudinary Connected');

    return NextResponse.json(status, { status: 200 });

  } catch (error) {
    if (status.mongodb === 'Testing...') {
      status.mongodb = `❌ Failed: ${error.message}`;
    } else {
      status.cloudinary = `❌ Failed: ${error.message}`;
    }

    return apiError(error, '/api/health-check');
  }
}