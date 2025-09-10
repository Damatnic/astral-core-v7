import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { wellnessDataSchema } from '@/lib/types/wellness';
import { phiService } from '@/lib/security/phi-service';
import { audit } from '@/lib/security/audit';
import { rateLimiters } from '@/lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';
import prisma from '@/lib/db/prisma';
import { logError } from '@/lib/logger';

// GET /api/wellness/data - Get wellness data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: {
      userId: string;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = { userId: session.user.id };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      phiService.findMany(
        'WellnessData',
        {
          where,
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset
        },
        { userId: session.user.id, userRole: session.user.role }
      ),
      prisma.wellnessData.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: data,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    logError('Error fetching wellness data', error, 'wellness-data-get');
    await audit.logError('GET_WELLNESS_DATA', 'WellnessData', error);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST /api/wellness/data - Log wellness data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Rate limiting for wellness tracking
    const identifier = rateLimiters.wellness.getIdentifier(request);
    const { allowed } = await rateLimiters.wellness.check(identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    const body = await request.json();
    const validatedData = wellnessDataSchema.parse(body);

    // Set date to today if not provided
    const date = validatedData.date ? new Date(validatedData.date) : new Date();

    // Set to start of day for consistency
    date.setHours(0, 0, 0, 0);

    // Check if data already exists for this date
    const existingData = await prisma.wellnessData.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date
        }
      }
    });

    if (existingData) {
      // Update existing data
      const updated = await phiService.update(
        'WellnessData',
        { id: existingData.id },
        { ...validatedData, date },
        { userId: session.user.id, userRole: session.user.role }
      );

      return NextResponse.json({
        success: true,
        message: SUCCESS_MESSAGES.DATA_SAVED,
        data: updated
      });
    } else {
      // Create new data
      const created = await phiService.create(
        'WellnessData',
        {
          ...validatedData,
          userId: session.user.id,
          date
        },
        { userId: session.user.id, userRole: session.user.role }
      );

      return NextResponse.json(
        {
          success: true,
          message: SUCCESS_MESSAGES.DATA_SAVED,
          data: created
        },
        { status: HTTP_STATUS.CREATED }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error saving wellness data', error, 'wellness-data-post');
    await audit.logError('SAVE_WELLNESS_DATA', 'WellnessData', error);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE /api/wellness/data - Delete wellness data entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Verify ownership
    const data = await prisma.wellnessData.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!data) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    await phiService.delete(
      'WellnessData',
      { id },
      { userId: session.user.id, userRole: session.user.role }
    );

    return NextResponse.json({
      success: true,
      message: 'Wellness data deleted successfully'
    });
  } catch (error) {
    logError('Error deleting wellness data', error, 'wellness-data-delete');
    await audit.logError('DELETE_WELLNESS_DATA', 'WellnessData', error);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
