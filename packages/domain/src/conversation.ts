import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { UtcTimestamp, Uuidv7 } from './index.js'

export const conversationContextTypes = [
  'SERVICE_REQUEST',
  'ORDER',
  'ORGANIZATION',
  'DIRECT',
] as const

export const conversationStatuses = ['ACTIVE', 'ARCHIVED', 'CLOSED'] as const

export const messageStatuses = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'HIDDEN',
  'MODERATED',
] as const

export type ConversationContextType = (typeof conversationContextTypes)[number]
export type ConversationStatus = (typeof conversationStatuses)[number]
export type MessageStatus = (typeof messageStatuses)[number]
export type ConversationSortField = 'createdAt' | 'lastMessageAt' | 'updatedAt'
export type MessageSortField = 'createdAt' | 'updatedAt'

export type ConversationRecord = Readonly<
  CanonicalRecord & {
    contextId: Uuidv7
    contextType: ConversationContextType
    lastMessageAt: UtcTimestamp | null
    lastMessagePreview: string | null
    participantCount: number
    status: ConversationStatus
    title: string
    unreadCount: number
  }
>

export type ConversationMemberRecord = Readonly<
  CanonicalRecord & {
    conversationId: Uuidv7
    isActive: boolean
    joinedAt: UtcTimestamp
    lastReadAt: UtcTimestamp | null
    leftAt: UtcTimestamp | null
    role: string
    unreadCount: number
    userId: Uuidv7
  }
>

export type MessageRecord = Readonly<
  CanonicalRecord & {
    attachmentAssetIds: readonly Uuidv7[]
    conversationId: Uuidv7
    editedAt: UtcTimestamp | null
    hiddenAt: UtcTimestamp | null
    moderatedAt: UtcTimestamp | null
    moderatedBy: Uuidv7 | null
    moderationReason: string | null
    replyToMessageId: Uuidv7 | null
    senderId: Uuidv7
    status: MessageStatus
    textContent: string
  }
>

export type ReadMarkerRecord = Readonly<
  CanonicalRecord & {
    conversationId: Uuidv7
    lastReadAt: UtcTimestamp
    lastReadMessageId: Uuidv7 | null
    userId: Uuidv7
  }
>

export type CreateConversationInput = Readonly<{
  contextId: Uuidv7
  contextType: ConversationContextType
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  participantCount?: number
  status?: ConversationStatus
  title: string
  updatedBy?: Uuidv7 | null
}>

export type CreateConversationMemberInput = Readonly<{
  conversationId: Uuidv7
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  isActive?: boolean
  joinedAt?: UtcTimestamp
  role?: string
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
}>

export type CreateMessageInput = Readonly<{
  attachmentAssetIds?: readonly Uuidv7[]
  conversationId: Uuidv7
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  replyToMessageId?: Uuidv7 | null
  senderId: Uuidv7
  status?: MessageStatus
  textContent: string
  updatedBy?: Uuidv7 | null
}>

export type CreateReadMarkerInput = Readonly<{
  conversationId: Uuidv7
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  lastReadAt?: UtcTimestamp
  lastReadMessageId?: Uuidv7 | null
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
}>

export type ConversationFilter = Readonly<{
  contextId?: Uuidv7
  contextType?: ConversationContextType
  status?: ConversationStatus
  userId?: Uuidv7
}>

export type ConversationMemberFilter = Readonly<{
  conversationId?: Uuidv7
  isActive?: boolean
  userId?: Uuidv7
}>

export type MessageFilter = Readonly<{
  conversationId?: Uuidv7
  senderId?: Uuidv7
  status?: MessageStatus
}>

export type ReadMarkerFilter = Readonly<{
  conversationId?: Uuidv7
  userId?: Uuidv7
}>

export interface ConversationRepository {
  create(input: CreateConversationInput): Promise<ConversationRecord>
  findById(id: Uuidv7): Promise<ConversationRecord | null>
  findByContextId(contextId: Uuidv7, contextType: ConversationContextType): Promise<ConversationRecord | null>
  list(
    request: RepositoryListRequest<ConversationFilter, ConversationSortField>,
  ): Promise<RepositoryListPage<ConversationRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        ConversationRecord,
        'lastMessageAt' | 'lastMessagePreview' | 'participantCount' | 'status' | 'title' | 'unreadCount'
      >
    >,
  ): Promise<ConversationRecord>
}

export interface ConversationMemberRepository {
  create(input: CreateConversationMemberInput): Promise<ConversationMemberRecord>
  findById(id: Uuidv7): Promise<ConversationMemberRecord | null>
  findByConversationAndUser(
    conversationId: Uuidv7,
    userId: Uuidv7,
  ): Promise<ConversationMemberRecord | null>
  list(
    request: RepositoryListRequest<ConversationMemberFilter, 'createdAt'>,
  ): Promise<RepositoryListPage<ConversationMemberRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        ConversationMemberRecord,
        'isActive' | 'lastReadAt' | 'leftAt' | 'role' | 'unreadCount'
      >
    >,
  ): Promise<ConversationMemberRecord>
}

export interface MessageRepository {
  create(input: CreateMessageInput): Promise<MessageRecord>
  findById(id: Uuidv7): Promise<MessageRecord | null>
  list(
    request: RepositoryListRequest<MessageFilter, MessageSortField>,
  ): Promise<RepositoryListPage<MessageRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        MessageRecord,
        | 'editedAt'
        | 'hiddenAt'
        | 'moderatedAt'
        | 'moderatedBy'
        | 'moderationReason'
        | 'status'
        | 'textContent'
      >
    >,
  ): Promise<MessageRecord>
}

export interface ReadMarkerRepository {
  create(input: CreateReadMarkerInput): Promise<ReadMarkerRecord>
  findById(id: Uuidv7): Promise<ReadMarkerRecord | null>
  findByConversationAndUser(
    conversationId: Uuidv7,
    userId: Uuidv7,
  ): Promise<ReadMarkerRecord | null>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<Pick<ReadMarkerRecord, 'lastReadAt' | 'lastReadMessageId'>>,
  ): Promise<ReadMarkerRecord>
}
