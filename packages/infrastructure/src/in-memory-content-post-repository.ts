import {
  RepositoryConflictError,
  type CanonicalRecord,
  type CreatePostInput,
  type PostFilter,
  type PostRecord,
  type PostRepository,
  type PostSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type Uuidv7,
} from '@pim/domain';

interface PersistedPost extends CanonicalRecord {
  authorId: string;
  caption: string;
  linkedReferences: string; // JSON
  media: string; // JSON
  moderationReason: string | null;
  publishedAt: string | null;
  sourceFileAssetId: string | null;
  status: string;
  type: string;
  visibility: string;
}

function toDomain(rec: PersistedPost): PostRecord {
  return {
    ...rec,
    linkedReferences: JSON.parse(rec.linkedReferences),
    media: JSON.parse(rec.media),
    status: rec.status as PostRecord['status'],
    type: rec.type as PostRecord['type'],
    visibility: rec.visibility as PostRecord['visibility'],
  } as PostRecord;
}

function toPersistence(rec: PostRecord): PersistedPost {
  return {
    ...rec,
    linkedReferences: JSON.stringify(rec.linkedReferences),
    media: JSON.stringify(rec.media),
  } as PersistedPost;
}

export function createInMemoryContentPostRepository(): PostRepository {
  const store = new Map<string, PersistedPost>();

  return {
    async create(input: CreatePostInput): Promise<PostRecord> {
      const now = new Date().toISOString();
      const id = input.id ?? crypto.randomUUID();

      const rec: PostRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now as PostRecord['createdAt'],
        updatedAt: now as PostRecord['updatedAt'],
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.updatedBy ?? null,
        authorId: input.authorId,
        caption: input.caption,
        linkedReferences: {
          orderId: input.linkedReferences?.orderId ?? null,
          productId: input.linkedReferences?.productId ?? null,
          providerId: input.linkedReferences?.providerId ?? null,
          serviceId: input.linkedReferences?.serviceId ?? null,
          showcaseConsentId: input.linkedReferences?.showcaseConsentId ?? null,
        },
        media: input.media ? [...input.media] : [],
        moderationReason: null,
        publishedAt: null,
        sourceFileAssetId: input.sourceFileAssetId ?? null,
        status: input.status ?? 'DRAFT',
        type: input.type,
        visibility: input.visibility ?? 'PUBLIC',
      };

      store.set(id, toPersistence(rec));
      return rec;
    },

    async findById(
      id: Uuidv7,
      options?: { includeDeleted?: boolean },
    ): Promise<PostRecord | null> {
      const rec = store.get(id);
      if (!rec) return null;
      if (rec.deletedAt && !options?.includeDeleted) return null;
      return toDomain(rec);
    },

    async list(
      request: RepositoryListRequest<PostFilter, PostSortField>,
    ): Promise<RepositoryListPage<PostRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);

      const filter = request.filter;
      if (filter) {
        if (filter.authorId)
          items = items.filter((r) => r.authorId === filter.authorId);
        if (filter.status)
          items = items.filter((r) => r.status === filter.status);
        if (filter.visibility)
          items = items.filter((r) => r.visibility === filter.visibility);
        if (filter.providerId) {
          items = items.filter((r) => {
            const l = JSON.parse(r.linkedReferences);
            return l.providerId === filter.providerId;
          });
        }
        if (filter.publishedAfter) {
          items = items.filter((r) => {
            if (!r.publishedAt) return false;
            return r.publishedAt >= filter.publishedAfter!;
          });
        }
        if (filter.publishedBefore) {
          items = items.filter((r) => {
            if (!r.publishedAt) return false;
            return r.publishedAt <= filter.publishedBefore!;
          });
        }
      }

      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        let cmp = 0;
        if (request.sort.field === 'publishedAt') {
          const av = a.publishedAt ?? a.createdAt;
          const bv = b.publishedAt ?? b.createdAt;
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
            ? String(start + request.limit)
            : null,
      };
    },

    async softDelete(
      id: Uuidv7,
      expectedVersion: number,
      deletedBy?: Uuidv7 | null,
    ): Promise<PostRecord> {
      const existing = store.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Post',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Post',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedPost = {
        ...existing,
        version: existing.version + 1,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: deletedBy ?? existing.updatedBy,
        status: 'REMOVED',
      };
      store.set(id, updated);
      return toDomain(updated);
    },

    async update(
      post: PostRecord,
      expectedVersion: number,
    ): Promise<PostRecord> {
      const existing = store.get(post.id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: post.id,
          entityName: 'Post',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: post.id,
          entityName: 'Post',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedPost = {
        ...toPersistence(post),
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(post.id, updated);
      return toDomain(updated);
    },
  };
}
