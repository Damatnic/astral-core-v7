import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth/config';
import { mfaService } from '../../../../../lib/services/mfa-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../../../lib/constants/index';
import { logError } from '../../../../../lib/logger';
import { z } from 'zod';

const disableSchema = z.object({
  password: z.string()
});

// POST /api/auth/mfa/disable - Disable MFA
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
    const validated = disableSchema.parse(body);

    // Disable MFA
    const success = await mfaService.disableMfa(session.user.id, validated.password);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'MFA has been disabled'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to disable MFA' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error disabling MFA', error, 'mfa-disable');
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
