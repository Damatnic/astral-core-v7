import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../../../lib/db/prisma';
import { registerSchema } from '../../../../lib/types/auth';
import { audit } from '../../../../lib/security/audit';
import { rateLimiters } from '../../../../lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../../lib/constants/index';
import { encryption } from '../../../../lib/security/encryption';
import { logError } from '../../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for registration
    const identifier = rateLimiters.auth.getIdentifier(request);
    const { allowed } = await rateLimiters.auth.check(identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() }
    });

    if (existingUser) {
      await audit.logFailure('REGISTER', 'User', 'Email already exists', undefined, request);

      return NextResponse.json(
        { error: ERROR_MESSAGES.EMAIL_EXISTS },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Hash password
    const hashedPassword = await hash(validated.password, 12);

    // Create verification token
    const verificationToken = encryption.generateToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        name: validated.name,
        password: hashedPassword,
        role: 'CLIENT'
      }
    });

    // Create verification token record
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    await audit.logSuccess('REGISTER', 'User', user.id, { email: user.email }, user.id, request);

    // In production, send verification email here
    // await sendVerificationEmail(user.email, verificationToken);

    return NextResponse.json(
      {
        success: true,
        message: SUCCESS_MESSAGES.REGISTER,
        data: {
          id: user.id,
          email: user.email,
          name: user.name
        }
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

    logError('Registration error', error, 'auth-register');
    await audit.logError('REGISTER', 'User', error, undefined, request);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
