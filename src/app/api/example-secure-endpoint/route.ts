/**
 * Example Secure API Endpoint
 * Demonstrates implementation of all security features
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import {
  validateInput,
  journalEntrySchema,
  sanitizeHtml,
  preventXss
} from '@/lib/validation/api-schemas';
import { applyRateLimit } from '@/lib/security/rate-limiter-config';
import { validateSession } from '@/lib/security/session-manager';
import { audit } from '@/lib/security';
import { enhancedPHIService, PHIAccessReason } from '@/lib/security/phi-enhanced';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

// Request schema for this endpoint
const requestSchema = z.object({
  title: z.string().max(200).transform(sanitizeHtml),
  content: z.string().min(1).max(10000).transform(sanitizeHtml),
  mood: z.number().min(1).max(10).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isPrivate: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 'wellness:journal');
    if (rateLimitResponse && rateLimitResponse.status === 429) {
      await audit.logWarning(
        'RATE_LIMIT',
        'JournalEntry',
        'Rate limit exceeded',
        { ip: request.ip },
        undefined,
        request
      );
      return rateLimitResponse;
    }
    
    // 2. Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      await audit.logFailure(
        'UNAUTHORIZED_ACCESS',
        'JournalEntry',
        'No session found',
        undefined,
        request
      );
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 3. Validate session security
    const sessionId = request.cookies.get('session')?.value;
    if (sessionId) {
      const validSession = await validateSession(sessionId, request);
      if (!validSession) {
        await audit.logWarning(
          'SESSION_INVALID',
          'JournalEntry',
          'Invalid or expired session',
          { userId: session.user.id },
          session.user.id,
          request
        );
        
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
      }
    }
    
    // 4. Parse and validate input
    const body = await request.json();
    const validation = validateInput(requestSchema, body);
    
    if (!validation.success) {
      await audit.logFailure(
        'VALIDATION_ERROR',
        'JournalEntry',
        'Input validation failed',
        { errors: validation.errors.errors },
        session.user.id,
        request
      );
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }
    
    const validatedData = validation.data;
    
    // 5. Check PHI access permissions
    const phiValidation = await enhancedPHIService.validateAccessRequest(
      session.user.id,
      session.user.id, // Accessing own data
      PHIAccessReason.TREATMENT,
      ['journal_entries']
    );
    
    if (!phiValidation.allowed) {
      await audit.logFailure(
        'PHI_ACCESS_DENIED',
        'JournalEntry',
        phiValidation.reason || 'Access denied',
        { userId: session.user.id },
        session.user.id,
        request
      );
      
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // 6. Check for MFA requirement
    if (phiValidation.requiresMFA && !session.user.mfaVerified) {
      return NextResponse.json(
        { 
          error: 'MFA required',
          mfaRequired: true 
        },
        { status: 403 }
      );
    }
    
    // 7. Sanitize content for XSS prevention
    const sanitizedContent = {
      ...validatedData,
      title: validatedData.title ? preventXss(validatedData.title) : undefined,
      content: preventXss(validatedData.content),
      tags: validatedData.tags?.map(tag => preventXss(tag)),
    };
    
    // 8. Create journal entry with PHI encryption
    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        title: sanitizedContent.title,
        content: sanitizedContent.content, // Will be encrypted by PHI service
        mood: sanitizedContent.mood,
        tags: sanitizedContent.tags || [],
        isPrivate: sanitizedContent.isPrivate,
      },
    });
    
    // 9. Record PHI access for audit
    await enhancedPHIService.recordDisclosure({
      patientId: session.user.id,
      disclosedTo: session.user.id,
      disclosedBy: session.user.id,
      reason: PHIAccessReason.TREATMENT,
      dataTypes: ['journal_entry'],
      purpose: 'Create journal entry',
      timestamp: new Date(),
    });
    
    // 10. Log successful operation
    await audit.logSuccess(
      'CREATE',
      'JournalEntry',
      entry.id,
      { 
        mood: entry.mood,
        tagsCount: entry.tags.length,
        isPrivate: entry.isPrivate
      },
      session.user.id,
      request
    );
    
    // 11. Return sanitized response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: entry.id,
          createdAt: entry.createdAt,
          mood: entry.mood,
          // Don't return content in response for privacy
        }
      },
      { 
        status: 201,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        }
      }
    );
    
  } catch (error) {
    // 12. Handle errors securely
    console.error('Secure endpoint error:', {
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
      // Don't log sensitive data
    });
    
    await audit.logError(
      'ERROR',
      'JournalEntry',
      error,
      session?.user?.id,
      request
    );
    
    // Return generic error to prevent information leakage
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting for read operations
    const rateLimitResponse = await applyRateLimit(request, 'api:read');
    if (rateLimitResponse && rateLimitResponse.status === 429) {
      return rateLimitResponse;
    }
    
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse query parameters with validation
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    
    // Validate sort field to prevent injection
    const allowedSortFields = ['createdAt', 'updatedAt', 'mood'];
    if (!allowedSortFields.includes(sortBy)) {
      return NextResponse.json(
        { error: 'Invalid sort field' },
        { status: 400 }
      );
    }
    
    // Check PHI access permissions
    const phiValidation = await enhancedPHIService.validateAccessRequest(
      session.user.id,
      session.user.id,
      PHIAccessReason.TREATMENT,
      ['journal_entries']
    );
    
    if (!phiValidation.allowed) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Fetch entries with pagination
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          title: true,
          mood: true,
          tags: true,
          isPrivate: true,
          createdAt: true,
          updatedAt: true,
          // Don't include content in list view
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.journalEntry.count({
        where: { userId: session.user.id },
      }),
    ]);
    
    // Log access
    await audit.logInfo(
      'READ',
      'JournalEntry',
      `Listed ${entries.length} entries`,
      { page, limit },
      session.user.id,
      request
    );
    
    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error('List endpoint error:', error);
    
    return NextResponse.json(
      { error: 'An error occurred fetching entries' },
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}