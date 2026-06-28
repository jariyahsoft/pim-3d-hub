import { z } from 'zod'

// Conversation schemas
export const conversationContextTypeSchema = z.enum([
  'SERVICE_REQUEST',
  'ORDER',
  'ORGANIZATION',
  'DIRECT',
])

export const conversationStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'CLOSED'])

export const messageStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'HIDDEN',
  'MODERATED',
])

export const createConversationRequestSchema = z.object({
  contextId: z.string().uuid(),
  contextType: conversationContextTypeSchema,
  participantUserIds: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(200),
})

export const conversationResponseSchema = z.object({
  contextId: z.string().uuid(),
  contextType: conversationContextTypeSchema,
  createdAt: z.string(),
  id: z.string().uuid(),
  lastMessageAt: z.string().nullable(),
  lastMessagePreview: z.string().nullable(),
  participantCount: z.number().int().min(0),
  status: conversationStatusSchema,
  title: z.string(),
  unreadCount: z.number().int().min(0),
  updatedAt: z.string(),
  version: z.number().int().min(1),
})

export const sendMessageRequestSchema = z.object({
  attachmentAssetIds: z.array(z.string().uuid()).max(10).optional(),
  replyToMessageId: z.string().uuid().optional(),
  textContent: z.string().min(1).max(10000),
})

export const messageResponseSchema = z.object({
  attachmentAssetIds: z.array(z.string().uuid()),
  conversationId: z.string().uuid(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  hiddenAt: z.string().nullable(),
  id: z.string().uuid(),
  isModerated: z.boolean(),
  replyToMessageId: z.string().uuid().nullable(),
  senderId: z.string().uuid(),
  status: messageStatusSchema,
  textContent: z.string(),
  updatedAt: z.string(),
  version: z.number().int().min(1),
})

export const markAsReadRequestSchema = z.object({
  lastReadMessageId: z.string().uuid(),
})

export const moderateMessageRequestSchema = z.object({
  reason: z.string().min(1).max(500),
})

export const listConversationsQuerySchema = z.object({
  contextId: z.string().uuid().optional(),
  contextType: conversationContextTypeSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  sortField: z.enum(['createdAt', 'lastMessageAt', 'updatedAt']).default('lastMessageAt'),
  status: conversationStatusSchema.optional(),
})

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
  sortField: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
})

export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>
export type ConversationResponse = z.infer<typeof conversationResponseSchema>
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>
export type MessageResponse = z.infer<typeof messageResponseSchema>
export type MarkAsReadRequest = z.infer<typeof markAsReadRequestSchema>
export type ModerateMessageRequest = z.infer<typeof moderateMessageRequestSchema>
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
