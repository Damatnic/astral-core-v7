import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { fileUploadService } from '@/lib/services/file-upload-service';
import { rateLimiter } from '@/lib/security/rate-limiter';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { FileCategory } from '@prisma/client';

// GET /api/files - Get user files
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Rate limiting
    const allowed = await rateLimiter.checkLimit(
      `files-list:${session.user.id}`,
      60,
      60000 // 1 minute
    );
    if (!allowed) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as FileCategory;
    const isPrivate = searchParams.get('private');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters: any = {
      limit: Math.min(limit, 100), // Cap at 100 files per request
      offset,
    };

    if (category && Object.values(FileCategory).includes(category)) {
      filters.category = category;
    }

    if (isPrivate !== null) {
      filters.isPrivate = isPrivate === 'true';
    }

    const result = await fileUploadService.getUserFiles(session.user.id, filters);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}