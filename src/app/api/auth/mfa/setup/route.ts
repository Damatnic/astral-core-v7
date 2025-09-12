import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth/config';
import { mfaService } from '../../../../../lib/services/mfa-service';
import { logError } from '../../../../../lib/logger';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../../../lib/constants/index';
import { z } from 'zod';

const setupSchema = z.object({
  method: z.enum(['TOTP', 'SMS', 'EMAIL']),
  phoneNumber: z.string().optional()
});

// POST /api/auth/mfa/setup - Initialize MFA setup
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
    const validated = setupSchema.parse(body);

    let result;

    switch (validated.method) {
      case 'TOTP':
        result = await mfaService.setupTotp(session.user.id);
        return NextResponse.json({
          success: true,
          data: {
            method: 'TOTP',
            secret: result.secret,
            qrCode: result.qrCode,
            backupCodes: result.backupCodes
          }
        });

      case 'SMS':
        if (!validated.phoneNumber) {
          return NextResponse.json(
            { error: 'Phone number required for SMS MFA' },
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }
        await mfaService.sendSmsCode(session.user.id, validated.phoneNumber);
        return NextResponse.json({
          success: true,
          message: 'SMS code sent',
          data: {
            method: 'SMS',
            phoneNumber: validated.phoneNumber.slice(-4) // Last 4 digits
          }
        });

      case 'EMAIL':
        await mfaService.sendEmailCode(session.user.id);
        return NextResponse.json({
          success: true,
          message: 'Email code sent',
          data: {
            method: 'EMAIL'
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid MFA method' },
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

    logError('Error setting up MFA', error, 'mfa-setup');
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
