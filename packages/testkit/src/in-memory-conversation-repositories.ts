import type {
  ConversationContextType,
  ConversationFilter,
  ConversationMemberFilter,
  ConversationMemberRecord,
  ConversationMemberRepository,
  ConversationRecord,
  ConversationRepository,
  ConversationSortField,
  CreateConversationInput,
  CreateConversationMemberInput,
  CreateMessageInput,
  CreateReadMarkerInput,
  MessageFilter,
  MessageRecord,
  MessageRepository,
  MessageSortField,
  ReadMarkerFilter,
  ReadMarkerRecord,
  ReadMarkerRepository,
  RepositoryListPage,
  RepositoryListRequest,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'
import { RepositoryConflictError } from '@pim/domain'
import type { ClockPort, UuidGeneratorPort } from '../../application/src/identity.js'

export function createInMemoryConversationRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): ConversationRepository {
  const store = new Map<Uuidv7, ConversationRecord>()
  const contextIndex = new Map<string, Uuidv7>()

  function buildContextKey(contextId: Uuidv7, contextType: ConversationContextType): string {
    return `${contextType}:${contextId}`
  }

  return {
    async create(input: CreateConversationInput): Promise<ConversationRecord> {
      const contextKey = buildContextKey(input.contextId, input.contextType)

      if (contextIndex.has(contextKey)) {
        const existingId = contextIndex.get(contextKey)!
        return store.get(existingId)!
      }

      const now = clock.now()
      const id = (input.id ?? uuidGenerator.next()) as Uuidv7

      const record: ConversationRecord = {
        contextId: input.contextId,
        contextType: input.contextType,
        createdAt: now,
        createdBy: input.createdBy ?? null,
        deletedAt: null,
        id,
        lastMessageAt: null,
        lastMessagePreview: null,
        participantCount: input.participantCount ?? 0,
        schemaVersion: 1,
        status: input.status ?? 'ACTIVE',
        title: input.title,
        unreadCount: 0,
        updatedAt: now,
        updatedBy: input.updatedBy ?? null,
        version: 1,
      }

      store.set(id, record)
      contextIndex.set(contextKey, id)

      return record
    },

    async findById(id: Uuidv7): Promise<ConversationRecord | null> {
      const record = store.get(id)
      return record && !record.deletedAt ? record : null
    },

    async findByContextId(
      contextId: Uuidv7,
      contextType: ConversationContextType,
    ): Promise<ConversationRecord | null> {
      const contextKey = buildContextKey(contextId, contextType)
      const id = contextIndex.get(contextKey)

      if (!id) {
        return null
      }

      return this.findById(id)
    },

    async list(
      request: RepositoryListRequest<ConversationFilter, ConversationSortField>,
    ): Promise<RepositoryListPage<ConversationRecord>> {
      let items = Array.from(store.values()).filter((r) => {
        if (request.includeDeleted !== true && r.deletedAt) {
          return false
        }

        if (request.filter?.contextId && r.contextId !== request.filter.contextId) {
          return false
        }

        if (request.filter?.contextType && r.contextType !== request.filter.contextType) {
          return false
        }

        if (request.filter?.status && r.status !== request.filter.status) {
          return false
        }

        return true
      })

      // Sort
      items.sort((a, b) => {
        const field = request.sort.field
        let aVal: string | number | null
        let bVal: string | number | null

        if (field === 'lastMessageAt') {
          aVal = a.lastMessageAt ?? ''
          bVal = b.lastMessageAt ?? ''
        } else {
          aVal = a[field]
          bVal = b[field]
        }

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return request.sort.direction === 'asc' ? comparison : -comparison
      })

      // Simple cursor pagination
      const startIndex = request.cursor ? parseInt(request.cursor, 10) : 0
      const endIndex = startIndex + request.limit
      const page = items.slice(startIndex, endIndex)
      const nextCursor = endIndex < items.length ? String(endIndex) : null

      return {
        items: page,
        nextCursor,
      }
    },

    async update(
      id: Uuidv7,
      expectedVersion: number,
      input: Partial<
        Pick<
          ConversationRecord,
          'lastMessageAt' | 'lastMessagePreview' | 'participantCount' | 'status' | 'title' | 'unreadCount'
        >
      >,
    ): Promise<ConversationRecord> {
      const existing = store.get(id)

      if (!existing || existing.deletedAt) {
        throw new Error(`Conversation ${id} not found`)
      }

      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: existing.version,
          entityId: id,
          entityName: 'Conversation',
          expectedVersion,
        })
      }

      const now = clock.now()

      const updated: ConversationRecord = {
        ...existing,
        ...input,
        updatedAt: now,
        version: existing.version + 1,
      }

      store.set(id, updated)

      return updated
    },
  }
}

export function createInMemoryConversationMemberRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): ConversationMemberRepository {
  const store = new Map<Uuidv7, ConversationMemberRecord>()
  const conversationUserIndex = new Map<string, Uuidv7>()

  function buildConversationUserKey(conversationId: Uuidv7, userId: Uuidv7): string {
    return `${conversationId}:${userId}`
  }

  return {
    async create(input: CreateConversationMemberInput): Promise<ConversationMemberRecord> {
      const key = buildConversationUserKey(input.conversationId, input.userId)

      if (conversationUserIndex.has(key)) {
        const existingId = conversationUserIndex.get(key)!
        return store.get(existingId)!
      }

      const now = clock.now()
      const id = (input.id ?? uuidGenerator.next()) as Uuidv7

      const record: ConversationMemberRecord = {
        conversationId: input.conversationId,
        createdAt: now,
        createdBy: input.createdBy ?? null,
        deletedAt: null,
        id,
        isActive: input.isActive ?? true,
        joinedAt: input.joinedAt ?? now,
        lastReadAt: null,
        leftAt: null,
        role: input.role ?? 'PARTICIPANT',
        schemaVersion: 1,
        unreadCount: 0,
        updatedAt: now,
        updatedBy: input.updatedBy ?? null,
        userId: input.userId,
        version: 1,
      }

      store.set(id, record)
      conversationUserIndex.set(key, id)

      return record
    },

    async findById(id: Uuidv7): Promise<ConversationMemberRecord | null> {
      const record = store.get(id)
      return record && !record.deletedAt ? record : null
    },

    async findByConversationAndUser(
      conversationId: Uuidv7,
      userId: Uuidv7,
    ): Promise<ConversationMemberRecord | null> {
      const key = buildConversationUserKey(conversationId, userId)
      const id = conversationUserIndex.get(key)

      if (!id) {
        return null
      }

      return this.findById(id)
    },

    async list(
      request: RepositoryListRequest<ConversationMemberFilter, 'createdAt'>,
    ): Promise<RepositoryListPage<ConversationMemberRecord>> {
      let items = Array.from(store.values()).filter((r) => {
        if (request.includeDeleted !== true && r.deletedAt) {
          return false
        }

        if (request.filter?.conversationId && r.conversationId !== request.filter.conversationId) {
          return false
        }

        if (request.filter?.userId && r.userId !== request.filter.userId) {
          return false
        }

        if (request.filter?.isActive !== undefined && r.isActive !== request.filter.isActive) {
          return false
        }

        return true
      })

      // Sort by createdAt
      items.sort((a, b) => {
        const comparison = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
        return request.sort.direction === 'asc' ? comparison : -comparison
      })

      // Simple cursor pagination
      const startIndex = request.cursor ? parseInt(request.cursor, 10) : 0
      const endIndex = startIndex + request.limit
      const page = items.slice(startIndex, endIndex)
      const nextCursor = endIndex < items.length ? String(endIndex) : null

      return {
        items: page,
        nextCursor,
      }
    },

    async update(
      id: Uuidv7,
      expectedVersion: number,
      input: Partial<
        Pick<
          ConversationMemberRecord,
          'isActive' | 'lastReadAt' | 'leftAt' | 'role' | 'unreadCount'
        >
      >,
    ): Promise<ConversationMemberRecord> {
      const existing = store.get(id)

      if (!existing || existing.deletedAt) {
        throw new Error(`ConversationMember ${id} not found`)
      }

      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: existing.version,
          entityId: id,
          entityName: 'ConversationMember',
          expectedVersion,
        })
      }

      const now = clock.now()

      const updated: ConversationMemberRecord = {
        ...existing,
        ...input,
        updatedAt: now,
        version: existing.version + 1,
      }

      store.set(id, updated)

      return updated
    },
  }
}

