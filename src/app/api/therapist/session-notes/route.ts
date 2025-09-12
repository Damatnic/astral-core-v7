import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '../../../../lib/auth/config';
import { sessionNoteSchema } from '../../../../lib/types/therapy';
import { phiService } from '../../../../lib/security/phi-service';
import { audit } from '../../../../lib/security/audit';
import prisma from '../../../../lib/db/prisma';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../../lib/constants/index';

// Ensure user is a therapist
async function requireTherapist() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'THERAPIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Therapist access required');
  }

  return session.user;
}

// GET /api/therapist/session-notes
export async function GET(request: NextRequest) {
  try {
    const user = await requireTherapist();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const appointmentId = searchParams.get('appointmentId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get therapist profile
    const therapistProfile = await prisma.therapistProfile.findUnique({
      where: { userId: user.id }
    });

    if (!therapistProfile) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const where: {
      therapistId: string;
      clientId?: string;
      appointmentId?: string;
    } = { therapistId: therapistProfile.id };

    if (clientId) where.clientId = clientId;
    if (appointmentId) where.appointmentId = appointmentId;

    const [notes, total] = await Promise.all([
      phiService.findMany(
        'SessionNote',
        {
          where,
          include: {
            appointment: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            client: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            }
          },
          orderBy: { sessionDate: 'desc' },
          take: limit,
          skip: offset
        },
        { userId: user.id, userRole: user.role }
      ),
      prisma.sessionNote.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: notes,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < total
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: HTTP_STATUS.FORBIDDEN });
    }

    console.error('Error fetching session notes:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST /api/therapist/session-notes
export async function POST(request: NextRequest) {
  try {
    const user = await requireTherapist();
    const body = await request.json();
    const validated = sessionNoteSchema.parse(body);

    // Get therapist profile
    const therapistProfile = await prisma.therapistProfile.findUnique({
      where: { userId: user.id }
    });

    if (!therapistProfile) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Verify the appointment belongs to this therapist
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: validated.appointmentId,
        therapistId: user.id
      },
      include: {
        user: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Get client profile
    const clientProfile = await prisma.clientProfile.findFirst({
      where: {
        userId: appointment.userId,
        therapistId: therapistProfile.id
      }
    });

    if (!clientProfile) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Create session note with encryption
    const sessionNote = await phiService.create(
      'SessionNote',
      {
        ...validated,
        clientId: clientProfile.id,
        therapistId: therapistProfile.id,
        sessionDate: new Date(validated.sessionDate),
        isSigned: false
      },
      { userId: user.id, userRole: user.role, resourceType: 'SessionNote' }
    );

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'COMPLETED' }
    });

    await audit.logSuccess(
      'CREATE_SESSION_NOTE',
      'SessionNote',
      sessionNote.id,
      {
        clientId: clientProfile.id,
        appointmentId: appointment.id
      },
      user.id,
      request
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Session note created successfully',
        data: sessionNote
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    console.error('Error creating session note:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/therapist/session-notes - Update and sign notes
export async function PUT(request: NextRequest) {
  try {
    const user = await requireTherapist();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action'); // 'update' or 'sign'

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get therapist profile
    const therapistProfile = await prisma.therapistProfile.findUnique({
      where: { userId: user.id }
    });

    if (!therapistProfile) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Verify ownership
    const existingNote = await prisma.sessionNote.findFirst({
      where: {
        id,
        therapistId: therapistProfile.id
      }
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Session note not found or access denied' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (action === 'sign') {
      // Sign the note (make it immutable)
      const signed = await prisma.sessionNote.update({
        where: { id },
        data: {
          isSigned: true,
          signedAt: new Date()
        }
      });

      await audit.logSuccess(
        'SIGN_SESSION_NOTE',
        'SessionNote',
        id,
        { therapistId: therapistProfile.id },
        user.id,
        request
      );

      return NextResponse.json({
        success: true,
        message: 'Session note signed successfully',
        data: signed
      });
    } else {
      // Regular update (only if not signed)
      if (existingNote.isSigned) {
        return NextResponse.json(
          { error: 'Cannot modify signed session note' },
          { status: HTTP_STATUS.FORBIDDEN }
        );
      }

      const body = await request.json();
      const validated = sessionNoteSchema.partial().parse(body);

      const updated = await phiService.update('SessionNote', { id }, validated, {
        userId: user.id,
        userRole: user.role
      });

      return NextResponse.json({
        success: true,
        message: 'Session note updated successfully',
        data: updated
      });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    console.error('Error updating session note:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
