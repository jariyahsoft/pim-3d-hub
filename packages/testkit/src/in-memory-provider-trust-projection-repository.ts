import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type CreateProviderTrustProjectionInput,
  type ProviderTrustProjectionFilter,
  type ProviderTrustProjectionRecord,
  type ProviderTrustProjectionRepository,
  type ProviderTrustProjectionSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
  type Uuidv7,
} from '@pim/domain'
import {
  createFakeClock,
  createFakeUuidGenerator,
  type ClockPort,
  type UuidGeneratorPort,
} from './repository-fakes.js'

type CursorPayload = Readonly<{
  direction: SortDirection
  field: ProviderTrustProjectionSortField
  id: Uuidv7
  value: string
}>

export type InMemoryProviderTrustProjectionRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: ProviderTrustProjectionRepository
  uuidGenerator: UuidGeneratorPort
}>

function encodeCursor(payload: CursorPayload): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload))
}

function decodeCursor(cursor: RepositoryCursor): CursorPayload {
  const payload = JSON.parse(decodeURIComponent(cursor)) as Partial<CursorPayload>

  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    (payload.field !== 'createdAt' && payload.field !== 'updatedAt') ||
    typeof payload.id !== 'string' ||
    typeof payload.value !== 'string'
  ) {
    throw new TypeError('Invalid repository cursor')
  }

  return {
    direction: payload.direction,
    field: payload.field,
    id: payload.id as Uuidv7,
    value: payload.value,
  }
}

function compareValues(left: string, right: string, direction: SortDirection): number {
  if (left === right) {
    return 0
  }

  if (direction === 'asc') {
    return left < right ? -1 : 1
  }

  return left > right ? -1 : 1
}

function compareRecords(
  left: ProviderTrustProjectionRecord,
  right: ProviderTrustProjectionRecord,
  field: ProviderTrustProjectionSortField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(left[field], right[field], direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return left.id.localeCompare(right.id)
}

function compareRecordToCursor(
  record: ProviderTrustProjectionRecord,
  cursor: CursorPayload,
): number {
  const fieldComparison = compareValues(record[cursor.field], cursor.value, cursor.direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return record.id.localeCompare(cursor.id)
}

function cloneRecord(record: ProviderTrustProjectionRecord): ProviderTrustProjectionRecord {
  return Object.freeze({ ...record })
}

export function createInMemoryProviderTrustProjectionRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryProviderTrustProjectionRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, ProviderTrustProjectionRecord>()
  const providerSlots = new Map<Uuidv7, Uuidv7>()

  function ensureUniqueProviderProfileId(providerProfileId: Uuidv7, currentId?: Uuidv7): void {
    const existingId = providerSlots.get(providerProfileId)
    if (existingId && existingId !== currentId) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_trust_projections.providerProfileId',
        entityName: 'ProviderTrustProjection',
        value: providerProfileId,
      })
    }
  }

  function requireRecord(id: Uuidv7): ProviderTrustProjectionRecord {
    const record = records.get(id)
    if (!record) {
      throw new Error(`ProviderTrustProjection ${id} was not found`)
    }
    return record
  }

  return Object.freeze({
    clock,
    repository: Object.freeze({
      async create(createInput: CreateProviderTrustProjectionInput): Promise<ProviderTrustProjectionRecord> {
        const id = createInput.id ?? uuidGenerator.next()
        if (records.has(id)) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'provider_trust_projections.id',
            entityName: 'ProviderTrustProjection',
            value: id,
          })
        }

        ensureUniqueProviderProfileId(createInput.providerProfileId)

        const now = clock.now()
        const record: ProviderTrustProjectionRecord = Object.freeze({
          completedJobsCount: createInput.completedJobsCount,
          createdAt: now,
          createdBy: createInput.createdBy ?? null,
          deletedAt: null,
          id,
          lowSampleSize: createInput.lowSampleSize,
          onTimeJobsCount: createInput.onTimeJobsCount,
          providerProfileId: createInput.providerProfileId,
          ratingAverage: createInput.ratingAverage,
          ratingCount: createInput.ratingCount,
          schemaVersion: 1,
          sponsored: createInput.sponsored ?? false,
          updatedAt: now,
          updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
          version: 1,
        })

        records.set(record.id, record)
        providerSlots.set(record.providerProfileId, record.id)
        return cloneRecord(record)
      },

      async findById(id: Uuidv7): Promise<ProviderTrustProjectionRecord | null> {
        const record = records.get(id)
        return record ? cloneRecord(record) : null
      },

      async findByProviderProfileId(
        providerProfileId: Uuidv7,
      ): Promise<ProviderTrustProjectionRecord | null> {
        const id = providerSlots.get(providerProfileId)
        if (!id) {
          return null
        }

        return cloneRecord(requireRecord(id))
      },

      async list(
        request: RepositoryListRequest<
          ProviderTrustProjectionFilter,
          ProviderTrustProjectionSortField
        >,
      ): Promise<RepositoryListPage<ProviderTrustProjectionRecord>> {
        const filtered = [...records.values()].filter((record) => {
          if (request.filter?.providerProfileId && record.providerProfileId !== request.filter.providerProfileId) {
            return false
          }

          if (
            request.filter?.sponsored !== undefined &&
            record.sponsored !== request.filter.sponsored
          ) {
            return false
          }

          return true
        })

        filtered.sort((left, right) =>
          compareRecords(left, right, request.sort.field, request.sort.direction),
        )

        const cursor = request.cursor
        const startIndex = cursor
          ? filtered.findIndex((record) => compareRecordToCursor(record, decodeCursor(cursor)) > 0)
          : 0
        const normalizedStartIndex = startIndex < 0 ? filtered.length : startIndex
        const pageItems = filtered.slice(normalizedStartIndex, normalizedStartIndex + request.limit)
        const nextItem = filtered[normalizedStartIndex + request.limit]

        return {
          items: pageItems.map((item) => cloneRecord(item)),
          nextCursor: nextItem
            ? encodeCursor({
                direction: request.sort.direction,
                field: request.sort.field,
                id: nextItem.id,
                value: nextItem[request.sort.field],
              })
            : null,
        }
      },

      async update(
        projection: ProviderTrustProjectionRecord,
        expectedVersion: number,
      ): Promise<ProviderTrustProjectionRecord> {
        const current = requireRecord(projection.id)

        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'ProviderTrustProjection',
            expectedVersion,
          })
        }

        ensureUniqueProviderProfileId(projection.providerProfileId, projection.id)

        const next: ProviderTrustProjectionRecord = Object.freeze({
          ...projection,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: clock.now(),
          updatedBy: projection.updatedBy ?? null,
          version: current.version + 1,
        })

        records.set(next.id, next)
        providerSlots.set(next.providerProfileId, next.id)
        return cloneRecord(next)
      },
    }),
    uuidGenerator,
  })
}
