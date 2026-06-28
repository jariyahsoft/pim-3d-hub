import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  parseUtcTimestamp,
  type CreateProviderServiceInput,
  type ProviderServiceFilter,
  type ProviderServiceRecord,
  type ProviderServiceRepository,
  type ProviderServiceSortField,
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
  field: ProviderServiceSortField
  id: Uuidv7
  value: string | number
}>

export type InMemoryProviderServiceRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: ProviderServiceRepository
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
    (typeof payload.value !== 'string' && typeof payload.value !== 'number')
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

function compareValues(left: string | number, right: string | number, direction: SortDirection): number {
  if (left === right) {
    return 0
  }

  if (direction === 'asc') {
    return left < right ? -1 : 1
  }

  return left > right ? -1 : 1
}

function compareRecords(
  left: ProviderServiceRecord,
  right: ProviderServiceRecord,
  field: ProviderServiceSortField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(left[field], right[field], direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return left.id.localeCompare(right.id)
}

function compareRecordToCursor(record: ProviderServiceRecord, cursor: CursorPayload): number {
  const fieldComparison = compareValues(record[cursor.field], cursor.value, cursor.direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return record.id.localeCompare(cursor.id)
}

function cloneRecord(record: ProviderServiceRecord): ProviderServiceRecord {
  return Object.freeze({ ...record })
}

function createServiceKey(providerProfileId: Uuidv7, serviceType: ProviderServiceRecord['serviceType']): string {
  return `${providerProfileId}:${serviceType}`
}

export function createInMemoryProviderServiceRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryProviderServiceRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, ProviderServiceRecord>()
  const slots = new Map<string, Uuidv7>()

  function findActiveBySlot(
    providerProfileId: Uuidv7,
    serviceType: ProviderServiceRecord['serviceType'],
  ): ProviderServiceRecord | null {
    const id = slots.get(createServiceKey(providerProfileId, serviceType))
    if (!id) {
      return null
    }

    const record = records.get(id)
    if (!record || record.deletedAt !== null) {
      return null
    }

    return record
  }

  function requireActiveRecord(id: Uuidv7): ProviderServiceRecord {
    const record = records.get(id)

    if (!record || record.deletedAt !== null) {
      throw new Error(`ProviderService ${id} was not found`)
    }

    return record
  }

  async function create(inputRecord: CreateProviderServiceInput): Promise<ProviderServiceRecord> {
    const id = inputRecord.id ?? uuidGenerator.next()

    if (records.has(id)) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_services.id',
        entityName: 'ProviderService',
        value: id,
      })
    }

    const slotKey = createServiceKey(inputRecord.providerProfileId, inputRecord.serviceType)
    if (slots.has(slotKey)) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_services.providerProfileId_serviceType',
        entityName: 'ProviderService',
        value: slotKey,
      })
    }

    const now = clock.now()
    const record: ProviderServiceRecord = Object.freeze({
      createdAt: now,
      createdBy: inputRecord.createdBy ?? null,
      deletedAt: null,
      id,
      instantOrderEnabled: inputRecord.instantOrderEnabled ?? false,
      leadTimeDays: inputRecord.leadTimeDays,
      providerProfileId: inputRecord.providerProfileId,
      serviceDescription: inputRecord.serviceDescription,
      serviceName: inputRecord.serviceName,
      serviceRegion: inputRecord.serviceRegion ?? null,
      serviceType: inputRecord.serviceType,
      schemaVersion: 1,
      status: inputRecord.status ?? 'DRAFT',
      updatedAt: now,
      updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
      version: 1,
    })

    records.set(record.id, record)
    slots.set(slotKey, record.id)
    return cloneRecord(record)
  }

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ProviderServiceRecord | null> {
    const record = records.get(id)

    if (!record) {
      return null
    }

    if (!options?.includeDeleted && record.deletedAt !== null) {
      return null
    }

    return cloneRecord(record)
  }

  async function findByProviderProfileAndType(
    providerProfileId: Uuidv7,
    serviceType: ProviderServiceRecord['serviceType'],
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ProviderServiceRecord | null> {
    if (!options?.includeDeleted) {
      const record = findActiveBySlot(providerProfileId, serviceType)
      return record ? cloneRecord(record) : null
    }

    const matching = [...records.values()]
      .filter(
        (record) =>
          record.providerProfileId === providerProfileId && record.serviceType === serviceType,
      )
      .sort((left, right) => compareRecords(left, right, 'updatedAt', 'desc'))

    return matching[0] ? cloneRecord(matching[0]) : null
  }

  async function list(
    request: RepositoryListRequest<ProviderServiceFilter, ProviderServiceSortField>,
  ): Promise<RepositoryListPage<ProviderServiceRecord>> {
    if (request.limit <= 0) {
      throw new RangeError('Repository list limit must be greater than zero')
    }

    const filtered = [...records.values()].filter((record) => {
      if (!request.includeDeleted && record.deletedAt !== null) {
        return false
      }

      if (
        request.filter?.providerProfileId &&
        record.providerProfileId !== request.filter.providerProfileId
      ) {
        return false
      }

      if (request.filter?.serviceType && record.serviceType !== request.filter.serviceType) {
        return false
      }

      if (request.filter?.status && record.status !== request.filter.status) {
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
      nextCursor:
        nextItem && lastItem
          ? encodeCursor({
              direction: request.sort.direction,
              field: request.sort.field,
              id: lastItem.id,
              value: lastItem[request.sort.field],
            })
          : null,
    }
  }

  async function softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<ProviderServiceRecord> {
    const current = requireActiveRecord(id)

    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'ProviderService',
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
    slots.delete(createServiceKey(current.providerProfileId, current.serviceType))
    return deleted
  }

  async function update(
    service: ProviderServiceRecord,
    expectedVersion: number,
  ): Promise<ProviderServiceRecord> {
    const current = requireActiveRecord(service.id)

    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'ProviderService',
        expectedVersion,
      })
    }

    const currentKey = createServiceKey(current.providerProfileId, current.serviceType)
    const nextKey = createServiceKey(service.providerProfileId, service.serviceType)
    const existingId = slots.get(nextKey)

    if (existingId && existingId !== service.id) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_services.providerProfileId_serviceType',
        entityName: 'ProviderService',
        value: nextKey,
      })
    }

    const updated = cloneRecord({
      ...service,
      createdAt: current.createdAt,
      createdBy: current.createdBy ?? null,
      deletedAt: current.deletedAt,
      id: current.id,
      schemaVersion: current.schemaVersion,
      updatedAt: parseUtcTimestamp(clock.now()),
      version: current.version + 1,
    })

    records.set(updated.id, updated)

    if (currentKey !== nextKey) {
      slots.delete(currentKey)
      slots.set(nextKey, updated.id)
    }

    return updated
  }

  return {
    clock,
    repository: {
      create,
      findById,
      findByProviderProfileAndType,
      list,
      softDelete,
      update,
    },
    uuidGenerator,
  }
}
