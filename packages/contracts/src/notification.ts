import { z } from 'zod'

// Notification schemas
export const notificationChannelSchema = z.enum(['IN_APP', 'EMAIL', 'PUSH', 'LINE'])

export const notificationCategorySchema = z.enum([
  'SECURITY',
  'TRANSACTION',
  'ORDER_UPDATE',
  'MESSAGE',
  'REVIEW',
  'MARKETING',
  'SYSTEM',
])

export const notificationStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED', 'SKIPPED'])

export const notificationPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])

export const endpointStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'REVOKED'])

export const registerEndpointRequestSchema = z.object({
  channel: notificationChannelSchema,
  endpoint: z.string().min(1).max(500),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const revokeEndpointRequestSchema = z.object({
  channel: notificationChannelSchema,
})

export const updatePreferencesRequestSchema = z.object({
  category: notificationCategorySchema,
  channelEmail: z.boolean().optional(),
  channelInApp: z.boolean().optional(),
  channelLine: z.boolean().optional(),
  channelPush: z.boolean().optional(),
})

export const notificationResponseSchema = z.object({
  category: notificationCategorySchema,
  channel: notificationChannelSchema,
  createdAt: z.string(),
  eventId: z.string(),
  id: z.string().uuid(),
  priority: notificationPrioritySchema,
  recipientUserId: z.string().uuid(),
  sentAt: z.string().nullable(),
  status: notificationStatusSchema,
  templateKey: z.string(),
})

export const notificationEndpointResponseSchema = z.object({
  channel: notificationChannelSchema,
  createdAt: z.string(),
  endpoint: z.string(),
  expiresAt: z.string().nullable(),
  id: z.string().uuid(),
  metadata: z.record(z.unknown()),
  status: endpointStatusSchema,
  updatedAt: z.string(),
  userId: z.string().uuid(),
  version: z.number().int().min(1),
})

export const notificationPreferenceResponseSchema = z.object({
  category: notificationCategorySchema,
  channelEmail: z.boolean(),
  channelInApp: z.boolean(),
  channelLine: z.boolean(),
  channelPush: z.boolean(),
  createdAt: z.string(),
  id: z.string().uuid(),
  updatedAt: z.string(),
  userId: z.string().uuid(),
  version: z.number().int().min(1),
})

export const listNotificationsQuerySchema = z.object({
  category: notificationCategorySchema.optional(),
  channel: notificationChannelSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  sortField: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  status: notificationStatusSchema.optional(),
})

export const listEndpointsQuerySchema = z.object({
  channel: notificationChannelSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  status: endpointStatusSchema.optional(),
})

export const listPreferencesQuerySchema = z.object({
  category: notificationCategorySchema.optional(),
})

export type RegisterEndpointRequest = z.infer<typeof registerEndpointRequestSchema>
export type RevokeEndpointRequest = z.infer<typeof revokeEndpointRequestSchema>
export type UpdatePreferencesRequest = z.infer<typeof updatePreferencesRequestSchema>
export type NotificationResponse = z.infer<typeof notificationResponseSchema>
export type NotificationEndpointResponse = z.infer<typeof notificationEndpointResponseSchema>
export type NotificationPreferenceResponse = z.infer<typeof notificationPreferenceResponseSchema>
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
export type ListEndpointsQuery = z.infer<typeof listEndpointsQuerySchema>
export type ListPreferencesQuery = z.infer<typeof listPreferencesQuerySchema>
