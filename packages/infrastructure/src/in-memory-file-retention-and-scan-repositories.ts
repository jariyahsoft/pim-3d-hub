import {
  RepositoryUniqueConstraintError,
  type CreateFileRetentionHoldInput,
  type CreateFileScanResultInput,
  type FileRetentionHoldFilter,
  type FileRetentionHoldRecord,
  type FileRetentionHoldRepository,
  type FileRetentionHoldSortField,
  type FileScanResultFilter,
  type FileScanResultRecord,
  type FileScanResultRepository,
  type FileScanResultSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain';

type ScanCursorPayload = Readonly<{
  direction: SortDirection;
  field: FileScanResultSortField;
  id: Uuidv7;
  value: string;
}>;

type HoldCursorPayload = Readonly<{
  direction: SortDirection;
  field: FileRetentionHoldSortField;
  id: Uuidv7;
  value: string;
}>;

function compareValues(
  left: string,
  right: string,
  direction: SortDirection,
): number {
  if (left === right) {
    return 0;
  }
  if (direction === 'asc') {
    return left < right ? -1 : 1;
  }
  return left > right ? -1 : 1;
}

function encodeScanCursor(payload: ScanCursorPayload): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload));
}

function encodeHoldCursor(payload: HoldCursorPayload): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeScanCursor(cursor: RepositoryCursor): ScanCursorPayload {
  const payload = JSON.parse(
    decodeURIComponent(cursor),
  ) as Partial<ScanCursorPayload>;
  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    (payload.field !== 'createdAt' && payload.field !== 'updatedAt') ||
    typeof payload.id !== 'string' ||
    typeof payload.value !== 'string'
  ) {
    throw new TypeError('Invalid repository cursor');
  }
  return {
    direction: payload.direction,
    field: payload.field,
    id: payload.id as Uuidv7,
    value: payload.value,
  };
}

function decodeHoldCursor(cursor: RepositoryCursor): HoldCursorPayload {
  const payload = JSON.parse(
    decodeURIComponent(cursor),
  ) as Partial<HoldCursorPayload>;
  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    (payload.field !== 'createdAt' &&
      payload.field !== 'updatedAt' &&
      payload.field !== 'expiresAt') ||
    typeof payload.id !== 'string' ||
    typeof payload.value !== 'string'
  ) {
    throw new TypeError('Invalid repository cursor');
  }
  return {
    direction: payload.direction,
    field: payload.field,
    id: payload.id as Uuidv7,
    value: payload.value,
  };
}

function compareScans(
  left: FileScanResultRecord,
  right: FileScanResultRecord,
  field: FileScanResultSortField,
  direction: SortDirection,
): number {
  const comparison = compareValues(left[field], right[field], direction);
  if (comparison !== 0) {
    return comparison;
  }
  return left.id.localeCompare(right.id);
}

function compareHolds(
  left: FileRetentionHoldRecord,
  right: FileRetentionHoldRecord,
  field: FileRetentionHoldSortField,
  direction: SortDirection,
): number {
  const leftValue = left[field] ?? '';
  const rightValue = right[field] ?? '';
  const comparison = compareValues(leftValue, rightValue, direction);
  if (comparison !== 0) {
    return comparison;
  }
  return left.id.localeCompare(right.id);
}

function cloneScan(record: FileScanResultRecord): FileScanResultRecord {
  return Object.freeze({
    ...record,
    findings: Object.freeze([...record.findings]),
  });
}

function cloneHold(record: FileRetentionHoldRecord): FileRetentionHoldRecord {
  return Object.freeze({ ...record });
}

export type InMemoryFileScanResultRepositoryHarness = Readonly<{
  repository: FileScanResultRepository;
}>;

export type InMemoryFileRetentionHoldRepositoryHarness = Readonly<{
  repository: FileRetentionHoldRepository;
}>;

