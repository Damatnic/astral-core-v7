import NextAuth from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';
import { NextRequest, NextResponse } from 'next/server';

const handler = NextAuth(authOptions);

// Wrap handlers with error handling
export async function GET(request: NextRequest) {
  try {
    return await handler(request);
  } catch (error) {
    console.error('NextAuth GET handler error:', error);
    return NextResponse.json(
      { 
        error: 'Authentication service error',
        details: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handler(request);
  } catch (error) {
    console.error('NextAuth POST handler error:', error);
    return NextResponse.json(
      { 
        error: 'Authentication service error',
        details: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error'
      },
      { status: 500 }
    );
  }
}