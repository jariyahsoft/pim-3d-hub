import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type AnalysisRequestFilter,
  type AnalysisRequestRecord,
  type AnalysisRequestRepository,
  type AnalysisRequestSortField,
  type CreateAnalysisRequestInput,
  type CreateModelAnalysisInput,
  type ModelAnalysisFilter,
  type ModelAnalysisRecord,
  type ModelAnalysisRepository,
  type ModelAnalysisSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain';

type AnalysisCursorPayload = Readonly<{
  direction: SortDirection;
  field: string;
  id: Uuidv7;
  value: string;
}>;

function compareValues(
  left: string,
  right: string,
  direction: SortDirection,
): number {
  if (left === right) return 0;
  if (direction === 'asc') return left < right ? -1 : 1;
  return left > right ? -1 : 1;
}

function encodeCursor(payload: AnalysisCursorPayload): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeCursor(cursor: RepositoryCursor): AnalysisCursorPayload {
  const payload = JSON.parse(
    decodeURIComponent(cursor),
  ) as Partial<AnalysisCursorPayload>;
  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    typeof payload.id !== 'string' ||
    typeof payload.value !== 'string'
  ) {
    throw new TypeError('Invalid repository cursor');
  }
  return {
    direction: payload.direction as SortDirection,
    field: payload.field as string,
    id: payload.id as Uuidv7,
    value: payload.value as string,
  };
}

function compareAnalyses(
  left: ModelAnalysisRecord,
  right: ModelAnalysisRecord,
  field: string,
  direction: SortDirection,
): number {
  const leftVal = getSortValue(left, field);
  const rightVal = getSortValue(right, field);
  const cmp = compareValues(leftVal, rightVal, direction);
  if (cmp !== 0) return cmp;
  return left.id.localeCompare(right.id);
}

function getSortValue(record: ModelAnalysisRecord, field: string): string {
  if (field === 'createdAt') return record.createdAt;
  if (field === 'updatedAt') return record.updatedAt;
  if (field === 'startedAt') return record.startedAt ?? record.createdAt;
  const v = (record as Record<string, unknown>)[field];
  return typeof v === 'string' ? v : '';
}

function compareRequests(
  left: AnalysisRequestRecord,
  right: AnalysisRequestRecord,
  field: string,
  direction: SortDirection,
): number {
  const leftVal = field === 'createdAt' ? left.createdAt : left.updatedAt;
  const rightVal = field === 'createdAt' ? right.createdAt : right.updatedAt;
  const cmp = compareValues(leftVal, rightVal, direction);
  if (cmp !== 0) return cmp;
  return left.id.localeCompare(right.id);
}

function cloneAnalysis(record: ModelAnalysisRecord): ModelAnalysisRecord {
  return Object.freeze({
    ...record,
    boundsMm: Object.freeze([...record.boundsMm] as [number, number, number]),
  });
}

function cloneRequest(record: AnalysisRequestRecord): AnalysisRequestRecord {
  return Object.freeze({ ...record });
}

export type InMemoryModelAnalysisRepositoryHarness = Readonly<{
  repository: ModelAnalysisRepository;
}>;