export function createInMemoryFileScanResultRepository(
  input?: Readonly<{
    now?: () => Date;
  }>,
): InMemoryFileScanResultRepositoryHarness {
  const now = input?.now ?? (() => new Date());
  const records = new Map<Uuidv7, FileScanResultRecord>();

  return Object.freeze({
    repository: Object.freeze({
      async create(
        createInput: CreateFileScanResultInput,
      ): Promise<FileScanResultRecord> {
        const id = createInput.id ?? generateId();
        if (records.has(id)) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'file_scan_results.id',
            entityName: 'FileScanResult',
            value: id,
          });
        }
        const timestamp = now().toISOString() as UtcTimestamp;
        const record: FileScanResultRecord = Object.freeze({
          assetId: createInput.assetId,
          createdAt: timestamp,
          createdBy: null,
          deletedAt: null,
          engineVersion: createInput.engineVersion,
          finishedAt: createInput.finishedAt ?? null,
          findings: Object.freeze([...(createInput.findings ?? [])]),
          id,
          rawArtifactPath: createInput.rawArtifactPath ?? null,
          scannerName: createInput.scannerName,
          schemaVersion: 1,
          startedAt: createInput.startedAt,
          updatedAt: timestamp,
          updatedBy: null,
          verdict: createInput.verdict,
          version: 1,
        });
        records.set(id, record);
        return cloneScan(record);
      },

      async findLatestForAsset(
        assetId: Uuidv7,
      ): Promise<FileScanResultRecord | null> {
        let latest: FileScanResultRecord | null = null;
        for (const record of records.values()) {
          if (record.assetId !== assetId) {
            continue;
          }
          if (record.finishedAt === null) {
            continue;
          }
          if (
            !latest ||
            (latest.finishedAt !== null &&
              record.finishedAt > latest.finishedAt)
          ) {
            latest = record;
          }
        }
        return latest ? cloneScan(latest) : null;
      },

      async list(
        request: RepositoryListRequest<
          FileScanResultFilter,
          FileScanResultSortField
        >,
      ): Promise<RepositoryListPage<FileScanResultRecord>> {
        const filtered = [...records.values()].filter((record) => {
          if (
            request.filter?.assetId &&
            record.assetId !== request.filter.assetId
          ) {
            return false;
          }
          if (
            request.filter?.verdict &&
            record.verdict !== request.filter.verdict
          ) {
            return false;
          }
          return true;
        });
        filtered.sort((left, right) =>
          compareScans(left, right, request.sort.field, request.sort.direction),
        );
        const cursor = request.cursor ? decodeScanCursor(request.cursor) : null;
        const startIndex = cursor
          ? filtered.findIndex((record) => {
              const cmp = compareValues(
                record[cursor.field],
                cursor.value,
                cursor.direction,
              );
              if (cmp !== 0) {
                return cmp > 0;
              }
              return record.id.localeCompare(cursor.id) > 0;
            })
          : 0;
        const normalizedStartIndex =
          startIndex < 0 ? filtered.length : startIndex;
        const pageItems = filtered.slice(
          normalizedStartIndex,
          normalizedStartIndex + request.limit,
        );
        const nextItem = filtered[normalizedStartIndex + request.limit];
        const lastItem = pageItems[pageItems.length - 1];
        return {
          items: pageItems.map(cloneScan),
          nextCursor:
            nextItem && lastItem
              ? encodeScanCursor({
                  direction: request.sort.direction,
                  field: request.sort.field,
                  id: lastItem.id,
                  value: lastItem[request.sort.field],
                })
              : null,
        };
      },
    }),
  });
}

