import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type CreateProviderProfileInput,
  type ProviderProfileFilter,
  type ProviderProfileRecord,
  type ProviderProfileRepository,
  type ProviderProfileSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
  type Uuidv7,
} from '@pim/domain'
import { parseUtcTimestamp } from '@pim/domain'
import {
  createFakeClock,
  createFakeUuidGenerator,
  type ClockPort,
  type UuidGeneratorPort,
} from './repository-fakes.js'

type CursorPayload = Readonly<{
  direction: SortDirection
  field: ProviderProfileSortField
  id: Uuidv7
  value: string
}>

export type InMemoryProviderProfileRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: ProviderProfileRepository
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
  left: ProviderProfileRecord,
  right: ProviderProfileRecord,
  field: ProviderProfileSortField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(left[field], right[field], direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return left.id.localeCompare(right.id)
}

function compareRecordToCursor(
  record: ProviderProfileRecord,
  cursor: CursorPayload,
): number {
  const fieldComparison = compareValues(record[cursor.field], cursor.value, cursor.direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return record.id.localeCompare(cursor.id)
}

function cloneRecord(record: ProviderProfileRecord): ProviderProfileRecord {
  return Object.freeze({ ...record })
}

export function createInMemoryProviderProfileRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryProviderProfileRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, ProviderProfileRecord>()

  function findActiveByOwnerUserId(ownerUserId: Uuidv7): ProviderProfileRecord | null {
    for (const record of records.values()) {
      if (record.ownerUserId === ownerUserId && record.deletedAt === null) {
        return record
      }
    }

    return null
  }

  function ensureUniqueOwnerUserId(
    ownerUserId: Uuidv7,
    currentId?: Uuidv7,
  ): void {
    const existing = findActiveByOwnerUserId(ownerUserId)

    if (existing && existing.id !== currentId) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_profiles.ownerUserId',
        entityName: 'ProviderProfile',
        value: ownerUserId,
      })
    }
  }

  function requireActiveRecord(id: Uuidv7): ProviderProfileRecord {
    const record = records.get(id)

    if (!record || record.deletedAt !== null) {
      throw new Error(`ProviderProfile ${id} was not found`)
    }

    return record
  }

  async function create(input: CreateProviderProfileInput): Promise<ProviderProfileRecord> {
    const id = input.id ?? uuidGenerator.next()

    if (records.has(id)) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_profiles.id',
        entityName: 'ProviderProfile',
        value: id,
      })
    }

    ensureUniqueOwnerUserId(input.ownerUserId)

    const now = clock.now()
    const record = cloneRecord({
      createdAt: now,
      createdBy: input.createdBy ?? null,
      deletedAt: null,
      id,
      ownerUserId: input.ownerUserId,
      publicName: input.publicName,
      serviceRegion: input.serviceRegion ?? null,
      schemaVersion: 1,
      status: input.status ?? 'DRAFT',
      updatedAt: now,
      updatedBy: input.updatedBy ?? input.createdBy ?? null,
      version: 1,
    })

    records.set(record.id, record)
    return record
  }

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ProviderProfileRecord | null> {
    const record = records.get(id)

    if (!record) {
      return null
    }

    if (!options?.includeDeleted && record.deletedAt !== null) {
      return null
    }

    return cloneRecord(record)
  }

  async function findByOwnerUserId(
    ownerUserId: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ProviderProfileRecord | null> {
    for (const record of records.values()) {
      if (record.ownerUserId !== ownerUserId) {
        continue
      }

      if (!options?.includeDeleted && record.deletedAt !== null) {
        continue
      }

      return cloneRecord(record)
    }

    return null
  }

  async function list(
    request: RepositoryListRequest<ProviderProfileFilter, ProviderProfileSortField>,
  ): Promise<RepositoryListPage<ProviderProfileRecord>> {
    if (request.limit <= 0) {
      throw new RangeError('Repository list limit must be greater than zero')
    }

    const filtered = [...records.values()].filter((record) => {
      if (!request.includeDeleted && record.deletedAt !== null) {
        return false
      }

      if (request.filter?.ownerUserId && record.ownerUserId !== request.filter.ownerUserId) {
        return false
      }

      if (request.filter?.status && record.status !== request.filter.status) {
        return false
      }

      if (
        request.filter?.serviceRegion !== undefined &&
        record.serviceRegion !== request.filter.serviceRegion
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
    const pageItems = filtered.slice(
      normalizedStartIndex,
      normalizedStartIndex + request.limit,
    )
    const nextItem = filtered[normalizedStartIndex + request.limit]
    const lastItem = pageItems[pageItems.length - 1]

    return {
      items: pageItems.map((record) => cloneRecord(record)),
      nextCursor: nextItem && lastItem
        ? encodeCursor({
            direction: request.sort.direction,
            field: request.sort.field,
            id: lastItem.id,
            value: lastItem[request.sort.field],
          })
        : null,
    }
  }

  async function update(
    profile: ProviderProfileRecord,
    expectedVersion: number,
  ): Promise<ProviderProfileRecord> {
    const current = requireActiveRecord(profile.id)

    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'ProviderProfile',
        expectedVersion,
      })
    }

    ensureUniqueOwnerUserId(profile.ownerUserId, profile.id)

    const updated = cloneRecord({
      ...profile,
      createdAt: current.createdAt,
      createdBy: current.createdBy ?? null,
      deletedAt: current.deletedAt,
      schemaVersion: current.schemaVersion,
      updatedAt: parseUtcTimestamp(clock.now()),
      version: current.version + 1,
    })

    records.set(updated.id, updated)
    return updated
  }

  async function softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<ProviderProfileRecord> {
    const current = requireActiveRecord(id)

    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'ProviderProfile',
        expectedVersion,
      })
    }

    const deletedAt = clock.now()
    const deleted = cloneRecord({
      ...current,
      deletedAt,
      updatedAt: deletedAt,
      updatedBy: deletedBy ?? current.updatedBy ?? null,
      version: current.version + 1,
    })

    records.set(deleted.id, deleted)
    return deleted
  }

  return {
    clock,
    repository: {
      create,
      findById,
      findByOwnerUserId,
      list,
      softDelete,
      update,
    },
    uuidGenerator,
  }
}
