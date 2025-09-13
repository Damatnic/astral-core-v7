import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Simple health check for auth logging
    return NextResponse.json({
      success: true,
      message: 'Auth logging endpoint operational',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nextauth: {
        secret: !!process.env.NEXTAUTH_SECRET,
        url: process.env.NEXTAUTH_URL,
        demoAccounts: process.env.ALLOW_DEMO_ACCOUNTS
      }
    });
  } catch (error) {
    console.error('Auth log endpoint error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Auth logging service error',
        details: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Auth Log Entry:', {
      timestamp: new Date().toISOString(),
      ...body
    });
    
    return NextResponse.json({
      success: true,
      message: 'Log entry recorded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth log POST error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to record log entry',
        details: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}