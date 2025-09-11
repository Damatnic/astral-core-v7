import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { mfaService } from '@/lib/services/mfa-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/index';
import { z } from 'zod';
import { MfaMethod } from '@prisma/client';
import { logError } from '@/lib/logger';

const enableSchema = z.object({
  method: z.enum(['TOTP', 'SMS', 'EMAIL']),
  secret: z.string().optional(),
  verificationCode: z.string(),
  backupCodes: z.array(z.string()).optional(),
  phoneNumber: z.string().optional()
});

// POST /api/auth/mfa/enable - Enable MFA after verification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const validated = enableSchema.parse(body);

    // Check if MFA is already enabled
    const mfaStatus = await mfaService.getMfaStatus(session.user.id);
    if (mfaStatus?.enabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // For TOTP, we need the secret
    if (validated.method === 'TOTP' && !validated.secret) {
      return NextResponse.json(
        { error: 'Secret required for TOTP setup' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Enable MFA
    const success = await mfaService.enableMfa(
      session.user.id,
      validated.method as MfaMethod,
      validated.secret || '',
      validated.verificationCode,
      validated.backupCodes
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'MFA has been successfully enabled'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to enable MFA' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (error instanceof Error && error.message === 'Invalid verification code') {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error enabling MFA', error, 'mfa-enable');
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
