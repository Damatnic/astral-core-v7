/**
 * Type Helper Utilities
 * Common type utilities and guards for safe TypeScript compilation
 */

// Error handling utilities
export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error('Unknown error occurred');
};

// Safe property access for dynamic objects
export const safeGet = <T>(
  obj: Record<string, unknown> | undefined,
  key: string,
  defaultValue: T
): T => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  const value = obj[key];
  return value !== undefined ? (value as T) : defaultValue;
};

// Safe JSON value conversion for Prisma
export const toJsonValue = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
};

// Type guard for checking if value has required properties
export const hasProperty = <T extends string>(
  obj: unknown,
  prop: T
): obj is Record<T, unknown> => {
  return typeof obj === 'object' && obj !== null && prop in obj;
};

// Safe string conversion
export const toString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

// Safe number conversion
export const toNumber = (value: unknown, defaultValue = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

// Ensure value is defined
export const ensureDefined = <T>(value: T | undefined, fallback: T): T => {
  return value !== undefined ? value : fallback;
};

// Create partial update data with proper typing
export const createUpdateData = <T extends Record<string, unknown>>(
  updates: Partial<T>
): Partial<T> => {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  
  return result;
};
