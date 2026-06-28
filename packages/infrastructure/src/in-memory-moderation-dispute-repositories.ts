import type {
  CreateDisputeInput,
  CreateModerationCaseInput,
  CreateReportInput,
  DisputeFilter,
  DisputeRecord,
  DisputeRepository,
  DisputeSortField,
  ModerationCaseFilter,
  ModerationCaseRecord,
  ModerationCaseRepository,
  ModerationCaseSortField,
  ReportFilter,
  ReportRecord,
  ReportRepository,
  ReportSortField,
  ReportTargetType,
  RepositoryListPage,
  RepositoryListRequest,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'

export function createInMemoryReportRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): ReportRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, ReportRecord>()

  return {
    async create(input: CreateReportInput): Promise<ReportRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: ReportRecord = {
        id: input.id ?? generateId(),
        reporterUserId: input.reporterUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        description: input.description,
        status: 'PENDING',
        assignedModeratorId: null,
        moderationCaseId: null,
        resolvedAt: null,
        resolvedBy: null,
        resolutionNotes: null,
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
        version: 1,
      }
      store.set(record.id, record)
      return record
    },

    async findById(id: Uuidv7): Promise<ReportRecord | null> {
      return store.get(id) ?? null
    },

    async list(
      request: RepositoryListRequest<ReportFilter, ReportSortField>,
    ): Promise<RepositoryListPage<ReportRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { reporterUserId, status, targetId, targetType } = request.filter
        filtered = filtered.filter((record) => {
          if (reporterUserId && record.reporterUserId !== reporterUserId) return false
          if (status && record.status !== status) return false
          if (targetId && record.targetId !== targetId) return false
          if (targetType && record.targetType !== targetType) return false
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

    async update(id: Uuidv7, expectedVersion: number, input: Partial<ReportRecord>): Promise<ReportRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Report ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for report ${id}`)
      }

      const updated: ReportRecord = {
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

export function createInMemoryModerationCaseRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): ModerationCaseRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, ModerationCaseRecord>()

  return {
    async create(input: CreateModerationCaseInput): Promise<ModerationCaseRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: ModerationCaseRecord = {
        id: input.id ?? generateId(),
        targetType: input.targetType,
        targetId: input.targetId,
        status: 'OPEN',
        assignedModeratorId: input.assignedModeratorId ?? null,
        priority: input.priority ?? 1,
        actionTaken: null,
        actionDuration: null,
        actionReason: null,
        actionedAt: null,
        actionedBy: null,
        reportIds: input.reportIds ?? [],
        evidenceSnapshot: input.evidenceSnapshot ?? {},
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
        version: 1,
      }
      store.set(record.id, record)
      return record
    },

    async findById(id: Uuidv7): Promise<ModerationCaseRecord | null> {
      return store.get(id) ?? null
    },

    async findByTarget(
      targetType: ReportTargetType,
      targetId: Uuidv7,
    ): Promise<ModerationCaseRecord | null> {
      for (const record of store.values()) {
        if (record.targetType === targetType && record.targetId === targetId) {
          return record
        }
      }
      return null
    },

    async list(
      request: RepositoryListRequest<ModerationCaseFilter, ModerationCaseSortField>,
    ): Promise<RepositoryListPage<ModerationCaseRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { assignedModeratorId, status, targetId, targetType } = request.filter
        filtered = filtered.filter((record) => {
          if (assignedModeratorId && record.assignedModeratorId !== assignedModeratorId) return false
          if (status && record.status !== status) return false
          if (targetId && record.targetId !== targetId) return false
          if (targetType && record.targetType !== targetType) return false
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
      input: Partial<ModerationCaseRecord>,
    ): Promise<ModerationCaseRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Moderation case ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for moderation case ${id}`)
      }

      const updated: ModerationCaseRecord = {
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

export function createInMemoryDisputeRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): DisputeRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, DisputeRecord>()

  return {
    async create(input: CreateDisputeInput): Promise<DisputeRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: DisputeRecord = {
        id: input.id ?? generateId(),
        orderId: input.orderId,
        buyerUserId: input.buyerUserId,
        providerUserId: input.providerUserId,
        category: input.category,
        requestedResolution: input.requestedResolution,
        description: input.description,
        status: 'OPEN',
        payoutHoldApplied: false,
        payoutHoldAmount: null,
        deadline: input.deadline,
        buyerEvidenceUrls: input.buyerEvidenceUrls ?? [],
        sellerResponseText: null,
        sellerEvidenceUrls: [],
        sellerRespondedAt: null,
        reviewedByModeratorId: null,
        resolutionType: null,
        resolutionAmount: null,
        resolvedAt: null,
        resolvedBy: null,
        resolutionNotes: null,
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
        version: 1,
      }
      store.set(record.id, record)
      return record
    },

    async findById(id: Uuidv7): Promise<DisputeRecord | null> {
      return store.get(id) ?? null
    },

    async findByOrderId(orderId: Uuidv7): Promise<DisputeRecord | null> {
      for (const record of store.values()) {
        if (record.orderId === orderId) {
          return record
        }
      }
      return null
    },

    async list(
      request: RepositoryListRequest<DisputeFilter, DisputeSortField>,
    ): Promise<RepositoryListPage<DisputeRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { buyerUserId, orderId, providerUserId, status } = request.filter
        filtered = filtered.filter((record) => {
          if (buyerUserId && record.buyerUserId !== buyerUserId) return false
          if (orderId && record.orderId !== orderId) return false
          if (providerUserId && record.providerUserId !== providerUserId) return false
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
      input: Partial<DisputeRecord>,
    ): Promise<DisputeRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Dispute ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for dispute ${id}`)
      }

      const updated: DisputeRecord = {
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
