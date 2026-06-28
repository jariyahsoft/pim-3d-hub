import {
  type CreateServiceRequestInput,
  type JobDiscoveryFilter,
  type JobDiscoveryItemRecord,
  type JobDiscoveryQueryRepository,
  type JobDiscoverySortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type ServiceRequestRecord,
  type SortDirection,
  type Uuidv7,
} from '@pim/domain'

type CursorPayload = Readonly<{
  direction: SortDirection
  field: JobDiscoverySortField
  id: Uuidv7
  value: string
}>

function encodeCursor(payload: CursorPayload): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload))
}

function decodeCursor(cursor: RepositoryCursor): CursorPayload {
  const payload = JSON.parse(decodeURIComponent(cursor)) as Partial<CursorPayload>

  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    (payload.field !== 'publishedAt' &&
      payload.field !== 'dueAt' &&
      payload.field !== 'updatedAt') ||
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

function serviceRequestToJobItem(sr: ServiceRequestRecord): JobDiscoveryItemRecord {
  return Object.freeze({
    id: sr.id,
    schemaVersion: sr.schemaVersion,
    version: sr.version,
    createdAt: sr.createdAt,
    updatedAt: sr.updatedAt,
    deletedAt: sr.deletedAt,
    createdBy: sr.createdBy ?? null,
    updatedBy: sr.updatedBy ?? null,
    serviceRequestId: sr.id,
    budget: sr.budget,
    buyerUserId: sr.buyerUserId,
    category: sr.category,
    dueAt: sr.dueAt,
    hasPrivateAssets: sr.attachments.length > 0,
    organizationId: sr.organizationId,
    publishedAt: sr.publishedAt,
    quantity: sr.quantity,
    serviceRegion: sr.serviceRegion,
    serviceType: sr.serviceType,
    status: sr.status,
    title: sr.title,
    visibility: sr.visibility,
  })
}

function cloneJobItem(record: JobDiscoveryItemRecord): JobDiscoveryItemRecord {
  return Object.freeze({
    ...record,
    budget: record.budget ? Object.freeze({ ...record.budget }) : null,
  })
}

function compareRecords(
  left: JobDiscoveryItemRecord,
  right: JobDiscoveryItemRecord,
  field: JobDiscoverySortField,
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

function compareRecordToCursor(record: JobDiscoveryItemRecord, cursor: CursorPayload): number {
  const recordValue = record[cursor.field] ?? ''
  const valueComparison = compareValues(recordValue, cursor.value, cursor.direction)

  if (valueComparison !== 0) {
    return valueComparison
  }

  return record.id.localeCompare(cursor.id)
}

function matchesFilter(record: JobDiscoveryItemRecord, filter: JobDiscoveryFilter): boolean {
  if (filter.status && record.status !== filter.status) {
    return false
  }

  if (filter.visibility && record.visibility !== filter.visibility) {
    return false
  }

  if (filter.serviceType && record.serviceType !== filter.serviceType) {
    return false
  }

  if (filter.serviceRegion !== undefined && record.serviceRegion !== filter.serviceRegion) {
    return false
  }

  if (filter.category && record.category !== filter.category) {
    return false
  }

  if (filter.dueAtGte && (!record.dueAt || record.dueAt < filter.dueAtGte)) {
    return false
  }

  if (filter.dueAtLte && (!record.dueAt || record.dueAt > filter.dueAtLte)) {
    return false
  }

  if (filter.organizationId !== undefined && record.organizationId !== filter.organizationId) {
    return false
  }

  return true
}

export function createInMemoryJobDiscoveryRepository(
  serviceRequests: readonly ServiceRequestRecord[],
): JobDiscoveryQueryRepository {
  const items = serviceRequests.map(serviceRequestToJobItem)

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<JobDiscoveryItemRecord | null> {
    const includeDeleted = options?.includeDeleted ?? false
    const found = items.find((item) => item.serviceRequestId === id)

    if (!found) {
      return null
    }

    if (!includeDeleted && found.deletedAt !== null) {
      return null
    }

    return cloneJobItem(found)
  }

  async function list(
    request: RepositoryListRequest<JobDiscoveryFilter, JobDiscoverySortField>,
  ): Promise<RepositoryListPage<JobDiscoveryItemRecord>> {
    const {
      cursor: cursorInput,
      filter = {},
      limit,
      sort,
    } = request

    const sortDirection = sort.direction
    const sortField = sort.field

    const cursor = cursorInput ? decodeCursor(cursorInput) : null

    if (cursor && (cursor.direction !== sortDirection || cursor.field !== sortField)) {
      throw new TypeError('Cursor direction/field mismatch')
    }

    const filtered = items.filter(
      (item) => item.deletedAt === null && matchesFilter(item, filter),
    )

    const sorted = [...filtered].sort((left, right) =>
      compareRecords(left, right, sortField, sortDirection),
    )

    const startIndex = cursor
      ? sorted.findIndex((item) => compareRecordToCursor(item, cursor) > 0)
      : 0

    const effectiveStartIndex = startIndex === -1 ? sorted.length : startIndex
    const page = sorted.slice(effectiveStartIndex, effectiveStartIndex + limit)
    const hasMore = effectiveStartIndex + limit < sorted.length

    const nextCursor =
      hasMore && page.length > 0 && page[page.length - 1]
        ? encodeCursor({
            direction: sortDirection,
            field: sortField,
            id: page[page.length - 1]!.serviceRequestId,
            value: page[page.length - 1]![sortField] ?? '',
          })
        : null

    return {
      items: page.map(cloneJobItem),
      nextCursor,
    }
  }

  return Object.freeze({
    findById,
    list,
  })
}