export function createInMemoryMessageRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): MessageRepository {
  const store = new Map<Uuidv7, MessageRecord>()

  return {
    async create(input: CreateMessageInput): Promise<MessageRecord> {
      const now = clock.now()
      const id = (input.id ?? uuidGenerator.next()) as Uuidv7

      const record: MessageRecord = {
        attachmentAssetIds: input.attachmentAssetIds ?? [],
        conversationId: input.conversationId,
        createdAt: now,
        createdBy: input.createdBy ?? null,
        deletedAt: null,
        editedAt: null,
        hiddenAt: null,
        id,
        moderatedAt: null,
        moderatedBy: null,
        moderationReason: null,
        replyToMessageId: input.replyToMessageId ?? null,
        schemaVersion: 1,
        senderId: input.senderId,
        status: input.status ?? 'SENT',
        textContent: input.textContent,
        updatedAt: now,
        updatedBy: input.updatedBy ?? null,
        version: 1,
      }

      store.set(id, record)

      return record
    },

    async findById(id: Uuidv7): Promise<MessageRecord | null> {
      const record = store.get(id)
      return record && !record.deletedAt ? record : null
    },

    async list(
      request: RepositoryListRequest<MessageFilter, MessageSortField>,
    ): Promise<RepositoryListPage<MessageRecord>> {
      let items = Array.from(store.values()).filter((r) => {
        if (request.includeDeleted !== true && r.deletedAt) {
          return false
        }

        if (request.filter?.conversationId && r.conversationId !== request.filter.conversationId) {
          return false
        }

        if (request.filter?.senderId && r.senderId !== request.filter.senderId) {
          return false
        }

        if (request.filter?.status && r.status !== request.filter.status) {
          return false
        }

        return true
      })

      // Sort
      items.sort((a, b) => {
        const field = request.sort.field
        const aVal = a[field]
        const bVal = b[field]

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return request.sort.direction === 'asc' ? comparison : -comparison
      })

      // Simple cursor pagination
      const startIndex = request.cursor ? parseInt(request.cursor, 10) : 0
      const endIndex = startIndex + request.limit
      const page = items.slice(startIndex, endIndex)
      const nextCursor = endIndex < items.length ? String(endIndex) : null

      return {
        items: page,
        nextCursor,
      }
    },

    async update(
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
    ): Promise<MessageRecord> {
      const existing = store.get(id)

      if (!existing || existing.deletedAt) {
        throw new Error(`Message ${id} not found`)
      }

      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: existing.version,
          entityId: id,
          entityName: 'Message',
          expectedVersion,
        })
      }

      const now = clock.now()

      const updated: MessageRecord = {
        ...existing,
        ...input,
        updatedAt: now,
        version: existing.version + 1,
      }

      store.set(id, updated)

      return updated
    },
  }
}

export function createInMemoryReadMarkerRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): ReadMarkerRepository {
  const store = new Map<Uuidv7, ReadMarkerRecord>()
  const conversationUserIndex = new Map<string, Uuidv7>()

  function buildConversationUserKey(conversationId: Uuidv7, userId: Uuidv7): string {
    return `${conversationId}:${userId}`
  }

  return {
    async create(input: CreateReadMarkerInput): Promise<ReadMarkerRecord> {
      const key = buildConversationUserKey(input.conversationId, input.userId)

      if (conversationUserIndex.has(key)) {
        const existingId = conversationUserIndex.get(key)!
        return store.get(existingId)!
      }

      const now = clock.now()
      const id = (input.id ?? uuidGenerator.next()) as Uuidv7

      const record: ReadMarkerRecord = {
        conversationId: input.conversationId,
        createdAt: now,
        createdBy: input.createdBy ?? null,
        deletedAt: null,
        id,
        lastReadAt: input.lastReadAt ?? now,
        lastReadMessageId: input.lastReadMessageId ?? null,
        schemaVersion: 1,
        updatedAt: now,
        updatedBy: input.updatedBy ?? null,
        userId: input.userId,
        version: 1,
      }

      store.set(id, record)
      conversationUserIndex.set(key, id)

      return record
    },

    async findById(id: Uuidv7): Promise<ReadMarkerRecord | null> {
      const record = store.get(id)
      return record && !record.deletedAt ? record : null
    },

    async findByConversationAndUser(
      conversationId: Uuidv7,
      userId: Uuidv7,
    ): Promise<ReadMarkerRecord | null> {
      const key = buildConversationUserKey(conversationId, userId)
      const id = conversationUserIndex.get(key)

      if (!id) {
        return null
      }

      return this.findById(id)
    },

    async update(
      id: Uuidv7,
      expectedVersion: number,
      input: Partial<Pick<ReadMarkerRecord, 'lastReadAt' | 'lastReadMessageId'>>,
    ): Promise<ReadMarkerRecord> {
      const existing = store.get(id)

      if (!existing || existing.deletedAt) {
        throw new Error(`ReadMarker ${id} not found`)
      }

      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: existing.version,
          entityId: id,
          entityName: 'ReadMarker',
          expectedVersion,
        })
      }

      const now = clock.now()

      const updated: ReadMarkerRecord = {
        ...existing,
        ...input,
        updatedAt: now,
        version: existing.version + 1,
      }

      store.set(id, updated)

      return updated
    },
  }
}
