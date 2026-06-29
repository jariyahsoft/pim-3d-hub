import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type CreateFileUploadSessionInput,
  type FileUploadSessionFilter,
  type FileUploadSessionRecord,
  type FileUploadSessionRepository,
  type FileUploadSessionSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
  type Uuidv7,
} from '@pim/domain';
import {
  createFakeClock,
  createFakeUuidGenerator,
  type ClockPort,
  type UuidGeneratorPort,
} from './repository-fakes.js';

type CursorPayload = Readonly<{
  direction: SortDirection;
  field: FileUploadSessionSortField;
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

function encodeCursor(payload: CursorPayload): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeCursor(cursor: RepositoryCursor): CursorPayload {
  const payload = JSON.parse(
    decodeURIComponent(cursor),
  ) as Partial<CursorPayload>;
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

function compareSessions(
  left: FileUploadSessionRecord,
  right: FileUploadSessionRecord,
  field: FileUploadSessionSortField,
  direction: SortDirection,
): number {
  const comparison = compareValues(left[field], right[field], direction);
  if (comparison !== 0) {
    return comparison;
  }
  return left.id.localeCompare(right.id);
}

function clone(record: FileUploadSessionRecord): FileUploadSessionRecord {
  return Object.freeze({ ...record });
}

export type InMemoryFileUploadSessionRepositoryHarness = Readonly<{
  clock: ClockPort;
  repository: FileUploadSessionRepository;
  uuidGenerator: UuidGeneratorPort;
}>;

export function createInMemoryFileUploadSessionRepository(input?: {
  clock?: ClockPort;
  uuidGenerator?: UuidGeneratorPort;
}): InMemoryFileUploadSessionRepositoryHarness {
  const clock = input?.clock ?? createFakeClock();
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator();
  const records = new Map<Uuidv7, FileUploadSessionRecord>();

  function requireRecord(id: Uuidv7): FileUploadSessionRecord {
    const record = records.get(id);
    if (!record) {
      throw new Error(`FileUploadSession ${id} was not found`);
    }
    return record;
  }

  return Object.freeze({
    clock,
    repository: Object.freeze({
      async create(
        createInput: CreateFileUploadSessionInput,
      ): Promise<FileUploadSessionRecord> {
        const id = createInput.id ?? uuidGenerator.next();
        if (records.has(id)) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'file_upload_sessions.id',
            entityName: 'FileUploadSession',
            value: id,
          });
        }
        const now = clock.now();
        const record: FileUploadSessionRecord = Object.freeze({
          actorUserId: createInput.actorUserId,
          assetId: createInput.assetId,
          checksumSha256: createInput.checksumSha256 ?? null,
          createdAt: now,
          createdBy: createInput.actorUserId,
          deletedAt: null,
          expectedSizeBytes: createInput.expectedSizeBytes,
          expiresAt: createInput.expiresAt,
          id,
          kind: createInput.kind ?? 'RESUMABLE',
          maxChunkBytes: createInput.maxChunkBytes ?? null,
          mimeType: createInput.mimeType,
          objectKey: createInput.objectKey,
          organizationId: createInput.organizationId ?? null,
          originalFilename: createInput.originalFilename,
          purpose: createInput.purpose,
          receivedBytes: 0,
          receivedChunks: 0,
          schemaVersion: 1,
          status: 'OPEN',
          storageProvider: createInput.storageProvider,
          updatedAt: now,
          updatedBy: createInput.actorUserId,
          version: 1,
          visibility: createInput.visibility ?? 'PRIVATE',
        });
        records.set(id, record);
        return clone(record);
      },

      async findById(id: Uuidv7): Promise<FileUploadSessionRecord | null> {
        const record = records.get(id);
        return record ? clone(record) : null;
      },

      async list(
        request: RepositoryListRequest<
          FileUploadSessionFilter,
          FileUploadSessionSortField
        >,
      ): Promise<RepositoryListPage<FileUploadSessionRecord>> {
        const filtered = [...records.values()].filter((record) => {
          if (
            request.filter?.actorUserId &&
            record.actorUserId !== request.filter.actorUserId
          ) {
            return false;
          }
          if (
            request.filter?.assetId &&
            record.assetId !== request.filter.assetId
          ) {
            return false;
          }
          if (
            request.filter?.status &&
            record.status !== request.filter.status
          ) {
            return false;
          }
          return true;
        });
        filtered.sort((left, right) =>
          compareSessions(
            left,
            right,
            request.sort.field,
            request.sort.direction,
          ),
        );

        const cursor = request.cursor ? decodeCursor(request.cursor) : null;
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
          items: pageItems.map((record) => clone(record)),
          nextCursor:
            nextItem && lastItem
              ? encodeCursor({
                  direction: request.sort.direction,
                  field: request.sort.field,
                  id: lastItem.id,
                  value: lastItem[request.sort.field],
                })
              : null,
        };
      },

      async update(
        session: FileUploadSessionRecord,
        expectedVersion: number,
      ): Promise<FileUploadSessionRecord> {
        const current = requireRecord(session.id);
        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'FileUploadSession',
            expectedVersion,
          });
        }
        const next: FileUploadSessionRecord = Object.freeze({
          ...session,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: clock.now(),
          updatedBy: session.updatedBy ?? current.updatedBy ?? null,
          version: current.version + 1,
        });
        records.set(next.id, next);
        return clone(next);
      },
    }),
    uuidGenerator,
  });
}
