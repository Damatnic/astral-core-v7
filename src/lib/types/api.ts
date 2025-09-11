import { z } from 'zod';

// =====================
// CORE API TYPES
// =====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: unknown;
}

export type ApiError = {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

// =====================
// ZOD VALIDATION SCHEMAS
// =====================

// Base query schemas
export const paginationSchema = z.object({
  page: z.string().transform(val => Math.max(parseInt(val) || 1, 1)).optional(),
  limit: z.string().transform(val => Math.min(Math.max(parseInt(val) || 10, 1), 100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const filterSchema = z.object({
  search: z.string().max(200, 'Search term too long').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.string().optional()
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

// File upload schemas
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().min(1, 'File size must be greater than 0').max(50 * 1024 * 1024, 'File size too large (max 50MB)'),
  description: z.string().max(500, 'Description too long').optional(),
  isPrivate: z.boolean().default(true),
  category: z.enum(['DOCUMENT', 'IMAGE', 'AUDIO', 'VIDEO', 'OTHER']).default('DOCUMENT')
});

// Notification schemas
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  appointmentReminders: z.boolean(),
  weeklyReports: z.boolean(),
  crisisAlerts: z.boolean(),
  marketingEmails: z.boolean()
});

export const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  type: z.enum(['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'REMINDER']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  category: z.enum(['APPOINTMENT', 'PAYMENT', 'CRISIS', 'WELLNESS', 'SYSTEM']),
  actionUrl: z.string().url().optional(),
  scheduledFor: z.string().datetime().or(z.date()).optional(),
  expiresAt: z.string().datetime().or(z.date()).optional()
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  metric: z.enum(['sessions', 'users', 'payments', 'appointments', 'crisis_events']),
  timeframe: z.enum(['24h', '7d', '30d', '90d', '1y']),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
  filters: z.record(z.string(), z.string()).optional()
});

// Bulk operation schemas
export const bulkOperationSchema = z.object({
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE', 'ARCHIVE']),
  entityType: z.string().min(1, 'Entity type is required'),
  entityIds: z.array(z.string().min(1)).min(1, 'At least one entity ID is required').max(100, 'Too many entities (max 100)'),
  data: z.record(z.string(), z.any()).optional()
});

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
  type: z.enum(['USERS', 'APPOINTMENTS', 'NOTES', 'FILES', 'TREATMENTS']).optional(),
  filters: z.record(z.string(), z.string()).optional(),
  limit: z.number().min(1).max(50).default(10),
  exact: z.boolean().default(false)
});

// =====================
// RESPONSE TYPES
// =====================

export interface FileUploadResponse {
  success: boolean;
  file?: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
  };
  message: string;
  error?: string;
}

export interface NotificationResponse {
  success: boolean;
  notification?: {
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    read: boolean;
    createdAt: string;
  };
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    read: boolean;
    createdAt: string;
  }>;
  total?: number;
  unreadCount?: number;
  message: string;
  error?: string;
}

export interface AnalyticsResponse {
  success: boolean;
  data?: {
    metric: string;
    timeframe: string;
    values: Array<{
      timestamp: string;
      value: number;
      label?: string;
    }>;
    summary: {
      total: number;
      average: number;
      change: number;
      changePercent: number;
    };
  };
  message: string;
  error?: string;
}

export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    entityId: string;
    error: string;
  }>;
  message: string;
}

export interface SearchResponse {
  success: boolean;
  results?: Array<{
    id: string;
    type: string;
    title: string;
    snippet: string;
    relevance: number;
    url?: string;
    metadata?: Record<string, unknown>;
  }>;
  total: number;
  took: number; // milliseconds
  message: string;
  error?: string;
}

// Type inference from schemas
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type FilterQuery = z.infer<typeof filterSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type BulkOperationInput = z.infer<typeof bulkOperationSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;
