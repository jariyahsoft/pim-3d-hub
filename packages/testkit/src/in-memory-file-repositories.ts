import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type CreateFileAssetAccessGrantInput,
  type CreateFileAssetInput,
  type FileAssetAccessGrantFilter,
  type FileAssetAccessGrantRecord,
  type FileAssetAccessGrantRepository,
  type FileAssetAccessGrantSortField,
  type FileAssetFilter,
  type FileAssetRecord,
  type FileAssetRepository,
  type FileAssetSortField,
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

type AssetCursorPayload = Readonly<{
  direction: SortDirection
  field: FileAssetSortField
  id: Uuidv7
  value: string
}>

type GrantCursorPayload = Readonly<{
  direction: SortDirection
  field: FileAssetAccessGrantSortField
  id: Uuidv7
  value: string
}>

export type InMemoryFileAssetRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: FileAssetRepository
  uuidGenerator: UuidGeneratorPort
}>

export type InMemoryFileAssetAccessGrantRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: FileAssetAccessGrantRepository
  uuidGenerator: UuidGeneratorPort
}>

function encodeCursor<TPayload extends AssetCursorPayload | GrantCursorPayload>(
  payload: TPayload,
): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload))
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

function decodeAssetCursor(cursor: RepositoryCursor): AssetCursorPayload {
  const payload = JSON.parse(decodeURIComponent(cursor)) as Partial<AssetCursorPayload>
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

function decodeGrantCursor(cursor: RepositoryCursor): GrantCursorPayload {
  const payload = JSON.parse(decodeURIComponent(cursor)) as Partial<GrantCursorPayload>
  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    (payload.field !== 'createdAt' &&
      payload.field !== 'updatedAt' &&
      payload.field !== 'expiresAt') ||
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

function cloneAsset(record: FileAssetRecord): FileAssetRecord {
  return Object.freeze({ ...record })
}

function cloneGrant(record: FileAssetAccessGrantRecord): FileAssetAccessGrantRecord {
  return Object.freeze({ ...record })
}

function compareAssets(
  left: FileAssetRecord,
  right: FileAssetRecord,
  field: FileAssetSortField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(left[field], right[field], direction)
  if (fieldComparison !== 0) {
    return fieldComparison
  }
  return left.id.localeCompare(right.id)
}

function compareGrants(
  left: FileAssetAccessGrantRecord,
  right: FileAssetAccessGrantRecord,
  field: FileAssetAccessGrantSortField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(left[field], right[field], direction)
  if (fieldComparison !== 0) {
    return fieldComparison
  }
  return left.id.localeCompare(right.id)
}

export function createInMemoryFileAssetRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryFileAssetRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, FileAssetRecord>()

  function requireRecord(id: Uuidv7): FileAssetRecord {
    const record = records.get(id)
    if (!record || record.deletedAt !== null) {
      throw new Error(`FileAsset ${id} was not found`)
    }
    return record
  }

  return Object.freeze({
    clock,
    repository: Object.freeze({
      async create(createInput: CreateFileAssetInput): Promise<FileAssetRecord> {
        const id = createInput.id ?? uuidGenerator.next()
        if (records.has(id)) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'file_assets.id',
            entityName: 'FileAsset',
            value: id,
          })
        }

        const now = clock.now()
        const record: FileAssetRecord = Object.freeze({
          checksumSha256: createInput.checksumSha256 ?? null,
          createdAt: now,
          createdBy: createInput.createdBy ?? null,
          deletedAt: null,
          id,
          mimeType: createInput.mimeType,
          objectKey: createInput.objectKey,
          organizationId: createInput.organizationId ?? null,
          originalFilename: createInput.originalFilename,
          ownerUserId: createInput.ownerUserId,
          purpose: createInput.purpose,
          schemaVersion: 1,
          sizeBytes: createInput.sizeBytes,
          sourceAssetId: createInput.sourceAssetId ?? null,
          status: createInput.status ?? 'READY',
          storageProvider: createInput.storageProvider,
          updatedAt: now,
          updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
          version: 1,
          visibility: createInput.visibility ?? 'PRIVATE',
        })

        records.set(id, record)
        return cloneAsset(record)
      },

      async findById(
        id: Uuidv7,
        options?: Readonly<{ includeDeleted?: boolean }>,
      ): Promise<FileAssetRecord | null> {
        const record = records.get(id)
        if (!record) {
          return null
        }
        if (!options?.includeDeleted && record.deletedAt !== null) {
          return null
        }
        return cloneAsset(record)
      },

      async list(
        request: RepositoryListRequest<FileAssetFilter, FileAssetSortField>,
      ): Promise<RepositoryListPage<FileAssetRecord>> {
        const filtered = [...records.values()].filter((record) => {
          if (!request.includeDeleted && record.deletedAt !== null) {
            return false
          }
          if (request.filter?.ownerUserId && record.ownerUserId !== request.filter.ownerUserId) {
            return false
          }
          if (request.filter?.visibility && record.visibility !== request.filter.visibility) {
            return false
          }
          if (request.filter?.status && record.status !== request.filter.status) {
            return false
          }
          if (
            request.filter?.organizationId !== undefined &&
            record.organizationId !== request.filter.organizationId
          ) {
            return false
          }
          if (
            request.filter?.sourceAssetId !== undefined &&
            record.sourceAssetId !== request.filter.sourceAssetId
          ) {
            return false
          }
          return true
        })

        filtered.sort((left, right) =>
          compareAssets(left, right, request.sort.field, request.sort.direction),
        )

        const cursor = request.cursor ? decodeAssetCursor(request.cursor) : null
        const startIndex = cursor
          ? filtered.findIndex((record) => {
              const cmp = compareValues(record[cursor.field], cursor.value, cursor.direction)
              if (cmp !== 0) {
                return cmp > 0
              }
              return record.id.localeCompare(cursor.id) > 0
            })
          : 0
        const normalizedStartIndex = startIndex < 0 ? filtered.length : startIndex
        const pageItems = filtered.slice(normalizedStartIndex, normalizedStartIndex + request.limit)
        const nextItem = filtered[normalizedStartIndex + request.limit]
        const lastItem = pageItems[pageItems.length - 1]

        return {
          items: pageItems.map((record) => cloneAsset(record)),
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
      },

      async update(asset: FileAssetRecord, expectedVersion: number): Promise<FileAssetRecord> {
        const current = requireRecord(asset.id)
        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'FileAsset',
            expectedVersion,
          })
        }

        const next: FileAssetRecord = Object.freeze({
          ...asset,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: clock.now(),
          updatedBy: asset.updatedBy ?? null,
          version: current.version + 1,
        })
        records.set(next.id, next)
        return cloneAsset(next)
      },
    }),
    uuidGenerator,
  })
}

export function createInMemoryFileAssetAccessGrantRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryFileAssetAccessGrantRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, FileAssetAccessGrantRecord>()

  function requireRecord(id: Uuidv7): FileAssetAccessGrantRecord {
    const record = records.get(id)
    if (!record) {
      throw new Error(`FileAssetAccessGrant ${id} was not found`)
    }
    return record
  }

  return Object.freeze({
    clock,
    repository: Object.freeze({
      async create(
        createInput: CreateFileAssetAccessGrantInput,
      ): Promise<FileAssetAccessGrantRecord> {
        const id = createInput.id ?? uuidGenerator.next()
        if (records.has(id)) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'file_asset_access_grants.id',
            entityName: 'FileAssetAccessGrant',
            value: id,
          })
        }

        const now = clock.now()
        const record: FileAssetAccessGrantRecord = Object.freeze({
          assetId: createInput.assetId,
          contextId: createInput.contextId,
          contextType: createInput.contextType,
          createdAt: now,
          createdBy: createInput.createdBy ?? null,
          deletedAt: null,
          expiresAt: createInput.expiresAt,
          grantedByUserId: createInput.grantedByUserId,
          granteeUserId: createInput.granteeUserId,
          id,
          permissionCode: createInput.permissionCode ?? 'READ',
          revokedAt: createInput.revokedAt ?? null,
          revokedReason: createInput.revokedReason ?? null,
          schemaVersion: 1,
          updatedAt: now,
          updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
          version: 1,
        })

        records.set(id, record)
        return cloneGrant(record)
      },

      async findById(id: Uuidv7): Promise<FileAssetAccessGrantRecord | null> {
        const record = records.get(id)
        return record ? cloneGrant(record) : null
      },

      async list(
        request: RepositoryListRequest<FileAssetAccessGrantFilter, FileAssetAccessGrantSortField>,
      ): Promise<RepositoryListPage<FileAssetAccessGrantRecord>> {
        const filtered = [...records.values()].filter((record) => {
          if (request.filter?.assetId && record.assetId !== request.filter.assetId) {
            return false
          }
          if (request.filter?.granteeUserId && record.granteeUserId !== request.filter.granteeUserId) {
            return false
          }
          if (request.filter?.grantedByUserId && record.grantedByUserId !== request.filter.grantedByUserId) {
            return false
          }
          if (request.filter?.contextType && record.contextType !== request.filter.contextType) {
            return false
          }
          if (request.filter?.contextId && record.contextId !== request.filter.contextId) {
            return false
          }
          if (request.filter?.activeAt) {
            if (record.revokedAt !== null) {
              return false
            }
            if (record.expiresAt <= request.filter.activeAt) {
              return false
            }
          }
          return true
        })

        filtered.sort((left, right) =>
          compareGrants(left, right, request.sort.field, request.sort.direction),
        )

        const cursor = request.cursor ? decodeGrantCursor(request.cursor) : null
        const startIndex = cursor
          ? filtered.findIndex((record) => {
              const cmp = compareValues(record[cursor.field], cursor.value, cursor.direction)
              if (cmp !== 0) {
                return cmp > 0
              }
              return record.id.localeCompare(cursor.id) > 0
            })
          : 0
        const normalizedStartIndex = startIndex < 0 ? filtered.length : startIndex
        const pageItems = filtered.slice(normalizedStartIndex, normalizedStartIndex + request.limit)
        const nextItem = filtered[normalizedStartIndex + request.limit]
        const lastItem = pageItems[pageItems.length - 1]

        return {
          items: pageItems.map((record) => cloneGrant(record)),
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
      },

      async update(
        grant: FileAssetAccessGrantRecord,
        expectedVersion: number,
      ): Promise<FileAssetAccessGrantRecord> {
        const current = requireRecord(grant.id)
        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'FileAssetAccessGrant',
            expectedVersion,
          })
        }

        const next: FileAssetAccessGrantRecord = Object.freeze({
          ...grant,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: clock.now(),
          updatedBy: grant.updatedBy ?? null,
          version: current.version + 1,
        })

        records.set(next.id, next)
        return cloneGrant(next)
      },
    }),
    uuidGenerator,
  })
}
