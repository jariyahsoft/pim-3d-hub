import type {
  CreateRatingProjectionInput,
  CreateReviewInput,
  RatingProjectionFilter,
  RatingProjectionRecord,
  RatingProjectionRepository,
  RatingValue,
  RepositoryListPage,
  RepositoryListRequest,
  ReviewFilter,
  ReviewRecord,
  ReviewRepository,
  ReviewSortField,
  ReviewSubjectType,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'

export function createInMemoryReviewRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): ReviewRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, ReviewRecord>()

  return {
    async create(input: CreateReviewInput): Promise<ReviewRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: ReviewRecord = {
        id: input.id ?? generateId(),
        orderId: input.orderId,
        reviewerUserId: input.reviewerUserId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        status: input.status ?? 'PUBLISHED',
        isVerifiedPurchase: true, // Always true for completed order reviews
        ratings: input.ratings,
        reviewText: input.reviewText ?? null,
        approvedMediaAssetIds: input.approvedMediaAssetIds ?? [],
        sellerResponse: null,
        sellerRespondedAt: null,
        sellerRespondedBy: null,
        helpfulCount: 0,
        moderatedAt: null,
        moderatedBy: null,
        moderationReason: null,
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

    async findById(id: Uuidv7): Promise<ReviewRecord | null> {
      return store.get(id) ?? null
    },

    async findByOrderAndReviewer(
      orderId: Uuidv7,
      reviewerUserId: Uuidv7,
    ): Promise<ReviewRecord | null> {
      for (const record of store.values()) {
        if (record.orderId === orderId && record.reviewerUserId === reviewerUserId) {
          return record
        }
      }
      return null
    },

    async list(
      request: RepositoryListRequest<ReviewFilter, ReviewSortField>,
    ): Promise<RepositoryListPage<ReviewRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { orderId, reviewerUserId, status, subjectId, subjectType, isVerifiedPurchase } =
          request.filter
        filtered = filtered.filter((record) => {
          if (orderId && record.orderId !== orderId) return false
          if (reviewerUserId && record.reviewerUserId !== reviewerUserId) return false
          if (status && record.status !== status) return false
          if (subjectId && record.subjectId !== subjectId) return false
          if (subjectType && record.subjectType !== subjectType) return false
          if (isVerifiedPurchase !== undefined && record.isVerifiedPurchase !== isVerifiedPurchase)
            return false
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
      input: Partial<ReviewRecord>,
    ): Promise<ReviewRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Review ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for review ${id}`)
      }

      const updated: ReviewRecord = {
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

export function createInMemoryRatingProjectionRepository(deps: {
  generateId: () => Uuidv7
  now: () => Date
}): RatingProjectionRepository {
  const { generateId, now } = deps
  const store = new Map<Uuidv7, RatingProjectionRecord>()

  return {
    async create(input: CreateRatingProjectionInput): Promise<RatingProjectionRecord> {
      const timestamp = now().toISOString() as UtcTimestamp
      const record: RatingProjectionRecord = {
        id: input.id ?? generateId(),
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        verifiedReviewCount: 0,
        totalReviewCount: 0,
        averageOverallRating: 0,
        averageQualityRating: 0,
        averageCommunicationRating: 0,
        averageDeliveryRating: 0,
        averageValueRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        lastReviewedAt: null,
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

    async findById(id: Uuidv7): Promise<RatingProjectionRecord | null> {
      return store.get(id) ?? null
    },

    async findBySubject(
      subjectType: ReviewSubjectType,
      subjectId: Uuidv7,
    ): Promise<RatingProjectionRecord | null> {
      for (const record of store.values()) {
        if (record.subjectType === subjectType && record.subjectId === subjectId) {
          return record
        }
      }
      return null
    },

    async list(
      request: RepositoryListRequest<RatingProjectionFilter, 'createdAt'>,
    ): Promise<RepositoryListPage<RatingProjectionRecord>> {
      let filtered = Array.from(store.values())

      if (request.filter) {
        const { subjectId, subjectType } = request.filter
        filtered = filtered.filter((record) => {
          if (subjectId && record.subjectId !== subjectId) return false
          if (subjectType && record.subjectType !== subjectType) return false
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
      input: Partial<RatingProjectionRecord>,
    ): Promise<RatingProjectionRecord> {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Rating projection ${id} not found`)
      }
      if (existing.version !== expectedVersion) {
        throw new Error(`Version mismatch for rating projection ${id}`)
      }

      const updated: RatingProjectionRecord = {
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
