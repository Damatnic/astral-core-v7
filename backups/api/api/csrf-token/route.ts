import { NextRequest } from 'next/server';
import { handleCSRFTokenRequest } from '../../../lib/security/csrf';

/**
 * CSRF Token API Endpoint
 * Provides CSRF tokens for client-side applications
 * Used by SPAs to obtain valid CSRF tokens for protected requests
 */

export async function GET(request: NextRequest) {
  return handleCSRFTokenRequest(request);
}