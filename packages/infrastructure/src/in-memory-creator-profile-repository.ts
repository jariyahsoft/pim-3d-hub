import {
  RepositoryConflictError,
  type CanonicalRecord,
  type CreateCreatorProfileInput,
  type CreatorProfileFilter,
  type CreatorProfileRecord,
  type CreatorProfileRepository,
  type CreatorProfileSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain';

interface PersistedCreatorProfile extends CanonicalRecord {
  bio: string;
  coverAssetId: string | null;
  creatorUserId: string;
  displayName: string;
  followedByViewerIds: string; // JSON
  avatarAssetId: string | null;
  linkedReferences: string; // JSON
  postsCount: number;
  productsCount: number;
  province: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  socialLinks: string; // JSON
  suspendedReason: string | null;
  suspendedUntil: string | null;
  visibility: string;
}

function toDomain(rec: PersistedCreatorProfile): CreatorProfileRecord {
  return {
    ...rec,
    followedByViewerIds: JSON.parse(rec.followedByViewerIds),
    linkedReferences: JSON.parse(rec.linkedReferences),
    socialLinks: JSON.parse(rec.socialLinks),
    suspendedUntil: rec.suspendedUntil as UtcTimestamp | null,
    visibility: rec.visibility as CreatorProfileRecord['visibility'],
  } as CreatorProfileRecord;
}

function toPersistence(rec: CreatorProfileRecord): PersistedCreatorProfile {
  return {
    ...rec,
    followedByViewerIds: JSON.stringify(rec.followedByViewerIds),
    linkedReferences: JSON.stringify(rec.linkedReferences),
    socialLinks: JSON.stringify(rec.socialLinks),
    suspendedUntil: rec.suspendedUntil,
  } as PersistedCreatorProfile;
}

export function createInMemoryCreatorProfileRepository(): CreatorProfileRepository {
  const store = new Map<string, PersistedCreatorProfile>();

  return {
    async create(
      input: CreateCreatorProfileInput,
    ): Promise<CreatorProfileRecord> {
      const now = new Date().toISOString();
      const id = input.id ?? crypto.randomUUID();
      const rec: CreatorProfileRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now as CreatorProfileRecord['createdAt'],
        updatedAt: now as CreatorProfileRecord['updatedAt'],
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        creatorUserId: input.creatorUserId,
        displayName: input.displayName,
        bio: input.bio ?? '',
        province: input.province ?? null,
        avatarAssetId: input.avatarAssetId ?? null,
        coverAssetId: input.coverAssetId ?? null,
        followedByViewerIds: input.followedByViewerIds
          ? [...input.followedByViewerIds]
          : [],
        linkedReferences: {
          productId: null,
          providerServiceId: null,
          showcaseConsentId: null,
        },
        postsCount: 0,
        productsCount: 0,
        ratingAverage: null,
        ratingCount: 0,
        socialLinks: input.socialLinks ? [...input.socialLinks] : [],
        suspendedReason: null,
        suspendedUntil: null,
        visibility: input.visibility ?? 'PUBLIC_ACTIVE',
      };
      store.set(input.creatorUserId, toPersistence(rec));
      return rec;
    },
    async findByCreatorUserId(
      creatorUserId: Uuidv7,
      options?: { includeSuspended?: boolean },
    ): Promise<CreatorProfileRecord | null> {
      const rec = store.get(creatorUserId);
      if (!rec) return null;
      if (!options?.includeSuspended && rec.visibility === 'REMOVED') {
        return null;
      }
      return toDomain(rec);
    },
    async findById(
      id: Uuidv7,
      options?: { includeDeleted?: boolean },
    ): Promise<CreatorProfileRecord | null> {
      for (const rec of store.values()) {
        if (rec.id === id) {
          if (rec.deletedAt && !options?.includeDeleted) {
            continue;
          }
          return toDomain(rec);
        }
      }
      return null;
    },
    async list(
      request: RepositoryListRequest<
        CreatorProfileFilter,
        CreatorProfileSortField
      >,
    ): Promise<RepositoryListPage<CreatorProfileRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const filter = request.filter;
      if (filter) {
        if (filter.creatorUserId)
          items = items.filter((r) => r.creatorUserId === filter.creatorUserId);
        if (filter.province)
          items = items.filter((r) => r.province === filter.province);
        if (filter.visibility)
          items = items.filter((r) => r.visibility === filter.visibility);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        let cmp = 0;
        if (request.sort.field === 'suspendedUntil') {
          const av = a.suspendedUntil ?? '';
          const bv = b.suspendedUntil ?? '';
          cmp = av.localeCompare(bv);
        } else if (request.sort.field === 'createdAt') {
          cmp = a.createdAt.localeCompare(b.createdAt);
        } else {
          cmp = a.updatedAt.localeCompare(b.updatedAt);
        }
        return cmp * dir;
      });
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page.map(toDomain),
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.length)
            : null,
      };
    },
    async suspend(
      id: Uuidv7,
      expectedVersion: number,
      reason: string,
      suspendedUntil: UtcTimestamp | null,
    ): Promise<CreatorProfileRecord> {
      const existing = Array.from(store.values()).find((r) => r.id === id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'CreatorProfile',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'CreatorProfile',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedCreatorProfile = {
        ...existing,
        version: existing.version + 1,
        visibility: 'SUSPENDED',
        suspendedReason: reason,
        suspendedUntil,
        updatedAt: new Date().toISOString(),
      };
      store.set(existing.creatorUserId, updated);
      return toDomain(updated);
    },
    async unhide(
      id: Uuidv7,
      expectedVersion: number,
    ): Promise<CreatorProfileRecord> {
      const existing = Array.from(store.values()).find((r) => r.id === id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'CreatorProfile',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'CreatorProfile',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedCreatorProfile = {
        ...existing,
        version: existing.version + 1,
        visibility: 'PUBLIC_ACTIVE',
        suspendedReason: null,
        suspendedUntil: null,
        updatedAt: new Date().toISOString(),
      };
      store.set(existing.creatorUserId, updated);
      return toDomain(updated);
    },
    async update(
      profile: CreatorProfileRecord,
      expectedVersion: number,
    ): Promise<CreatorProfileRecord> {
      const existing = store.get(profile.creatorUserId);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: profile.id,
          entityName: 'CreatorProfile',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: profile.id,
          entityName: 'CreatorProfile',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedCreatorProfile = {
        ...toPersistence(profile),
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(profile.creatorUserId, updated);
      return toDomain(updated);
    },
  };
}
