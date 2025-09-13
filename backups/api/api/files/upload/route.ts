import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';
import { fileUploadService } from '../../../../lib/services/file-upload-service';
import { rateLimiter } from '../../../../lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../../lib/constants/index';
import { FileCategory } from '@prisma/client';

// POST /api/files/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Rate limiting - 10 uploads per hour per user
    const allowed = await rateLimiter.check(`file-upload:${session.user.id}`);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Upload limit exceeded. Please try again later.' },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as FileCategory;
    const description = formData.get('description') as string;
    const isPrivate = formData.get('isPrivate') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    if (!category || !Object.values(FileCategory).includes(category)) {
      return NextResponse.json(
        { error: 'Invalid file category' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Additional rate limiting for large files (1MB+) - 5 per hour
    const fileSizeLimit = 1024 * 1024; // 1MB
    if (file.size >= fileSizeLimit) {
      const largeFileAllowed = await rateLimiter.check(`large-file-upload:${session.user.id}`);
      if (!largeFileAllowed) {
        return NextResponse.json(
          { error: 'Large file upload limit exceeded. Please try again later.' },
          { status: HTTP_STATUS.TOO_MANY_REQUESTS }
        );
      }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload file
    const uploadedFile = await fileUploadService.uploadFile(buffer, {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      userId: session.user.id,
      category,
      ...(description && { description }),
      isPrivate
    });

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded successfully',
        data: uploadedFile
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error uploading file:', error);
    }

    if (
      error instanceof Error &&
      (error.message.includes('File size exceeds') ||
        error.message.includes('File type') ||
        error.message.includes('security scan'))
    ) {
      return NextResponse.json({ error: error.message }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// GET /api/files/upload - Get upload limits and allowed types
export async function GET() {
  try {
    const limits = {
      CONSENT_FORM: { maxSize: '10MB', types: ['PDF', 'JPEG', 'PNG'] },
      INSURANCE: { maxSize: '5MB', types: ['PDF', 'JPEG', 'PNG'] },
      MEDICAL_RECORD: { maxSize: '20MB', types: ['PDF', 'JPEG', 'PNG', 'TXT'] },
      SESSION_NOTE: { maxSize: '5MB', types: ['PDF', 'TXT', 'DOC'] },
      ASSESSMENT: { maxSize: '15MB', types: ['PDF', 'JPEG', 'PNG'] },
      REPORT: { maxSize: '10MB', types: ['PDF', 'DOC', 'DOCX'] },
      OTHER: { maxSize: '10MB', types: ['PDF', 'JPEG', 'PNG', 'TXT'] }
    };

    return NextResponse.json({
      success: true,
      data: {
        limits,
        categories: Object.keys(limits),
        maxFilesPerUpload: 5,
        rateLimits: {
          uploadsPerHour: 10,
          totalStoragePerUser: '1GB'
        }
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting upload info:', error);
    }
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
