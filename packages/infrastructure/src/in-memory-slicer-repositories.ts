import {
  RepositoryConflictError,
  type CanonicalRecord,
  type CreateSliceJobInput,
  type CreateSlicerProfileInput,
  type SliceJobFilter,
  type SliceJobRecord,
  type SliceJobRepository,
  type SliceJobSortField,
  type SlicerProfileFilter,
  type SlicerProfileRecord,
  type SlicerProfileRepository,
  type SlicerSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain';

interface PersistedSlicerProfile extends CanonicalRecord {
  approvedByUserId: string | null;
  description: string;
  materialCode: string;
  printerTechnologyCode: string;
  profileCode: string;
  qualityCode: string;
  settings: string; // JSON
  status: string;
}

interface PersistedSliceJob extends CanonicalRecord {
  dedupeKey: string;
  fileAssetId: string;
  profileId: string;
  result: string | null; // JSON
  resultPath: string | null;
  status: string;
}

function profileToDomain(r: PersistedSlicerProfile): SlicerProfileRecord {
  return {
    ...r,
    settings: JSON.parse(r.settings),
    status: r.status as any,
    profileCode: r.profileCode as any,
  } as SlicerProfileRecord;
}

function profileToPersistence(r: SlicerProfileRecord): PersistedSlicerProfile {
  return {
    ...r,
    settings: JSON.stringify(r.settings),
  } as PersistedSlicerProfile;
}

function jobToDomain(r: PersistedSliceJob): SliceJobRecord {
  return {
    ...r,
    result: r.result ? JSON.parse(r.result) : null,
    status: r.status as any,
  } as SliceJobRecord;
}

function jobToPersistence(r: SliceJobRecord): PersistedSliceJob {
  return {
    ...r,
    result: r.result ? JSON.stringify(r.result) : null,
  } as PersistedSliceJob;
}

export function createInMemorySlicerProfileRepository(): SlicerProfileRepository {
  const store = new Map<string, PersistedSlicerProfile>();
  return {
    async create(
      input: CreateSlicerProfileInput,
    ): Promise<SlicerProfileRecord> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: SlicerProfileRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        approvedByUserId: null,
        description: input.description,
        materialCode: input.materialCode,
        printerTechnologyCode: input.printerTechnologyCode,
        profileCode: input.profileCode,
        qualityCode: input.qualityCode,
        settings: input.settings,
        status: 'DRAFT',
      };
      store.set(id, profileToPersistence(rec));
      return rec;
    },
    async findById(id: Uuidv7): Promise<SlicerProfileRecord | null> {
      const r = store.get(id);
      return r ? profileToDomain(r) : null;
    },
    async findActive(
      profileCode,
      printerTechnologyCode,
      materialCode,
      qualityCode,
    ): Promise<SlicerProfileRecord | null> {
      for (const r of store.values()) {
        if (r.deletedAt) continue;
        if (r.status !== 'ACTIVE') continue;
        if (r.profileCode !== profileCode) continue;
        if (r.printerTechnologyCode !== printerTechnologyCode) continue;
        if (r.materialCode !== materialCode) continue;
        if (r.qualityCode !== qualityCode) continue;
        return profileToDomain(r);
      }
      return null;
    },
    async list(
      request: RepositoryListRequest<SlicerProfileFilter, SlicerSortField>,
    ): Promise<RepositoryListPage<SlicerProfileRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.materialCode)
          items = items.filter((r) => r.materialCode === f.materialCode);
        if (f.profileCode)
          items = items.filter((r) => r.profileCode === f.profileCode);
        if (f.qualityCode)
          items = items.filter((r) => r.qualityCode === f.qualityCode);
        if (f.status) items = items.filter((r) => r.status === f.status);
        if (f.printerTechnologyCode)
          items = items.filter(
            (r) => r.printerTechnologyCode === f.printerTechnologyCode,
          );
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort(
        (a, b) =>
          (request.sort.field === 'updatedAt'
            ? a.updatedAt.localeCompare(b.updatedAt)
            : a.createdAt.localeCompare(b.createdAt)) * dir,
      );
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page.map(profileToDomain),
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.limit)
            : null,
      };
    },
    async update(
      record: SlicerProfileRecord,
      expectedVersion: number,
    ): Promise<SlicerProfileRecord> {
      const existing = store.get(record.id);
      if (!existing || existing.version !== expectedVersion)
        throw new RepositoryConflictError({
          entityId: record.id,
          entityName: 'SlicerProfile',
          expectedVersion,
          actualVersion: existing?.version ?? -1,
        });
      const updated = {
        ...profileToPersistence(record),
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(record.id, updated);
      return profileToDomain(updated);
    },
  };
}