export function createInMemoryModelAnalysisRepository(
  input?: Readonly<{ now?: () => Date }>,
): InMemoryModelAnalysisRepositoryHarness {
  const now = input?.now ?? (() => new Date());
  const records = new Map<Uuidv7, ModelAnalysisRecord>();

  function getOrThrow(id: Uuidv7): ModelAnalysisRecord {
    const r = records.get(id);
    if (!r) throw new Error(`ModelAnalysis ${id} not found`);
    return r;
  }

  function makeRecord(
    createInput: CreateModelAnalysisInput,
    id: Uuidv7,
  ): ModelAnalysisRecord {
    const timestamp = now().toISOString() as UtcTimestamp;
    return Object.freeze({
      analyzerVersion: createInput.analyzerVersion,
      assetId: createInput.assetId,
      boundsMm:
        createInput.boundsMm !== undefined
          ? (Object.freeze([...createInput.boundsMm]) as [
              number,
              number,
              number,
            ])
          : ([0, 0, 0] as [number, number, number]),
      createdAt: timestamp,
      createdBy: createInput.createdBy ?? null,
      deletedAt: null,
      durationMs: createInput.durationMs ?? null,
      eligibilityHints:
        createInput.eligibilityHints ??
        Object.freeze({
          materialSuggestion: null,
          maxAngleDeg: null,
          minWallThicknessMm: null,
          overhangPercentage: null,
          printVolumeEligible: true,
          shellThicknessWarning: false,
          supportRequired: false,
        }),
      endedAt: createInput.endedAt ?? null,
      failureReason: createInput.failureReason ?? null,
      fileAssetId: createInput.fileAssetId,
      id,
      meshHealth:
        createInput.meshHealth ??
        Object.freeze({
          degenerateFacets: 0,
          edgesManifold: true,
          hasSolidOrientation: true,
          holes: 0,
          volumeClosed: true,
        }),
      resourceProfile: createInput.resourceProfile ?? {
        maxMemoryBytes: 0,
        maxTimeMs: 0,
      },
      schemaVersion: 1,
      startedAt: createInput.startedAt ?? null,
      status: createInput.status ?? 'PENDING',
      units: createInput.units ?? 'UNKNOWN',
      updatedAt: timestamp,
      updatedBy: createInput.updatedBy ?? null,
      version: 1,
      volumeMm3: createInput.volumeMm3 ?? 0,
    });
  }

  return Object.freeze({
    repository: Object.freeze({
      async create(
        createInput: CreateModelAnalysisInput,
      ): Promise<ModelAnalysisRecord> {
        const id = createInput.id ?? generateAnalysisId();
        if (records.has(id))
          throw new RepositoryUniqueConstraintError({
            constraintName: 'model_analyses.id',
            entityName: 'ModelAnalysis',
            value: id,
          });
        const record = makeRecord(createInput, id);
        records.set(id, record);
        return cloneAnalysis(record);
      },

      async findById(id: Uuidv7): Promise<ModelAnalysisRecord | null> {
        const record = records.get(id);
        return record ? cloneAnalysis(record) : null;
      },

      async findLatestForAsset(
        assetId: Uuidv7,
      ): Promise<ModelAnalysisRecord | null> {
        let latest: ModelAnalysisRecord | null = null;
        for (const record of records.values()) {
          if (record.assetId !== assetId) continue;
          if (!latest || record.createdAt > latest.createdAt) {
            latest = record;
          }
        }
        return latest ? cloneAnalysis(latest) : null;
      },

      async list(
        request: RepositoryListRequest<
          ModelAnalysisFilter,
          ModelAnalysisSortField
        >,
      ): Promise<RepositoryListPage<ModelAnalysisRecord>> {
        let filtered = [...records.values()];
        if (request.filter?.assetId)
          filtered = filtered.filter(
            (r) => r.assetId === request.filter!.assetId,
          );
        if (request.filter?.fileAssetId)
          filtered = filtered.filter(
            (r) => r.fileAssetId === request.filter!.fileAssetId,
          );
        if (request.filter?.status)
          filtered = filtered.filter(
            (r) => r.status === request.filter!.status,
          );
        filtered.sort((a, b) =>
          compareAnalyses(a, b, request.sort.field, request.sort.direction),
        );
        const cursor = request.cursor ? decodeCursor(request.cursor) : null;
        const startIndex = cursor
          ? filtered.findIndex((r) => {
              const val = getSortValue(r, cursor.field);
              const cmp = compareValues(val, cursor.value, cursor.direction);
              if (cmp !== 0) return cmp > 0;
              return r.id.localeCompare(cursor.id) > 0;
            })
          : 0;
        const normalizedStart = startIndex < 0 ? filtered.length : startIndex;
        const pageItems = filtered.slice(
          normalizedStart,
          normalizedStart + request.limit,
        );
        const nextItem = filtered[normalizedStart + request.limit];
        const lastItem = pageItems[pageItems.length - 1];
        return {
          items: pageItems.map(cloneAnalysis),
          nextCursor:
            nextItem && lastItem
              ? encodeCursor({
                  direction: request.sort.direction,
                  field: request.sort.field,
                  id: lastItem.id,
                  value: getSortValue(lastItem, request.sort.field),
                })
              : null,
        };
      },

      async update(
        analysis: ModelAnalysisRecord,
        expectedVersion: number,
      ): Promise<ModelAnalysisRecord> {
        const current = getOrThrow(analysis.id);
        if (current.version !== expectedVersion)
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'ModelAnalysis',
            expectedVersion,
          });
        const timestamp = now().toISOString() as UtcTimestamp;
        const next: ModelAnalysisRecord = Object.freeze({
          ...analysis,
          boundsMm: Object.freeze([...analysis.boundsMm]) as [
            number,
            number,
            number,
          ],
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: timestamp,
          updatedBy: analysis.updatedBy ?? current.updatedBy ?? null,
          version: current.version + 1,
        });
        records.set(next.id, next);
        return cloneAnalysis(next);
      },
    }),
  });
}

