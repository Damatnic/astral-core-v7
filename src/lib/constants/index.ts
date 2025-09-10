export const APP_CONFIG = {
  name: process.env['NEXT_PUBLIC_APP_NAME'] || 'Astral Core',
  version: process.env['NEXT_PUBLIC_APP_VERSION'] || '7.0.0',
  url: process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
  supportEmail: 'support@astralcore.app',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  passwordResetExpiry: 24 * 60 * 60 * 1000, // 24 hours
};

export const ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
  },
  dashboard: {
    client: '/dashboard',
    therapist: '/therapist/dashboard',
    admin: '/admin/dashboard',
    crisis: '/crisis/dashboard',
  },
  profile: '/profile',
  settings: '/settings',
  wellness: '/wellness',
  appointments: '/appointments',
  messages: '/messages',
  crisis: '/crisis',
  journal: '/journal',
  resources: '/resources',
  support: '/support',
};

export const API_ROUTES = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    session: '/api/auth/session',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    changePassword: '/api/auth/change-password',
  },
  user: {
    profile: '/api/user/profile',
    settings: '/api/user/settings',
    notifications: '/api/user/notifications',
  },
  wellness: {
    data: '/api/wellness/data',
    stats: '/api/wellness/stats',
    patterns: '/api/wellness/patterns',
  },
  journal: {
    entries: '/api/journal/entries',
    tags: '/api/journal/tags',
  },
  appointments: {
    list: '/api/appointments',
    create: '/api/appointments/create',
    update: '/api/appointments/update',
    cancel: '/api/appointments/cancel',
  },
  crisis: {
    assess: '/api/crisis/assess',
    intervene: '/api/crisis/intervene',
    resources: '/api/crisis/resources',
  },
  therapist: {
    clients: '/api/therapist/clients',
    sessions: '/api/therapist/sessions',
    notes: '/api/therapist/session-notes',
    plans: '/api/therapist/treatment-plans',
  },
  admin: {
    users: '/api/admin/users',
    audit: '/api/admin/audit',
    stats: '/api/admin/stats',
  },
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to access this resource',
  FORBIDDEN: 'Access to this resource is forbidden',
  NOT_FOUND: 'The requested resource was not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'An account with this email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  SESSION_EXPIRED: 'Your session has expired. Please log in again',
  RATE_LIMIT: 'Too many requests. Please try again later',
  SERVER_ERROR: 'An unexpected error occurred. Please try again',
  VALIDATION_ERROR: 'Please check your input and try again',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed size',
  INVALID_FILE_TYPE: 'Invalid file type',
};

export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in',
  LOGOUT: 'Successfully logged out',
  REGISTER: 'Account created successfully',
  PASSWORD_RESET: 'Password has been reset successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  APPOINTMENT_CREATED: 'Appointment scheduled successfully',
  APPOINTMENT_CANCELLED: 'Appointment cancelled successfully',
  DATA_SAVED: 'Data saved successfully',
  EMAIL_SENT: 'Email sent successfully',
};

export const SPECIALIZATIONS = [
  'Anxiety Disorders',
  'Depression',
  'Trauma & PTSD',
  'Addiction',
  'Eating Disorders',
  'Bipolar Disorder',
  'Personality Disorders',
  'Relationship Issues',
  'Family Therapy',
  'Child & Adolescent',
  'Grief & Loss',
  'Stress Management',
  'Anger Management',
  'Self-Esteem',
  'Life Transitions',
  'Career Counseling',
  'LGBTQ+ Issues',
  'Cultural Issues',
  'Chronic Illness',
  'Pain Management',
];

export const SYMPTOMS = [
  'Anxiety',
  'Depression',
  'Panic attacks',
  'Insomnia',
  'Fatigue',
  'Irritability',
  'Difficulty concentrating',
  'Loss of interest',
  'Appetite changes',
  'Mood swings',
  'Social withdrawal',
  'Hopelessness',
  'Racing thoughts',
  'Physical pain',
  'Substance use',
  'Self-harm thoughts',
  'Suicidal thoughts',
];

export const COPING_STRATEGIES = [
  'Deep breathing',
  'Meditation',
  'Exercise',
  'Journaling',
  'Talking to someone',
  'Listening to music',
  'Taking a walk',
  'Reading',
  'Art/Creative activities',
  'Grounding techniques',
  'Progressive muscle relaxation',
  'Positive self-talk',
  'Seeking professional help',
  'Support groups',
  'Medication adherence',
];

export const INSURANCE_PROVIDERS = [
  'Aetna',
  'Blue Cross Blue Shield',
  'Cigna',
  'United Healthcare',
  'Humana',
  'Kaiser Permanente',
  'Anthem',
  'Molina Healthcare',
  'Medicare',
  'Medicaid',
  'Tricare',
  'Self-pay',
];

export const FILE_CATEGORIES = {
  CONSENT_FORM: 'Consent Form',
  INSURANCE: 'Insurance Document',
  MEDICAL_RECORD: 'Medical Record',
  SESSION_NOTE: 'Session Note',
  ASSESSMENT: 'Assessment',
  REPORT: 'Report',
  OTHER: 'Other',
};

export const ALLOWED_FILE_TYPES = {
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  images: ['image/jpeg', 'image/png', 'image/gif'],
  spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};