import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';
import { audit } from '../../../../lib/security/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Log session access for auditing (but don't break if it fails)
    if (session?.user?.id) {
      try {
        await audit.logSuccess(
          'SESSION_ACCESS', 
          'User', 
          session.user.id, 
          { hasSession: true }, 
          session.user.id, 
          request
        );
      } catch (auditError) {
        console.error('Audit logging failed for session access:', auditError);
      }
    }
    
    return NextResponse.json({
      success: true,
      session,
      authenticated: !!session,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Session endpoint error:', error);
    
    // Log the error for audit purposes
    try {
      await audit.logError('SESSION_ACCESS', 'System', error, undefined, request);
    } catch (auditError) {
      console.error('Audit logging failed for session error:', auditError);
    }
    
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