export function createInMemorySliceJobRepository(): SliceJobRepository {
  const store = new Map<string, PersistedSliceJob>();
  const dedupeIndex = new Map<string, string>();

  return {
    async createIfNotExists(
      input: CreateSliceJobInput,
    ): Promise<{ created: boolean; job: SliceJobRecord }> {
      const existingId = dedupeIndex.get(input.dedupeKey);
      if (existingId) {
        const existing = store.get(existingId);
        if (existing) return { created: false, job: jobToDomain(existing) };
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: SliceJobRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        dedupeKey: input.dedupeKey,
        fileAssetId: input.fileAssetId,
        profileId: input.profileId,
        result: null,
        resultPath: null,
        status: 'QUEUED',
      };
      store.set(id, jobToPersistence(rec));
      dedupeIndex.set(input.dedupeKey, id);
      return { created: true, job: rec };
    },
    async create(input: CreateSliceJobInput): Promise<SliceJobRecord> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: SliceJobRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        dedupeKey: input.dedupeKey,
        fileAssetId: input.fileAssetId,
        profileId: input.profileId,
        result: null,
        resultPath: null,
        status: 'QUEUED',
      };
      store.set(id, jobToPersistence(rec));
      return rec;
    },
    async findById(id: Uuidv7): Promise<SliceJobRecord | null> {
      const r = store.get(id);
      return r ? jobToDomain(r) : null;
    },
    async findPending(
      timeoutSince: UtcTimestamp,
    ): Promise<readonly SliceJobRecord[]> {
      return Array.from(store.values())
        .filter(
          (r) =>
            !r.deletedAt &&
            (r.status === 'QUEUED' ||
              r.status === 'FAILED_TRANSIENT' ||
              (r.status === 'PROCESSING' && r.updatedAt < timeoutSince)),
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, 10)
        .map(jobToDomain);
    },
    async list(
      request: RepositoryListRequest<SliceJobFilter, SliceJobSortField>,
    ): Promise<RepositoryListPage<SliceJobRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.fileAssetId)
          items = items.filter((r) => r.fileAssetId === f.fileAssetId);
        if (f.status) items = items.filter((r) => r.status === f.status);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort(
        (a, b) =>
          (request.sort.field === 'updatedAt'
            ? a.updatedAt.localeCompare(b.updatedAt)
            : a.createdAt.localeCompare(b.createdAt)) * dir,
      );
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page.map(jobToDomain),
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.limit)
            : null,
      };
    },
    async update(
      job: SliceJobRecord,
      expectedVersion: number,
    ): Promise<SliceJobRecord> {
      const existing = store.get(job.id);
      if (!existing || existing.version !== expectedVersion)
        throw new RepositoryConflictError({
          entityId: job.id,
          entityName: 'SliceJob',
          expectedVersion,
          actualVersion: existing?.version ?? -1,
        });
      const updated = {
        ...jobToPersistence(job),
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(job.id, updated);
      return jobToDomain(updated);
    },
    async markDeadLetter(
      id: Uuidv7,
      expectedVersion: number,
    ): Promise<SliceJobRecord> {
      const existing = store.get(id);
      if (!existing || existing.version !== expectedVersion)
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'SliceJob',
          expectedVersion,
          actualVersion: existing?.version ?? -1,
        });
      const updated = {
        ...existing,
        version: existing.version + 1,
        status: 'DEAD_LETTER' as typeof existing.status,
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return jobToDomain(updated);
    },
  };
}
