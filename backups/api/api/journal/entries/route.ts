import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '../../../../lib/auth/config';
import { journalEntrySchema } from '../../../../lib/types/wellness';
import { phiService } from '../../../../lib/security/phi-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../../lib/constants/index';
import prisma from '../../../../lib/db/prisma';
import { logError } from '../../../../lib/logger';

// GET /api/journal/entries - Get user's journal entries
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    const where: {
      userId: string;
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' };
        content?: { contains: string; mode: 'insensitive' };
      }>;
      tags?: { has: string };
    } = { userId: session.user.id };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { content: { contains: search, mode: 'insensitive' as const } }
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [entries, total] = await Promise.all([
      phiService.findMany(
        'JournalEntry',
        {
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        },
        { userId: session.user.id, userRole: session.user.role }
      ),
      prisma.journalEntry.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: entries,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    logError('Error fetching journal entries', error, 'API:journal/entries:GET');

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST /api/journal/entries - Create new journal entry
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
    const validated = journalEntrySchema.parse(body);

    const entry = await phiService.create(
      'JournalEntry',
      {
        ...validated,
        userId: session.user.id,
        attachments: []
      },
      { userId: session.user.id, userRole: session.user.role }
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Journal entry created successfully',
        data: entry
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error creating journal entry', error, 'API:journal/entries:POST');

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/journal/entries - Update journal entry
export async function PUT(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Verify ownership
    const existing = await prisma.journalEntry.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const body = await request.json();
    const validated = journalEntrySchema.partial().parse(body);

    const updated = await phiService.update('JournalEntry', { id }, validated, {
      userId: session.user.id,
      userRole: session.user.role
    });

    return NextResponse.json({
      success: true,
      message: 'Journal entry updated successfully',
      data: updated
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error updating journal entry', error, 'API:journal/entries:PUT');

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE /api/journal/entries - Delete journal entry
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
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Verify ownership
    const existing = await prisma.journalEntry.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    await phiService.delete(
      'JournalEntry',
      { id },
      { userId: session.user.id, userRole: session.user.role }
    );

    return NextResponse.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });
  } catch (error) {
    logError('Error deleting journal entry', error, 'API:journal/entries:DELETE');

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
