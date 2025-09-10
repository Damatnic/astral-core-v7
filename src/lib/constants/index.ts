export const APP_CONFIG = {
  name: 'Astral Core',
  version: '0.1.0',
  description:
    'Secure HIPAA-compliant mental health platform providing therapy, wellness tracking, and crisis support services.',
  environment: process.env.NODE_ENV || 'development',
  features: {
    aiTherapy: process.env['ENABLE_AI_THERAPY'] === 'true',
    crisisDetection: process.env['ENABLE_CRISIS_DETECTION'] === 'true',
    peerSupport: process.env['ENABLE_PEER_SUPPORT'] === 'true',
    professionalServices: process.env['ENABLE_PROFESSIONAL_SERVICES'] === 'true',
    offlineMode: process.env['ENABLE_OFFLINE_MODE'] === 'true'
  }
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
  EMAIL_EXISTS: 'Email already exists',
  RATE_LIMIT: 'Too many requests, please try again later',
  NOT_FOUND: 'Not found'
};

export const SUCCESS_MESSAGES = {
  REGISTER: 'Registration successful',
  LOGIN: 'Login successful',
  LOGOUT: 'Logout successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  DATA_SAVED: 'Data saved successfully'
};

export const ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password'
  },
  dashboard: {
    home: '/dashboard',
    profile: '/dashboard/profile',
    settings: '/dashboard/settings'
  },
  wellness: {
    home: '/wellness',
    mood: '/wellness/mood',
    journal: '/wellness/journal'
  },
  crisis: {
    assessment: '/crisis/assessment',
    resources: '/crisis/resources'
  }
};
