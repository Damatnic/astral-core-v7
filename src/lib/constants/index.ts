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
  LOGOUT: 'Logout successful'
};
