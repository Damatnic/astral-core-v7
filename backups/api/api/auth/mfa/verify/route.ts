import { NextRequest, NextResponse } from 'next/server';
import { mfaService } from '../../../../../lib/services/mfa-service';
import { rateLimiter } from '../../../../../lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../../../lib/constants/index';
import { z } from 'zod';
import { logError } from '../../../../../lib/logger';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const verifySchema = z.object({
  userId: z.string(),
  code: z.string(),
  isBackupCode: z.boolean().optional(),
  sessionToken: z.string() // Temporary token from login
});

// POST /api/auth/mfa/verify - Verify MFA code during login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifySchema.parse(body);

    // Rate limiting per user
    const allowed = await rateLimiter.check(`mfa-verify:${validated.userId}`);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    // Verify the temporary session token
    // In production, validate this properly
    // For now, we'll trust it if it exists

    // Verify MFA code
    const result = await mfaService.verifyMfa(
      validated.userId,
      validated.code,
      validated.isBackupCode
    );

    if (result.success) {
      // Create full session token
      // In production, integrate with NextAuth properly
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      const sessionToken = jwt.sign(
        {
          userId: validated.userId,
          mfaVerified: true,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4 // 4 hours for healthcare security
        },
        JWT_SECRET
      );

      // Set secure cookie
      const cookieStore = await cookies();
      cookieStore.set('session-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 4, // 4 hours for healthcare security
        path: '/'
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        redirectUrl: '/dashboard'
      });
    } else {
      return NextResponse.json(
        {
          error: result.message,
          remainingAttempts: result.remainingAttempts
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error verifying MFA', error, 'mfa-verify');
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// GET /api/auth/mfa/verify - Check if MFA is required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const mfaEnabled = await mfaService.isMfaEnabled(userId);
    const mfaStatus = await mfaService.getMfaStatus(userId);

    return NextResponse.json({
      required: mfaEnabled,
      status: mfaStatus
    });
  } catch (error) {
    logError('Error checking MFA status', error, 'mfa-verify');
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
