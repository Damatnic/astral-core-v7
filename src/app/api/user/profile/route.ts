import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { profileSchema } from '@/lib/types/user';
import { audit } from '@/lib/security/audit';
import { phiService } from '@/lib/security/phi-service';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';
import { logError } from '@/lib/logger';

// GET /api/user/profile - Get current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const profile = await phiService.findUnique(
      'Profile',
      { userId: session.user.id },
      { userId: session.user.id, userRole: session.user.role }
    );

    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: HTTP_STATUS.NOT_FOUND });
    }

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logError('Error fetching profile', error, 'user-profile-get');
    await audit.logError('GET_PROFILE', 'Profile', error);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST /api/user/profile - Create user profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    const body = await request.json();
    const validatedData = profileSchema.parse(body);

    // Convert date string to Date object
    const profileData = {
      ...validatedData,
      userId: session.user.id,
      dateOfBirth: new Date(validatedData.dateOfBirth),
      emergencyContact: validatedData.emergencyContact || undefined
    };

    const profile = await phiService.create('Profile', profileData, {
      userId: session.user.id,
      userRole: session.user.role
    });

    return NextResponse.json(
      {
        success: true,
        message: SUCCESS_MESSAGES.PROFILE_UPDATED,
        data: profile
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

    logError('Error creating profile', error, 'user-profile-post');
    await audit.logError('CREATE_PROFILE', 'Profile', error);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/user/profile - Update user profile
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
    const validatedData = profileSchema.partial().parse(body);

    // Filter out undefined values and convert date for exactOptionalPropertyTypes
    const updateData: Partial<z.infer<typeof profileSchema> & { dateOfBirth?: Date }> = {};

    if (validatedData.firstName) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName) updateData.lastName = validatedData.lastName;
    if (validatedData.phoneNumber) updateData.phoneNumber = validatedData.phoneNumber;
    if (validatedData.address) updateData.address = validatedData.address;
    if (validatedData.city) updateData.city = validatedData.city;
    if (validatedData.state) updateData.state = validatedData.state;
    if (validatedData.zipCode) updateData.zipCode = validatedData.zipCode;
    if (validatedData.country) updateData.country = validatedData.country;
    if (validatedData.emergencyContact)
      updateData.emergencyContact = validatedData.emergencyContact;
    if (validatedData.dateOfBirth) {
      updateData.dateOfBirth = new Date(validatedData.dateOfBirth);
    }

    const profile = await phiService.update('Profile', { userId: session.user.id }, updateData, {
      userId: session.user.id,
      userRole: session.user.role
    });

    return NextResponse.json({
      success: true,
      message: SUCCESS_MESSAGES.PROFILE_UPDATED,
      data: profile
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error updating profile', error, 'user-profile-put');
    await audit.logError('UPDATE_PROFILE', 'Profile', error);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE /api/user/profile - Delete user profile (GDPR compliance)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Delete all user data (GDPR right to erasure)
    await phiService.deleteUserData(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'All user data has been deleted'
    });
  } catch (error) {
    logError('Error deleting user data', error, 'user-profile-delete');
    await audit.logError('DELETE_USER_DATA', 'User', error);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