export function createInMemoryFileRetentionHoldRepository(
  input?: Readonly<{
    now?: () => Date;
  }>,
): InMemoryFileRetentionHoldRepositoryHarness {
  const now = input?.now ?? (() => new Date());
  const records = new Map<Uuidv7, FileRetentionHoldRecord>();

  function requireRecord(id: Uuidv7): FileRetentionHoldRecord {
    const record = records.get(id);
    if (!record) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'file_retention_holds.id',
        entityName: 'FileRetentionHold',
        value: id,
      });
    }
    return record;
  }

  return Object.freeze({
    repository: Object.freeze({
      async create(
        createInput: CreateFileRetentionHoldInput,
      ): Promise<FileRetentionHoldRecord> {
        const id = createInput.id ?? generateId();
        if (records.has(id)) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'file_retention_holds.id',
            entityName: 'FileRetentionHold',
            value: id,
          });
        }
        const timestamp = now().toISOString() as UtcTimestamp;
        const record: FileRetentionHoldRecord = Object.freeze({
          assetId: createInput.assetId,
          createdAt: timestamp,
          createdBy: createInput.heldByUserId ?? null,
          deletedAt: null,
          expiresAt: createInput.expiresAt ?? null,
          heldByUserId: createInput.heldByUserId ?? null,
          id,
          reason: createInput.reason,
          releasedAt: null,
          releasedByUserId: null,
          releaseReason: null,
          schemaVersion: 1,
          updatedAt: timestamp,
          updatedBy: createInput.heldByUserId ?? null,
          version: 1,
        });
        records.set(id, record);
        return cloneHold(record);
      },

      async findById(id: Uuidv7): Promise<FileRetentionHoldRecord | null> {
        const record = records.get(id);
        return record ? cloneHold(record) : null;
      },

      async list(
        request: RepositoryListRequest<
          FileRetentionHoldFilter,
          FileRetentionHoldSortField
        >,
      ): Promise<RepositoryListPage<FileRetentionHoldRecord>> {
        const filtered = [...records.values()].filter((record) => {
          if (
            request.filter?.assetId &&
            record.assetId !== request.filter.assetId
          ) {
            return false;
          }
          if (
            request.filter?.reason &&
            record.reason !== request.filter.reason
          ) {
            return false;
          }
          if (request.filter?.activeAt) {
            if (record.releasedAt !== null) {
              return false;
            }
            if (
              record.expiresAt !== null &&
              record.expiresAt <= request.filter.activeAt
            ) {
              return false;
            }
          }
          return true;
        });
        filtered.sort((left, right) =>
          compareHolds(left, right, request.sort.field, request.sort.direction),
        );
        const cursor = request.cursor ? decodeHoldCursor(request.cursor) : null;
        const startIndex = cursor
          ? filtered.findIndex((record) => {
              const value = record[cursor.field] ?? '';
              const cmp = compareValues(value, cursor.value, cursor.direction);
              if (cmp !== 0) {
                return cmp > 0;
              }
              return record.id.localeCompare(cursor.id) > 0;
            })
          : 0;
        const normalizedStartIndex =
          startIndex < 0 ? filtered.length : startIndex;
        const pageItems = filtered.slice(
          normalizedStartIndex,
          normalizedStartIndex + request.limit,
        );
        const nextItem = filtered[normalizedStartIndex + request.limit];
        const lastItem = pageItems[pageItems.length - 1];
        return {
          items: pageItems.map(cloneHold),
          nextCursor:
            nextItem && lastItem
              ? encodeHoldCursor({
                  direction: request.sort.direction,
                  field: request.sort.field,
                  id: lastItem.id,
                  value: lastItem[request.sort.field] ?? '',
                })
              : null,
        };
      },

      async update(
        hold: FileRetentionHoldRecord,
        expectedVersion: number,
      ): Promise<FileRetentionHoldRecord> {
        const current = requireRecord(hold.id);
        if (current.version !== expectedVersion) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'file_retention_holds.version',
            entityName: 'FileRetentionHold',
            value: `${expectedVersion}`,
          });
        }
        const timestamp = now().toISOString() as UtcTimestamp;
        const next: FileRetentionHoldRecord = Object.freeze({
          ...hold,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: timestamp,
          updatedBy: hold.updatedBy ?? current.updatedBy ?? null,
          version: current.version + 1,
        });
        records.set(next.id, next);
        return cloneHold(next);
      },
    }),
  });
}

let counter = 0;
function generateId(): Uuidv7 {
  counter += 1;
  const padded = String(counter).padStart(12, '0');
  return `018f18b2-4c4f-7c7a-9e12-${padded}` as Uuidv7;
}