export type InMemoryAnalysisRequestRepositoryHarness = Readonly<{
  repository: AnalysisRequestRepository;
}>;

export function createInMemoryAnalysisRequestRepository(
  input?: Readonly<{ now?: () => Date }>,
): InMemoryAnalysisRequestRepositoryHarness {
  const now = input?.now ?? (() => new Date());
  const records = new Map<Uuidv7, AnalysisRequestRecord>();

  function getOrThrow(id: Uuidv7): AnalysisRequestRecord {
    const r = records.get(id);
    if (!r) throw new Error(`AnalysisRequest ${id} not found`);
    return r;
  }

  return Object.freeze({
    repository: Object.freeze({
      async create(
        input: CreateAnalysisRequestInput,
      ): Promise<AnalysisRequestRecord> {
        const id = input.id ?? generateAnalysisId();
        if (records.has(id))
          throw new RepositoryUniqueConstraintError({
            constraintName: 'analysis_requests.id',
            entityName: 'AnalysisRequest',
            value: id,
          });
        const timestamp = now().toISOString() as UtcTimestamp;
        const record: AnalysisRequestRecord = Object.freeze({
          analysisId: input.analysisId ?? null,
          assetId: input.assetId,
          attemptCount: input.attemptCount ?? 0,
          createdAt: timestamp,
          createdBy: input.createdBy ?? null,
          deletedAt: null,
          id,
          lastError: input.lastError ?? null,
          nextRetryAt: input.nextRetryAt ?? null,
          retryCategory: input.retryCategory ?? 'RETRY_TRANSIENT',
          schemaVersion: 1,
          status: input.status ?? 'QUEUED',
          triggerEvent: input.triggerEvent,
          updatedAt: timestamp,
          updatedBy: input.updatedBy ?? null,
          version: 1,
        });
        records.set(id, record);
        return cloneRequest(record);
      },

      async findById(id: Uuidv7): Promise<AnalysisRequestRecord | null> {
        const record = records.get(id);
        return record ? cloneRequest(record) : null;
      },

      async list(
        request: RepositoryListRequest<
          AnalysisRequestFilter,
          AnalysisRequestSortField
        >,
      ): Promise<RepositoryListPage<AnalysisRequestRecord>> {
        let filtered = [...records.values()];
        if (request.filter?.assetId)
          filtered = filtered.filter(
            (r) => r.assetId === request.filter!.assetId,
          );
        if (request.filter?.status)
          filtered = filtered.filter(
            (r) => r.status === request.filter!.status,
          );
        filtered.sort((a, b) =>
          compareRequests(a, b, request.sort.field, request.sort.direction),
        );
        const cursor = request.cursor ? decodeCursor(request.cursor) : null;
        const startIndex = cursor
          ? filtered.findIndex((r) => {
              const val =
                request.sort.field === 'createdAt' ? r.createdAt : r.updatedAt;
              const cmp = compareValues(val, cursor.value, cursor.direction);
              if (cmp !== 0) return cmp > 0;
              return r.id.localeCompare(cursor.id) > 0;
            })
          : 0;
        const normalizedStart = startIndex < 0 ? filtered.length : startIndex;
        const pageItems = filtered.slice(
          normalizedStart,
          normalizedStart + request.limit,
        );
        const nextItem = filtered[normalizedStart + request.limit];
        const lastItem = pageItems[pageItems.length - 1];
        return {
          items: pageItems.map(cloneRequest),
          nextCursor:
            nextItem && lastItem
              ? encodeCursor({
                  direction: request.sort.direction,
                  field: request.sort.field,
                  id: lastItem.id,
                  value:
                    request.sort.field === 'createdAt'
                      ? lastItem.createdAt
                      : lastItem.updatedAt,
                })
              : null,
        };
      },

      async update(
        req: AnalysisRequestRecord,
        expectedVersion: number,
      ): Promise<AnalysisRequestRecord> {
        const current = getOrThrow(req.id);
        if (current.version !== expectedVersion)
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'AnalysisRequest',
            expectedVersion,
          });
        const timestamp = now().toISOString() as UtcTimestamp;
        const next: AnalysisRequestRecord = Object.freeze({
          ...req,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: timestamp,
          updatedBy: req.updatedBy ?? current.updatedBy ?? null,
          version: current.version + 1,
        });
        records.set(next.id, next);
        return cloneRequest(next);
      },
    }),
  });
}

let analysisIdCounter = 0;
function generateAnalysisId(): Uuidv7 {
  analysisIdCounter += 1;
  const padded = String(analysisIdCounter).padStart(12, '0');
  return `018f18b2-4c4f-7c7a-9f00-${padded}` as Uuidv7;
}
