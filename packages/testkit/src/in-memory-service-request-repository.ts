import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type CreateServiceRequestInput,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type ServiceRequestFilter,
  type ServiceRequestRecord,
  type ServiceRequestRepository,
  type ServiceRequestSortField,
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
  field: ServiceRequestSortField
  id: Uuidv7
  value: string
}>

export type InMemoryServiceRequestRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: ServiceRequestRepository
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
    (payload.field !== 'createdAt' &&
      payload.field !== 'updatedAt' &&
      payload.field !== 'publishedAt') ||
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

function cloneRecord(record: ServiceRequestRecord): ServiceRequestRecord {
  return Object.freeze({
    ...record,
    attachments: record.attachments.map((attachment) => Object.freeze({ ...attachment })),
    budget: record.budget ? Object.freeze({ ...record.budget }) : null,
    statusHistory: record.statusHistory.map((entry) => Object.freeze({ ...entry })),
  })
}

function compareRecords(
  left: ServiceRequestRecord,
  right: ServiceRequestRecord,
  field: ServiceRequestSortField,
  direction: SortDirection,
): number {
  const leftValue = left[field] ?? ''
  const rightValue = right[field] ?? ''
  const fieldComparison = compareValues(leftValue, rightValue, direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return left.id.localeCompare(right.id)
}

function compareRecordToCursor(record: ServiceRequestRecord, cursor: CursorPayload): number {
  const fieldComparison = compareValues(record[cursor.field] ?? '', cursor.value, cursor.direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return record.id.localeCompare(cursor.id)
}

export function createInMemoryServiceRequestRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryServiceRequestRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, ServiceRequestRecord>()

  function requireActiveRecord(id: Uuidv7): ServiceRequestRecord {
    const record = records.get(id)

    if (!record || record.deletedAt !== null) {
      throw new Error(`ServiceRequest ${id} was not found`)
    }

    return record
  }

  return Object.freeze({
    clock,
    repository: Object.freeze({
      async create(createInput: CreateServiceRequestInput): Promise<ServiceRequestRecord> {
        const id = createInput.id ?? uuidGenerator.next()
        if (records.has(id)) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'service_requests.id',
            entityName: 'ServiceRequest',
            value: id,
          })
        }

        const now = clock.now()
        const record: ServiceRequestRecord = Object.freeze({
          attachments: (createInput.attachments ?? []).map((attachment) => Object.freeze({ ...attachment })),
          budget: createInput.budget ? Object.freeze({ ...createInput.budget }) : null,
          buyerUserId: createInput.buyerUserId,
          category: createInput.category ?? null,
          closedAt: createInput.closedAt ?? null,
          createdAt: now,
          createdBy: createInput.createdBy ?? null,
          deletedAt: null,
          description: createInput.description ?? null,
          dueAt: createInput.dueAt ?? null,
          id,
          objective: createInput.objective ?? null,
          organizationId: createInput.organizationId ?? null,
          prohibitedWorkAcknowledged: createInput.prohibitedWorkAcknowledged ?? false,
          publishedAt: createInput.publishedAt ?? null,
          quantity: createInput.quantity ?? null,
          schemaVersion: 1,
          serviceRegion: createInput.serviceRegion ?? null,
          serviceType: createInput.serviceType ?? null,
          status: createInput.status ?? 'DRAFT',
          statusHistory: (createInput.statusHistory ?? []).map((entry) => Object.freeze({ ...entry })),
          title: createInput.title ?? null,
          updatedAt: now,
          updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
          version: 1,
          visibility: createInput.visibility ?? 'PRIVATE_DIRECT',
        })

        records.set(id, record)
        return cloneRecord(record)
      },

      async findById(
        id: Uuidv7,
        options?: Readonly<{ includeDeleted?: boolean }>,
      ): Promise<ServiceRequestRecord | null> {
        const record = records.get(id)
        if (!record) {
          return null
        }
        if (!options?.includeDeleted && record.deletedAt !== null) {
          return null
        }
        return cloneRecord(record)
      },

      async list(
        request: RepositoryListRequest<ServiceRequestFilter, ServiceRequestSortField>,
      ): Promise<RepositoryListPage<ServiceRequestRecord>> {
        if (request.limit <= 0) {
          throw new RangeError('Repository list limit must be greater than zero')
        }

        const filtered = [...records.values()].filter((record) => {
          if (!request.includeDeleted && record.deletedAt !== null) {
            return false
          }
          if (request.filter?.buyerUserId && record.buyerUserId !== request.filter.buyerUserId) {
            return false
          }
          if (request.filter?.serviceType && record.serviceType !== request.filter.serviceType) {
            return false
          }
          if (request.filter?.status && record.status !== request.filter.status) {
            return false
          }
          if (request.filter?.visibility && record.visibility !== request.filter.visibility) {
            return false
          }
          if (
            request.filter?.serviceRegion !== undefined &&
            record.serviceRegion !== request.filter.serviceRegion
          ) {
            return false
          }
          if (
            request.filter?.organizationId !== undefined &&
            record.organizationId !== request.filter.organizationId
          ) {
            return false
          }
          if (request.filter?.dueAtGte && (!record.dueAt || record.dueAt < request.filter.dueAtGte)) {
            return false
          }
          if (request.filter?.dueAtLte && (!record.dueAt || record.dueAt > request.filter.dueAtLte)) {
            return false
          }
          return true
        })

        filtered.sort((left, right) =>
          compareRecords(left, right, request.sort.field, request.sort.direction),
        )

        const startIndex = request.cursor
          ? filtered.findIndex((record) => compareRecordToCursor(record, decodeCursor(request.cursor!)) > 0)
          : 0
        const normalizedStartIndex = startIndex < 0 ? filtered.length : startIndex
        const pageItems = filtered.slice(normalizedStartIndex, normalizedStartIndex + request.limit)
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
                  value: lastItem[request.sort.field] ?? '',
                })
              : null,
        }
      },

      async update(
        serviceRequest: ServiceRequestRecord,
        expectedVersion: number,
      ): Promise<ServiceRequestRecord> {
        const current = requireActiveRecord(serviceRequest.id)

        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'ServiceRequest',
            expectedVersion,
          })
        }

        const next: ServiceRequestRecord = Object.freeze({
          ...serviceRequest,
          attachments: serviceRequest.attachments.map((attachment) => Object.freeze({ ...attachment })),
          budget: serviceRequest.budget ? Object.freeze({ ...serviceRequest.budget }) : null,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          statusHistory: serviceRequest.statusHistory.map((entry) => Object.freeze({ ...entry })),
          updatedAt: clock.now(),
          updatedBy: serviceRequest.updatedBy ?? null,
          version: current.version + 1,
        })

        records.set(next.id, next)
        return cloneRecord(next)
      },
    }),
    uuidGenerator,
  })
}
