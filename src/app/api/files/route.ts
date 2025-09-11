import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { fileUploadService } from '@/lib/services/file-upload-service';
import { rateLimiter } from '@/lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/index';
import { FileCategory } from '@prisma/client';
import { 
  handleConditionalRequest, 
  createCachedResponse, 
  generateETag, 
  CacheStrategies 
} from '@/lib/utils/cache';

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
    const allowed = await rateLimiter.check(`files-list:${session.user.id}`);
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

    const filters: {
      limit: number;
      offset: number;
      category?: FileCategory;
      isPrivate?: boolean;
    } = {
      limit: Math.min(limit, 100), // Cap at 100 files per request
      offset
    };

    if (category && Object.values(FileCategory).includes(category)) {
      filters.category = category;
    }

    if (isPrivate !== null) {
      filters.isPrivate = isPrivate === 'true';
    }

    const result = await fileUploadService.getUserFiles(session.user.id, filters);

    // Generate ETag based on file list and timestamps
    const etag = generateETag(JSON.stringify(result));
    
    // Find the most recent file modification date
    const lastModified = result.files?.length > 0 
      ? new Date(Math.max(...result.files.map((file: { uploadedAt: Date }) => file.uploadedAt.getTime())))
      : new Date();

    // Check for conditional requests
    const conditionalResponse = handleConditionalRequest(request, etag, lastModified);
    if (conditionalResponse) {
      return conditionalResponse;
    }

    // Return cached response
    return createCachedResponse(result, {
      ...CacheStrategies.SHORT_CACHE,
      etag,
      lastModified,
    });
  } catch (error: unknown) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
