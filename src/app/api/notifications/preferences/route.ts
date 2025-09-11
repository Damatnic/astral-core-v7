import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { notificationService } from '@/lib/services/notification-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/index';
import { z } from 'zod';

const preferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  appointments: z.boolean().optional(),
  messages: z.boolean().optional(),
  wellness: z.boolean().optional(),
  crisis: z.boolean().optional()
});

// GET /api/notifications/preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const preferences = await notificationService.getNotificationPreferences(session.user.id);

    return NextResponse.json({
      success: true,
      data: preferences || {
        email: true,
        push: true,
        sms: false,
        appointments: true,
        messages: true,
        wellness: true,
        crisis: true
      }
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/notifications/preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const validated = preferencesSchema.parse(body);

    // Filter out undefined values for exactOptionalPropertyTypes compatibility
    const cleanedPreferences = Object.fromEntries(
      Object.entries(validated).filter(([, value]) => value !== undefined)
    ) as {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      appointments?: boolean;
      messages?: boolean;
      wellness?: boolean;
      crisis?: boolean;
    };

    const updated = await notificationService.updateNotificationPreferences(
      session.user.id,
      cleanedPreferences
    );

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      data: updated
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
