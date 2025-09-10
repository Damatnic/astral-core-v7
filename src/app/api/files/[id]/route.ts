import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { fileUploadService } from '@/lib/services/file-upload-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';

// GET /api/files/[id] - Download a file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const fileId = params.id;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    const thumbnail = searchParams.get('thumbnail') === 'true';

    if (thumbnail) {
      // Handle thumbnail request
      return await handleThumbnail(fileId, session.user.id);
    }

    // Get file stream
    const { stream, filename, mimeType, size } = await fileUploadService.getFileStream(
      fileId,
      session.user.id
    );

    // Create response with proper headers
    const response = new NextResponse(stream as any);
    
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Content-Length', size.toString());
    
    if (download) {
      response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      response.headers.set('Content-Disposition', `inline; filename="${filename}"`);
    }

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    // Cache control for files
    response.headers.set('Cache-Control', 'private, max-age=3600');

    return response;

  } catch (error: any) {
    console.error('Error serving file:', error);
    
    if (error.message === 'File not found' || error.message === 'Access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE /api/files/[id] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const result = await fileUploadService.deleteFile(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting file:', error);
    
    if (error.message === 'File not found' || error.message === 'Access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

async function handleThumbnail(fileId: string, userId: string) {
  try {
    // This would serve the thumbnail file
    // For now, return a placeholder response
    return NextResponse.json(
      { error: 'Thumbnail service not implemented' },
      { status: HTTP_STATUS.NOT_IMPLEMENTED }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Thumbnail not available' },
      { status: HTTP_STATUS.NOT_FOUND }
    );
  }
}