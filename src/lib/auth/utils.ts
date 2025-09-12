import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './config';
import { ROUTES } from '../constants';
import type { User } from '@prisma/client';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.auth.login);
  }

  return user;
}

export async function requireRole(requiredRole: User['role'] | User['role'][]) {
  const user = await requireAuth();

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!roles.includes(user.role)) {
    redirect('/unauthorized');
  }

  return user;
}

export async function requireAdmin() {
  return requireRole('ADMIN');
}

export async function requireTherapist() {
  return requireRole('THERAPIST');
}

export async function requireCrisisResponder() {
  return requireRole(['CRISIS_RESPONDER', 'ADMIN']);
}

export function hasRole(
  userRole: User['role'],
  requiredRole: User['role'] | User['role'][]
): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole);
}

export function canAccessResource(
  userRole: User['role'],
  resourceOwnerId: string,
  currentUserId: string
): boolean {
  // Admins can access everything
  if (userRole === 'ADMIN') {
    return true;
  }

  // Users can access their own resources
  if (resourceOwnerId === currentUserId) {
    return true;
  }

  // Additional role-based checks can be added here

  return false;
}
