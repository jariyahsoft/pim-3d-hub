import type { RequestContext } from '@pim/application'
import {
  createConversationService,
} from '@pim/application'
import type {
  ConversationContextType,
  ConversationMemberRepository,
  ConversationRepository,
  ConversationStatus,
  FileAssetAccessGrantRepository,
  FileAssetRepository,
  MessageRepository,
  ReadMarkerRepository,
  Uuidv7,
} from '@pim/domain'
import {
  conversationResponseSchema,
  createConversationRequestSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  markAsReadRequestSchema,
  messageResponseSchema,
  moderateMessageRequestSchema,
  sendMessageRequestSchema,
  uuidv7Schema,
  type ConversationResponse,
  type CreateConversationRequest,
  type ListConversationsQuery,
  type ListMessagesQuery,
  type MarkAsReadRequest,
  type MessageResponse,
  type ModerateMessageRequest,
  type SendMessageRequest,
} from '@pim/contracts'

export type ConversationController = ReturnType<typeof createConversationController>

export function createConversationController(deps: {
  conversationMemberRepository: ConversationMemberRepository
  conversationRepository: ConversationRepository
  fileAssetAccessGrantRepository: FileAssetAccessGrantRepository
  fileAssetRepository: FileAssetRepository
  messageRepository: MessageRepository
  now: () => Date
  readMarkerRepository: ReadMarkerRepository
}) {
  const service = createConversationService(deps)

  async function createConversation(
    ctx: RequestContext,
    input: CreateConversationRequest,
  ): Promise<ConversationResponse> {
    const parsed = createConversationRequestSchema.parse(input)

    const result = await service.createConversation(ctx.userId, {
      contextId: parsed.contextId as Uuidv7,
      contextType: parsed.contextType as ConversationContextType,
      participantUserIds: parsed.participantUserIds.map(id => id as Uuidv7),
      title: parsed.title,
    })

    return conversationResponseSchema.parse({
      contextId: result.contextId,
      contextType: result.contextType,
      createdAt: result.createdAt,
      id: result.id,
      lastMessageAt: result.lastMessageAt,
      lastMessagePreview: result.lastMessagePreview,
      participantCount: result.participantCount,
      status: result.status,
      title: result.title,
      unreadCount: result.unreadCount,
      updatedAt: result.updatedAt,
      version: result.version,
    })
  }

  async function getConversation(
    ctx: RequestContext,
    conversationId: string,
  ): Promise<ConversationResponse> {
    const parsedId = uuidv7Schema.parse(conversationId) as Uuidv7

    const result = await service.getConversation(ctx.userId, parsedId)

    return conversationResponseSchema.parse({
      contextId: result.contextId,
      contextType: result.contextType,
      createdAt: result.createdAt,
      id: result.id,
      lastMessageAt: result.lastMessageAt,
      lastMessagePreview: result.lastMessagePreview,
      participantCount: result.participantCount,
      status: result.status,
      title: result.title,
      unreadCount: result.unreadCount,
      updatedAt: result.updatedAt,
      version: result.version,
    })
  }

  async function listConversations(
    ctx: RequestContext,
    query: ListConversationsQuery,
  ): Promise<{ items: ConversationResponse[]; nextCursor: string | null }> {
    const parsed = listConversationsQuerySchema.parse(query)

    const result = await service.listConversations(ctx.userId, {
      contextId: parsed.contextId ? (parsed.contextId as Uuidv7) : undefined,
      contextType: parsed.contextType as ConversationContextType | undefined,
      cursor: parsed.cursor,
      limit: parsed.limit,
      sort: {
        direction: parsed.sortDirection,
        field: parsed.sortField,
      },
      status: parsed.status as ConversationStatus | undefined,
    })

    return {
      items: result.items.map((item) =>
        conversationResponseSchema.parse({
          contextId: item.contextId,
          contextType: item.contextType,
          createdAt: item.createdAt,
          id: item.id,
          lastMessageAt: item.lastMessageAt,
          lastMessagePreview: item.lastMessagePreview,
          participantCount: item.participantCount,
          status: item.status,
          title: item.title,
          unreadCount: item.unreadCount,
          updatedAt: item.updatedAt,
          version: item.version,
        }),
      ),
      nextCursor: result.nextCursor,
    }
  }

  async function sendMessage(
    ctx: RequestContext,
    conversationId: string,
    input: SendMessageRequest,
  ): Promise<MessageResponse> {
    const parsedId = uuidv7Schema.parse(conversationId) as Uuidv7
    const parsed = sendMessageRequestSchema.parse(input)

    const result = await service.sendMessage(ctx.userId, {
      attachmentAssetIds: parsed.attachmentAssetIds?.map(id => id as Uuidv7),
      conversationId: parsedId,
      replyToMessageId: parsed.replyToMessageId ? (parsed.replyToMessageId as Uuidv7) : undefined,
      textContent: parsed.textContent,
    })

    return messageResponseSchema.parse({
      attachmentAssetIds: result.attachmentAssetIds,
      conversationId: result.conversationId,
      createdAt: result.createdAt,
      editedAt: result.editedAt,
      hiddenAt: result.hiddenAt,
      id: result.id,
      isModerated: result.isModerated,
      replyToMessageId: result.replyToMessageId,
      senderId: result.senderId,
      status: result.status,
      textContent: result.textContent,
      updatedAt: result.updatedAt,
      version: result.version,
    })
  }

  async function listMessages(
    ctx: RequestContext,
    conversationId: string,
    query: ListMessagesQuery,
  ): Promise<{ items: MessageResponse[]; nextCursor: string | null }> {
    const parsedId = uuidv7Schema.parse(conversationId) as Uuidv7
    const parsed = listMessagesQuerySchema.parse(query)

    const result = await service.listMessages(ctx.userId, {
      conversationId: parsedId,
      cursor: parsed.cursor,
      limit: parsed.limit,
      sort: {
        direction: parsed.sortDirection,
        field: parsed.sortField,
      },
    })

    return {
      items: result.items.map((item) =>
        messageResponseSchema.parse({
          attachmentAssetIds: item.attachmentAssetIds,
          conversationId: item.conversationId,
          createdAt: item.createdAt,
          editedAt: item.editedAt,
          hiddenAt: item.hiddenAt,
          id: item.id,
          isModerated: item.isModerated,
          replyToMessageId: item.replyToMessageId,
          senderId: item.senderId,
          status: item.status,
          textContent: item.textContent,
          updatedAt: item.updatedAt,
          version: item.version,
        }),
      ),
      nextCursor: result.nextCursor,
    }
  }

  async function markAsRead(
    ctx: RequestContext,
    conversationId: string,
    input: MarkAsReadRequest,
  ): Promise<void> {
    const parsedId = uuidv7Schema.parse(conversationId) as Uuidv7
    const parsed = markAsReadRequestSchema.parse(input)

    await service.markAsRead(
      ctx.userId,
      parsedId,
      parsed.lastReadMessageId as Uuidv7,
    )
  }

  async function hideMessage(ctx: RequestContext, messageId: string): Promise<MessageResponse> {
    const parsedId = uuidv7Schema.parse(messageId) as Uuidv7

    const result = await service.hideMessage(ctx.userId, parsedId)

    return messageResponseSchema.parse({
      attachmentAssetIds: result.attachmentAssetIds,
      conversationId: result.conversationId,
      createdAt: result.createdAt,
      editedAt: result.editedAt,
      hiddenAt: result.hiddenAt,
      id: result.id,
      isModerated: result.isModerated,
      replyToMessageId: result.replyToMessageId,
      senderId: result.senderId,
      status: result.status,
      textContent: result.textContent,
      updatedAt: result.updatedAt,
      version: result.version,
    })
  }

  async function moderateMessage(
    ctx: RequestContext,
    messageId: string,
    input: ModerateMessageRequest,
  ): Promise<MessageResponse> {
    const parsedId = uuidv7Schema.parse(messageId) as Uuidv7
    const parsed = moderateMessageRequestSchema.parse(input)

    const result = await service.moderateMessage(ctx.userId, parsedId, parsed.reason)

    return messageResponseSchema.parse({
      attachmentAssetIds: result.attachmentAssetIds,
      conversationId: result.conversationId,
      createdAt: result.createdAt,
      editedAt: result.editedAt,
      hiddenAt: result.hiddenAt,
      id: result.id,
      isModerated: result.isModerated,
      replyToMessageId: result.replyToMessageId,
      senderId: result.senderId,
      status: result.status,
      textContent: result.textContent,
      updatedAt: result.updatedAt,
      version: result.version,
    })
  }

  return {
    createConversation,
    getConversation,
    hideMessage,
    listConversations,
    listMessages,
    markAsRead,
    moderateMessage,
    sendMessage,
  }
}
