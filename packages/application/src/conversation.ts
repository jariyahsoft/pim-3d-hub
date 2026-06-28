import type {
  ConversationContextType,
  ConversationFilter as _ConversationFilter,
  ConversationMemberFilter as _ConversationMemberFilter,
  ConversationMemberRecord as _ConversationMemberRecord,
  ConversationMemberRepository,
  ConversationRecord,
  ConversationRepository,
  ConversationSortField,
  ConversationStatus,
  CreateConversationInput,
  CreateConversationMemberInput,
  CreateMessageInput,
  CreateReadMarkerInput,
  MessageFilter,
  MessageRecord,
  MessageRepository,
  MessageSortField,
  MessageStatus,
  ReadMarkerRecord as _ReadMarkerRecord,
  ReadMarkerRepository,
  RepositoryListPage,
  RepositoryCursor,
  SortDirection,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'
import type { FileAssetAccessGrantRepository, FileAssetRepository } from '@pim/domain'
import { AuthorizationDeniedError, InvalidRequestError } from './errors.js'

const MAX_MESSAGE_LENGTH = 10000
const MAX_ATTACHMENTS_PER_MESSAGE = 10

export type ConversationService = ReturnType<typeof createConversationService>

export type ConversationListRequest = Readonly<{
  contextId?: Uuidv7
  contextType?: ConversationContextType
  cursor?: RepositoryCursor
  limit?: number
  sort?: {
    direction?: SortDirection
    field?: ConversationSortField
  }
  status?: ConversationStatus
  userId?: Uuidv7
}>

export type MessageListRequest = Readonly<{
  conversationId: Uuidv7
  cursor?: RepositoryCursor
  limit?: number
  sort?: {
    direction?: SortDirection
    field?: MessageSortField
  }
}>

export type ConversationDto = Readonly<{
  contextId: Uuidv7
  contextType: ConversationContextType
  createdAt: UtcTimestamp
  id: Uuidv7
  lastMessageAt: UtcTimestamp | null
  lastMessagePreview: string | null
  participantCount: number
  status: ConversationStatus
  title: string
  unreadCount: number
  updatedAt: UtcTimestamp
  version: number
}>

export type MessageDto = Readonly<{
  attachmentAssetIds: readonly Uuidv7[]
  conversationId: Uuidv7
  createdAt: UtcTimestamp
  editedAt: UtcTimestamp | null
  hiddenAt: UtcTimestamp | null
  id: Uuidv7
  isModerated: boolean
  replyToMessageId: Uuidv7 | null
  senderId: Uuidv7
  status: MessageStatus
  textContent: string
  updatedAt: UtcTimestamp
  version: number
}>

export type ConversationMemberDto = Readonly<{
  conversationId: Uuidv7
  id: Uuidv7
  isActive: boolean
  joinedAt: UtcTimestamp
  lastReadAt: UtcTimestamp | null
  role: string
  unreadCount: number
  userId: Uuidv7
}>

export function createConversationService(deps: {
  conversationMemberRepository: ConversationMemberRepository
  conversationRepository: ConversationRepository
  fileAssetAccessGrantRepository: FileAssetAccessGrantRepository
  fileAssetRepository: FileAssetRepository
  messageRepository: MessageRepository
  now: () => Date
  readMarkerRepository: ReadMarkerRepository
}) {
  const {
    conversationMemberRepository,
    conversationRepository,
    fileAssetAccessGrantRepository,
    fileAssetRepository,
    messageRepository,
    now,
    readMarkerRepository,
  } = deps

  async function createConversation(
    actorId: Uuidv7,
    input: Readonly<{
      contextId: Uuidv7
      contextType: ConversationContextType
      participantUserIds: readonly Uuidv7[]
      title: string
    }>,
  ): Promise<ConversationDto> {
    if (!input.title.trim()) {
      throw new InvalidRequestError('Conversation title is required')
    }

    if (input.participantUserIds.length === 0) {
      throw new InvalidRequestError('At least one participant is required')
    }

    if (input.participantUserIds.length > 50) {
      throw new InvalidRequestError('Maximum 50 participants allowed')
    }

    // Check if conversation already exists for this context
    const existing = await conversationRepository.findByContextId(
      input.contextId,
      input.contextType,
    )

    if (existing) {
      return toConversationDto(existing)
    }

    const conversationInput: CreateConversationInput = {
      contextId: input.contextId,
      contextType: input.contextType,
      createdBy: actorId,
      participantCount: input.participantUserIds.length,
      status: 'ACTIVE',
      title: input.title.trim(),
      updatedBy: actorId,
    }

    const conversation = await conversationRepository.create(conversationInput)

    // Add participants
    await Promise.all(
      input.participantUserIds.map((userId) => {
        const memberInput: CreateConversationMemberInput = {
          conversationId: conversation.id,
          createdBy: actorId,
          isActive: true,
          role: 'PARTICIPANT',
          updatedBy: actorId,
          userId,
        }
        return conversationMemberRepository.create(memberInput)
      }),
    )

    return toConversationDto(conversation)
  }

  async function getConversation(actorId: Uuidv7, conversationId: Uuidv7): Promise<ConversationDto> {
    const conversation = await conversationRepository.findById(conversationId)

    if (!conversation) {
      throw new InvalidRequestError('Conversation not found')
    }

    // Verify membership
    const membership = await conversationMemberRepository.findByConversationAndUser(
      conversationId,
      actorId,
    )

    if (!membership || !membership.isActive) {
      throw new AuthorizationDeniedError('Not a conversation participant')
    }

    return toConversationDto(conversation)
  }

  async function listConversations(
    actorId: Uuidv7,
    request: ConversationListRequest,
  ): Promise<RepositoryListPage<ConversationDto>> {
    // Build filter object without readonly property assignment
    const filterObj: {
      contextId?: Uuidv7
      contextType?: ConversationContextType
      status?: ConversationStatus
      userId?: Uuidv7
    } = {
      userId: actorId, // Only show conversations where actor is a member
    }

    if (request.contextId !== undefined) {
      filterObj.contextId = request.contextId
    }
    if (request.contextType !== undefined) {
      filterObj.contextType = request.contextType
    }
    if (request.status !== undefined) {
      filterObj.status = request.status
    }

    const page = await conversationRepository.list({
      ...(request.cursor ? { cursor: request.cursor } : {}),
      filter: filterObj,
      limit: Math.min(request.limit ?? 50, 100),
      sort: {
        direction: request.sort?.direction ?? 'desc',
        field: request.sort?.field ?? 'lastMessageAt',
      },
    })

    return {
      items: page.items.map(toConversationDto),
      nextCursor: page.nextCursor,
    }
  }

  async function sendMessage(
    actorId: Uuidv7,
    input: Readonly<{
      attachmentAssetIds?: readonly Uuidv7[]
      conversationId: Uuidv7
      replyToMessageId?: Uuidv7
      textContent: string
    }>,
  ): Promise<MessageDto> {
    // Sanitize text content
    const sanitized = sanitizeMessageText(input.textContent)

    if (!sanitized.trim()) {
      throw new InvalidRequestError('Message text is required')
    }

    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      throw new InvalidRequestError(
        `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      )
    }

    if (input.attachmentAssetIds && input.attachmentAssetIds.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new InvalidRequestError(
        `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments allowed per message`,
      )
    }

    // Verify conversation membership
    const membership = await conversationMemberRepository.findByConversationAndUser(
      input.conversationId,
      actorId,
    )

    if (!membership || !membership.isActive) {
      throw new AuthorizationDeniedError('Not an active conversation participant')
    }

    // Verify conversation is active
    const conversation = await conversationRepository.findById(input.conversationId)

    if (!conversation) {
      throw new InvalidRequestError('Conversation not found')
    }

    if (conversation.status !== 'ACTIVE') {
      throw new InvalidRequestError('Cannot send messages to inactive conversation')
    }

    // Verify attachment assets exist and actor has permission
    const attachmentIds = input.attachmentAssetIds ?? []

    // Verify attachment permissions
    for (const assetId of attachmentIds) {
      const asset = await fileAssetRepository.findById(assetId)

      if (!asset) {
        throw new InvalidRequestError(`Attachment asset ${assetId} not found`)
      }

      // Check if actor owns the asset
      if (asset.ownerUserId !== actorId) {
        // Check if actor has a grant
        const grants = await fileAssetAccessGrantRepository.list({
          filter: { assetId, granteeUserId: actorId },
          limit: 1,
          sort: { direction: 'desc', field: 'createdAt' },
        })

        const hasActiveGrant = grants.items.some(
          (g) =>
            !g.revokedAt &&
            (!g.expiresAt || new Date(g.expiresAt) > now()),
        )

        if (!hasActiveGrant) {
          throw new AuthorizationDeniedError(
            `No permission to attach asset ${assetId}`,
          )
        }
      }
    }

    // Create message
    const messageInput: CreateMessageInput = {
      attachmentAssetIds: attachmentIds,
      conversationId: input.conversationId,
      createdBy: actorId,
      ...(input.replyToMessageId ? { replyToMessageId: input.replyToMessageId } : {}),
      senderId: actorId,
      status: 'SENT',
      textContent: sanitized,
      updatedBy: actorId,
    }

    const message = await messageRepository.create(messageInput)

    // Update conversation last message
    await conversationRepository.update(conversation.id, conversation.version, {
      lastMessageAt: message.createdAt,
      lastMessagePreview: sanitized.substring(0, 200),
    })

    return toMessageDto(message)
  }

  async function listMessages(
    actorId: Uuidv7,
    request: MessageListRequest,
  ): Promise<RepositoryListPage<MessageDto>> {
    // Verify membership
    const membership = await conversationMemberRepository.findByConversationAndUser(
      request.conversationId,
      actorId,
    )

    if (!membership || !membership.isActive) {
      throw new AuthorizationDeniedError('Not a conversation participant')
    }

    const filter: MessageFilter = {
      conversationId: request.conversationId,
    }

    const page = await messageRepository.list({
      ...(request.cursor ? { cursor: request.cursor } : {}),
      filter,
      limit: Math.min(request.limit ?? 50, 100),
      sort: {
        direction: request.sort?.direction ?? 'asc',
        field: request.sort?.field ?? 'createdAt',
      },
    })

    return {
      items: page.items.map(toMessageDto),
      nextCursor: page.nextCursor,
    }
  }

  async function markAsRead(
    actorId: Uuidv7,
    conversationId: Uuidv7,
    lastReadMessageId: Uuidv7,
  ): Promise<void> {
    // Verify membership
    const membership = await conversationMemberRepository.findByConversationAndUser(
      conversationId,
      actorId,
    )

    if (!membership || !membership.isActive) {
      throw new AuthorizationDeniedError('Not a conversation participant')
    }

    // Verify message belongs to conversation
    const message = await messageRepository.findById(lastReadMessageId)

    if (!message || message.conversationId !== conversationId) {
      throw new InvalidRequestError('Message not found in conversation')
    }

    const existingMarker = await readMarkerRepository.findByConversationAndUser(
      conversationId,
      actorId,
    )

    if (existingMarker) {
      await readMarkerRepository.update(existingMarker.id, existingMarker.version, {
        lastReadAt: message.createdAt,
        lastReadMessageId,
      })
    } else {
      const markerInput: CreateReadMarkerInput = {
        conversationId,
        createdBy: actorId,
        lastReadAt: message.createdAt,
        lastReadMessageId,
        updatedBy: actorId,
        userId: actorId,
      }
      await readMarkerRepository.create(markerInput)
    }
  }

  async function hideMessage(
    actorId: Uuidv7,
    messageId: Uuidv7,
  ): Promise<MessageDto> {
    const message = await messageRepository.findById(messageId)

    if (!message) {
      throw new InvalidRequestError('Message not found')
    }

    // Only sender can hide their own message
    if (message.senderId !== actorId) {
      throw new AuthorizationDeniedError('Only message sender can hide message')
    }

    if (message.status === 'MODERATED') {
      throw new InvalidRequestError('Cannot hide moderated message')
    }

    const updated = await messageRepository.update(message.id, message.version, {
      hiddenAt: now().toISOString() as UtcTimestamp,
      status: 'HIDDEN',
    })

    return toMessageDto(updated)
  }

  async function moderateMessage(
    actorId: Uuidv7,
    messageId: Uuidv7,
    reason: string,
  ): Promise<MessageDto> {
    // This would normally check for MODERATOR permission via authorization service
    // For now, we just implement the core logic

    const message = await messageRepository.findById(messageId)

    if (!message) {
      throw new InvalidRequestError('Message not found')
    }

    if (!reason.trim()) {
      throw new InvalidRequestError('Moderation reason is required')
    }

    const updated = await messageRepository.update(message.id, message.version, {
      moderatedAt: now().toISOString() as UtcTimestamp,
      moderatedBy: actorId,
      moderationReason: reason.trim(),
      status: 'MODERATED',
    })

    return toMessageDto(updated)
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

function sanitizeMessageText(text: string): string {
  // Remove potential XSS vectors
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove inline event handlers
    .trim()
}

function toConversationDto(record: ConversationRecord): ConversationDto {
  return {
    contextId: record.contextId,
    contextType: record.contextType,
    createdAt: record.createdAt,
    id: record.id,
    lastMessageAt: record.lastMessageAt,
    lastMessagePreview: record.lastMessagePreview,
    participantCount: record.participantCount,
    status: record.status,
    title: record.title,
    unreadCount: record.unreadCount,
    updatedAt: record.updatedAt,
    version: record.version,
  }
}

function toMessageDto(record: MessageRecord): MessageDto {
  return {
    attachmentAssetIds: record.attachmentAssetIds,
    conversationId: record.conversationId,
    createdAt: record.createdAt,
    editedAt: record.editedAt,
    hiddenAt: record.hiddenAt,
    id: record.id,
    isModerated: record.status === 'MODERATED',
    replyToMessageId: record.replyToMessageId,
    senderId: record.senderId,
    status: record.status,
    textContent: record.textContent,
    updatedAt: record.updatedAt,
    version: record.version,
  }
}
