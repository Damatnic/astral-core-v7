import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { mfaService } from '@/lib/services/mfa-service';
import { logError } from '@/lib/logger';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/index';

// POST /api/auth/mfa/backup-codes - Regenerate backup codes
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Check if MFA is enabled
    const mfaStatus = await mfaService.getMfaStatus(session.user.id);
    if (!mfaStatus?.enabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Generate new backup codes
    const backupCodes = await mfaService.regenerateBackupCodes(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'New backup codes generated',
      data: {
        codes: backupCodes,
        warning: 'Please save these codes in a secure location. They will not be shown again.'
      }
    });
  } catch (error) {
    logError('Error regenerating backup codes', error, 'mfa-backup-codes');
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// GET /api/auth/mfa/backup-codes - Get remaining backup codes count
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const mfaStatus = await mfaService.getMfaStatus(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        remaining: mfaStatus?.backupCodesRemaining || 0
      }
    });
  } catch (error) {
    logError('Error fetching backup codes status', error, 'mfa-backup-codes');
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
