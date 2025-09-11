import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplified middleware to fix deployment issues
export function middleware(_request: NextRequest) {
  // For now, just pass through all requests
  // This allows the deployment to succeed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};