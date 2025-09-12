/**
 * Demo Account Utilities for Astral Core v7
 * Provides centralized management and security for demo accounts
 */

export interface DemoAccountInfo {
  role: string;
  email: string;
  password: string;
  name: string;
  description: string;
  features: string[];
}

// Demo account configurations with enhanced security
export const DEMO_ACCOUNT_INFO: Record<string, DemoAccountInfo> = {
  CLIENT: {
    role: 'CLIENT',
    email: 'client@demo.astralcore.com',
    password: process.env.DEMO_CLIENT_PASSWORD || 'GeneratedSecurePassword123!',
    name: 'Emma Johnson',
    description: 'Experience wellness tracking, journaling, and therapy scheduling as a patient',
    features: [
      'Personal wellness dashboard',
      'Mood and anxiety tracking',
      'Journal entries with mood tagging',
      'Appointment scheduling with therapists',
      'Crisis support resources',
      'Secure messaging with care team',
      'Progress visualization charts'
    ]
  },
  THERAPIST: {
    role: 'THERAPIST',
    email: 'therapist@demo.astralcore.com',
    password: process.env.DEMO_THERAPIST_PASSWORD || 'GeneratedSecureTherapist123!',
    name: 'Dr. Michael Thompson',
    description: 'Manage patients, create treatment plans, and conduct therapy sessions',
    features: [
      'Patient management dashboard',
      'Treatment plan creation and management',
      'Session notes and progress tracking',
      'Appointment scheduling and management',
      'Client wellness data review',
      'Crisis intervention tools',
      'Supervision and compliance features'
    ]
  },
  ADMIN: {
    role: 'ADMIN',
    email: 'admin@demo.astralcore.com',
    password: process.env.DEMO_ADMIN_PASSWORD || 'GeneratedSecureAdmin123!',
    name: 'Sarah Administrator',
    description: 'Access system dashboard, user management, and platform settings',
    features: [
      'System administration dashboard',
      'User account management',
      'Platform configuration settings',
      'Security and audit logs',
      'Performance monitoring',
      'Error tracking and resolution',
      'Compliance and reporting tools'
    ]
  },
  CRISIS_RESPONDER: {
    role: 'CRISIS_RESPONDER',
    email: 'crisis@demo.astralcore.com',
    password: process.env.DEMO_CRISIS_PASSWORD || 'GeneratedSecureCrisis123!',
    name: 'Alex Crisis-Response',
    description: 'Handle crisis interventions and emergency mental health support',
    features: [
      '24/7 crisis response dashboard',
      'Emergency assessment tools',
      'Priority communication channels',
      'Crisis resource management',
      'Emergency escalation protocols',
      'Follow-up tracking systems',
      'Crisis analytics and reporting'
    ]
  },
  SUPERVISOR: {
    role: 'SUPERVISOR',
    email: 'supervisor@demo.astralcore.com',
    password: process.env.DEMO_SUPERVISOR_PASSWORD || 'GeneratedSecureSupervisor123!',
    name: 'Dr. Rachel Supervisor',
    description: 'Oversee clinical operations and staff performance',
    features: [
      'Clinical supervision dashboard',
      'Quality assurance monitoring',
      'Staff performance reviews',
      'Treatment plan oversight',
      'Professional development tracking',
      'Compliance monitoring',
      'Supervision reporting tools'
    ]
  }
};

/**
 * Check if demo accounts are allowed in current environment
 */
export function areDemoAccountsAllowed(): boolean {
  // Allow in development and staging, or when explicitly enabled
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env['ALLOW_DEMO_ACCOUNTS'] === 'true' ||
    process.env['VERCEL_ENV'] === 'preview'
  );
}

/**
 * Get demo account by role
 */
export function getDemoAccountByRole(role: string): DemoAccountInfo | null {
  return DEMO_ACCOUNT_INFO[role] || null;
}

/**
 * Get all available demo accounts
 */
export function getAllDemoAccounts(): DemoAccountInfo[] {
  return Object.values(DEMO_ACCOUNT_INFO);
}

/**
 * Validate demo account credentials
 */
export function validateDemoCredentials(email: string, password: string): DemoAccountInfo | null {
  const account = Object.values(DEMO_ACCOUNT_INFO).find(
    acc => acc.email === email && acc.password === password
  );
  return account || null;
}

/**
 * Check if email is a demo account email
 */
export function isDemoAccountEmail(email: string): boolean {
  return Object.values(DEMO_ACCOUNT_INFO).some(acc => acc.email === email);
}

/**
 * Get demo account security headers for production
 */
export function getDemoSecurityHeaders(): Record<string, string> {
  return {
    'X-Demo-Account': 'true',
    'X-Environment': process.env.NODE_ENV || 'development',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff'
  };
}

/**
 * Generate demo account audit metadata
 */
export function getDemoAuditMetadata(role: string, userAgent?: string, ip?: string) {
  return {
    isDemoAccount: true,
    demoRole: role,
    environment: process.env.NODE_ENV,
    userAgent: userAgent?.substring(0, 100), // Limit length
    clientIP: ip,
    timestamp: new Date().toISOString(),
    allowedInProduction: process.env['ALLOW_DEMO_ACCOUNTS'] === 'true'
  };
}

/**
 * Demo account session configuration
 */
export const DEMO_SESSION_CONFIG = {
  // Shorter session for demo accounts in production
  maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 24 * 60 * 60, // 30 min in prod, 24h in dev
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  httpOnly: true
};

/**
 * Demo account rate limiting configuration
 */
export const DEMO_RATE_LIMITS = {
  // More restrictive limits for demo accounts
  loginAttempts: 10, // per hour
  apiCalls: 100, // per hour
  dataCreation: 20 // per hour
};

export default {
  DEMO_ACCOUNT_INFO,
  areDemoAccountsAllowed,
  getDemoAccountByRole,
  getAllDemoAccounts,
  validateDemoCredentials,
  isDemoAccountEmail,
  getDemoSecurityHeaders,
  getDemoAuditMetadata,
  DEMO_SESSION_CONFIG,
  DEMO_RATE_LIMITS
};