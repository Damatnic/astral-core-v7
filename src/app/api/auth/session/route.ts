import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      success: true,
      session,
      authenticated: !!session,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Session endpoint error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get session',
        details: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}