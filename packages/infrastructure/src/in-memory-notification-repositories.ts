import type {
  NotificationRecord,
  NotificationRepository,
  NotificationEndpointRecord,
  NotificationEndpointRepository,
  NotificationPreferenceRecord,
  NotificationPreferenceRepository,
  RateLimitRecord,
  RateLimitRepository,
  CreateNotificationInput,
  CreateNotificationEndpointInput,
  CreateNotificationPreferenceInput,
  CreateRateLimitInput,
  NotificationFilter,
  NotificationEndpointFilter,
  NotificationPreferenceFilter,
  RateLimitFilter,
  NotificationSortField,
  NotificationChannel,
  NotificationCategory,
  RepositoryListRequest,
  RepositoryListPage,
  Uuidv7,
  UtcTimestamp,
} from '@pim/domain'

export function createInMemoryNotificationRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): NotificationRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, NotificationRecord>()

  return {
    async create(input: CreateNotificationInput): Promise<NotificationRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: NotificationRecord = {
        id: input.id ?? generateId(),
        category: input.category,
        channel: input.channel,
        eventId: input.eventId,
        priority: input.priority ?? 'NORMAL',
        recipientUserId: input.recipientUserId,
        status: input.status ?? 'PENDING',
        templateKey: input.templateKey,
        templateData: input.templateData,
        sentAt: null,
        failureReason: null,
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: input.updatedBy ?? null,
        version: 1,
      }
      store.set(record.id, record)
      return record
    },

    async findById(id: Uuidv7): Promise<NotificationRecord | null> {
      return store.get(id) ?? null
    },

    async findByEventIdAndChannel(
      eventId: string,
      channel: NotificationChannel,
    ): Promise<NotificationRecord | null> {
      for (const record of store.values()) {
        if (record.eventId === eventId && record.channel === channel) {
          return record
        }
      }
      return null
    },

    async list(
      request: RepositoryListRequest<NotificationFilter, NotificationSortField>,
    ): Promise<RepositoryListPage<NotificationRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { category, channel, eventId, recipientUserId, status } = request.filter
        filtered = filtered.filter((record) => {
          if (category && record.category !== category) return false
          if (channel && record.channel !== channel) return false
          if (eventId && record.eventId !== eventId) return false
          if (recipientUserId && record.recipientUserId !== recipientUserId) return false
          if (status && record.status !== status) return false
          return true
        })
      }

      const sortField = request.sortField ?? 'createdAt'
      const sortOrder = request.sortOrder ?? 'DESC'
      filtered.sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortOrder === 'ASC' ? comparison : -comparison
      })

      const limit = request.limit ?? 20
      const offset = request.offset ?? 0
      const items = filtered.slice(offset, offset + limit)

      return {
        items,
        total: filtered.length,
        limit,
        offset,
      }
    },

    async update(
      id: Uuidv7,
      expectedVersion: number,
      input: Partial<Pick<NotificationRecord, 'status' | 'sentAt' | 'failureReason'>>,
    ): Promise<NotificationRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Notification ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for notification ${id}`)
      }

      const updated: NotificationRecord = {
        ...existing,
        ...input,
        updatedAt: now().toISOString() as UtcTimestamp,
        version: existing.version + 1,
      }
      store.set(id, updated)
      return updated
    },
  }
}

export function createInMemoryNotificationEndpointRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): NotificationEndpointRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, NotificationEndpointRecord>()

  return {
    async create(input: CreateNotificationEndpointInput): Promise<NotificationEndpointRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: NotificationEndpointRecord = {
        id: input.id ?? generateId(),
        userId: input.userId,
        channel: input.channel,
        endpoint: input.endpoint,
        status: input.status ?? 'ACTIVE',
        expiresAt: input.expiresAt ?? null,
        metadata: input.metadata ?? {},
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: input.updatedBy ?? null,
        version: 1,
      }
      store.set(record.id, record)
      return record
    },

    async findById(id: Uuidv7): Promise<NotificationEndpointRecord | null> {
      return store.get(id) ?? null
    },

    async findByUserAndChannel(
      userId: Uuidv7,
      channel: NotificationChannel,
    ): Promise<NotificationEndpointRecord | null> {
      for (const record of store.values()) {
        if (record.userId === userId && record.channel === channel) {
          return record
        }
      }
      return null
    },

    async list(
      request: RepositoryListRequest<NotificationEndpointFilter, 'createdAt'>,
    ): Promise<RepositoryListPage<NotificationEndpointRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { userId, channel, status } = request.filter
        filtered = filtered.filter((record) => {
          if (userId && record.userId !== userId) return false
          if (channel && record.channel !== channel) return false
          if (status && record.status !== status) return false
          return true
        })
      }

      const sortOrder = request.sortOrder ?? 'DESC'
      filtered.sort((a, b) => {
        const comparison = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
        return sortOrder === 'ASC' ? comparison : -comparison
      })

      const limit = request.limit ?? 20
      const offset = request.offset ?? 0
      const items = filtered.slice(offset, offset + limit)

      return {
        items,
        total: filtered.length,
        limit,
        offset,
      }
    },

    async update(
      id: Uuidv7,
      expectedVersion: number,
      input: Partial<Pick<NotificationEndpointRecord, 'endpoint' | 'status' | 'expiresAt' | 'metadata'>>,
    ): Promise<NotificationEndpointRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Notification endpoint ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for notification endpoint ${id}`)
      }

      const updated: NotificationEndpointRecord = {
        ...existing,
        ...input,
        updatedAt: now().toISOString() as UtcTimestamp,
        version: existing.version + 1,
      }
      store.set(id, updated)
      return updated
    },
  }
}

export function createInMemoryNotificationPreferenceRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): NotificationPreferenceRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, NotificationPreferenceRecord>()

  return {
    async create(input: CreateNotificationPreferenceInput): Promise<NotificationPreferenceRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: NotificationPreferenceRecord = {
        id: input.id ?? generateId(),
        userId: input.userId,
        category: input.category,
        channelInApp: input.channelInApp ?? true,
        channelEmail: input.channelEmail ?? true,
        channelPush: input.channelPush ?? true,
        channelLine: input.channelLine ?? false,
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: input.updatedBy ?? null,
        version: 1,
      }
      store.set(record.id, record)
      return record
    },

    async findById(id: Uuidv7): Promise<NotificationPreferenceRecord | null> {
      return store.get(id) ?? null
    },

    async findByUserAndCategory(
      userId: Uuidv7,
      category: NotificationCategory,
    ): Promise<NotificationPreferenceRecord | null> {
      for (const record of store.values()) {
        if (record.userId === userId && record.category === category) {
          return record
        }
      }
      return null
    },

    async list(
      request: RepositoryListRequest<NotificationPreferenceFilter, 'createdAt'>,
    ): Promise<RepositoryListPage<NotificationPreferenceRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { userId, category } = request.filter
        filtered = filtered.filter((record) => {
          if (userId && record.userId !== userId) return false
          if (category && record.category !== category) return false
          return true
        })
      }

      const sortOrder = request.sortOrder ?? 'DESC'
      filtered.sort((a, b) => {
        const comparison = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
        return sortOrder === 'ASC' ? comparison : -comparison
      })

      const limit = request.limit ?? 20
      const offset = request.offset ?? 0
      const items = filtered.slice(offset, offset + limit)

      return {
        items,
        total: filtered.length,
        limit,
        offset,
      }
    },

    async update(
      id: Uuidv7,
      expectedVersion: number,
      input: Partial<
        Pick<
          NotificationPreferenceRecord,
          'channelInApp' | 'channelEmail' | 'channelPush' | 'channelLine'
        >
      >,
    ): Promise<NotificationPreferenceRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Notification preference ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for notification preference ${id}`)
      }

      const updated: NotificationPreferenceRecord = {
        ...existing,
        ...input,
        updatedAt: now().toISOString() as UtcTimestamp,
        version: existing.version + 1,
      }
      store.set(id, updated)
      return updated
    },
  }
}

export function createInMemoryRateLimitRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): RateLimitRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, RateLimitRecord>()

  return {
    async create(input: CreateRateLimitInput): Promise<RateLimitRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: RateLimitRecord = {
        id: input.id ?? generateId(),
        userId: input.userId,
        action: input.action,
        count: input.count ?? 1,
        windowStartAt: input.windowStartAt ?? timestamp,
        expiresAt: input.expiresAt,
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: input.updatedBy ?? null,
        version: 1,
      }
      store.set(record.id, record)
      return record
    },

    async findByUserAndAction(userId: Uuidv7, action: string): Promise<RateLimitRecord | null> {
      for (const record of store.values()) {
        if (record.userId === userId && record.action === action) {
          return record
        }
      }
      return null
    },

    async increment(id: Uuidv7, expectedVersion: number): Promise<RateLimitRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Rate limit ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for rate limit ${id}`)
      }

      const updated: RateLimitRecord = {
        ...existing,
        count: existing.count + 1,
        updatedAt: now().toISOString() as UtcTimestamp,
        version: existing.version + 1,
      }
      store.set(id, updated)
      return updated
    },

    async deleteExpired(before: UtcTimestamp): Promise<number> {
      let deleted = 0
      for (const [id, record] of store.entries()) {
        if (record.expiresAt < before) {
          store.delete(id)
          deleted++
        }
      }
      return deleted
    },
  }
}
