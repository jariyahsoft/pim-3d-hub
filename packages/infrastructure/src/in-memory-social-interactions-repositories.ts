import {
  type CanonicalRecord,
  type CommentFilter,
  type CommentRecord,
  type CommentRepository,
  type CommentSortField,
  type FollowFilter,
  type FollowRecord,
  type FollowRepository,
  type FollowSortField,
  type ReactionFilter,
  type ReactionKind,
  type ReactionRecord,
  type ReactionRepository,
  type ReactionSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SaveFilter,
  type SaveRecord,
  type SaveRepository,
  type SaveSortField,
} from '@pim/domain';

interface PersistedReaction extends CanonicalRecord {
  idempotencyKey: string;
  postId: string;
  reaction: string;
  userId: string;
}

interface PersistedComment extends CanonicalRecord {
  body: string;
  moderationReason: string | null;
  postId: string;
  status: string;
  userId: string;
}

interface PersistedFollow extends CanonicalRecord {
  followerId: string;
  followeeId: string;
  idempotencyKey: string;
  status: string;
}

interface PersistedSave extends CanonicalRecord {
  collectionId: string | null;
  contentType: string;
  contentId: string;
  idempotencyKey: string;
  userId: string;
}

function buildIdxKey(userId: string, key: string): string {
  return `${userId}:${key}`;
}

export function createInMemoryReactionRepository(): ReactionRepository {
  const store = new Map<string, PersistedReaction>();
  const idempIndex = new Map<string, string>();

  return {
    async createIfNotExists(input) {
      const idxKey = buildIdxKey(input.userId, input.idempotencyKey);
      const existingId = idempIndex.get(idxKey);
      if (existingId) {
        const existing = store.get(existingId);
        if (existing) {
          return {
            created: false,
            reaction: {
              ...existing,
              reaction: existing.reaction as ReactionKind,
              status: existing.status as ReactionRecord['status'],
            } as ReactionRecord,
          };
        }
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: PersistedReaction = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        postId: input.postId,
        reaction: input.reaction,
        userId: input.userId,
      };
      store.set(id, rec);
      idempIndex.set(idxKey, id);
      return {
        created: true,
        reaction: {
          ...rec,
          reaction: rec.reaction as ReactionKind,
          status: 'ACTIVE' as ReactionRecord['status'],
        } as ReactionRecord,
      };
    },
    async findByIdempotencyKey(userId, idempotencyKey) {
      const id = idempIndex.get(buildIdxKey(userId, idempotencyKey));
      if (!id) return null;
      const rec = store.get(id);
      if (!rec) return null;
      return {
        ...rec,
        reaction: rec.reaction as ReactionKind,
        status: 'ACTIVE' as ReactionRecord['status'],
      } as ReactionRecord;
    },
    async list(
      request: RepositoryListRequest<ReactionFilter, ReactionSortField>,
    ): Promise<RepositoryListPage<ReactionRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.postId) items = items.filter((r) => r.postId === f.postId);
        if (f.userId) items = items.filter((r) => r.userId === f.userId);
        if (f.reaction) items = items.filter((r) => r.reaction === f.reaction);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort(
        (a, b) =>
          (request.sort.field === 'createdAt'
            ? a.createdAt.localeCompare(b.createdAt)
            : a.updatedAt.localeCompare(b.updatedAt)) * dir,
      );
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page.map((r) => ({
          ...r,
          reaction: r.reaction as ReactionKind,
          status: 'ACTIVE' as ReactionRecord['status'],
        })) as unknown as readonly ReactionRecord[],
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.limit)
            : null,
      };
    },
    async remove(id) {
      store.delete(id);
    },
  };
}

export function createInMemoryCommentRepository(): CommentRepository {
  const store = new Map<string, PersistedComment>();

  return {
    async create(input) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: PersistedComment = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
        body: input.body,
        moderationReason: null,
        postId: input.postId,
        status: 'PUBLISHED',
        userId: input.userId,
      };
      store.set(id, rec);
      return {
        ...rec,
        status: rec.status as CommentRecord['status'],
      } as CommentRecord;
    },
    async findById(id, options) {
      const rec = store.get(id);
      if (!rec) return null;
      if (rec.deletedAt && !options?.includeDeleted) return null;
      return {
        ...rec,
        status: rec.status as CommentRecord['status'],
      } as CommentRecord;
    },
    async hide(id, expectedVersion, moderationReason) {
      const existing = store.get(id);
      if (!existing) throw new Error('not found');
      if (existing.version !== expectedVersion) {
        throw new Error('version conflict');
      }
      const updated: PersistedComment = {
        ...existing,
        version: existing.version + 1,
        status: 'HIDDEN',
        moderationReason,
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return {
        ...updated,
        status: updated.status as CommentRecord['status'],
      } as CommentRecord;
    },
    async list(
      request: RepositoryListRequest<CommentFilter, CommentSortField>,
    ): Promise<RepositoryListPage<CommentRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.postId) items = items.filter((r) => r.postId === f.postId);
        if (f.userId) items = items.filter((r) => r.userId === f.userId);
        if (f.status) items = items.filter((r) => r.status === f.status);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort(
        (a, b) =>
          (request.sort.field === 'createdAt'
            ? a.createdAt.localeCompare(b.createdAt)
            : a.updatedAt.localeCompare(b.updatedAt)) * dir,
      );
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page.map((r) => ({
          ...r,
          status: r.status as CommentRecord['status'],
        })) as unknown as readonly CommentRecord[],
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.limit)
            : null,
      };
    },
    async remove(id, expectedVersion, moderationReason) {
      const existing = store.get(id);
      if (!existing) throw new Error('not found');
      if (existing.version !== expectedVersion) {
        throw new Error('version conflict');
      }
      const updated: PersistedComment = {
        ...existing,
        version: existing.version + 1,
        status: 'REMOVED',
        moderationReason,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return {
        ...updated,
        status: updated.status as CommentRecord['status'],
      } as CommentRecord;
    },
  };
}

export function createInMemoryFollowRepository(): FollowRepository {
  const store = new Map<string, PersistedFollow>();
  const idempIndex = new Map<string, string>();

  return {
    async createIfNotExists(input) {
      const idxKey = buildIdxKey(input.followerId, input.idempotencyKey);
      const existingId = idempIndex.get(idxKey);
      if (existingId) {
        const existing = store.get(existingId);
        if (existing) {
          return {
            created: false,
            follow: {
              ...existing,
              status: existing.status as FollowRecord['status'],
            } as FollowRecord,
          };
        }
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: PersistedFollow = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
        followerId: input.followerId,
        followeeId: input.followeeId,
        idempotencyKey: input.idempotencyKey,
        status: 'ACTIVE',
      };
      store.set(id, rec);
      idempIndex.set(idxKey, id);
      return {
        created: true,
        follow: {
          ...rec,
          status: rec.status as FollowRecord['status'],
        } as FollowRecord,
      };
    },
    async findByIdempotencyKey(followerId, idempotencyKey) {
      const id = idempIndex.get(buildIdxKey(followerId, idempotencyKey));
      if (!id) return null;
      const rec = store.get(id);
      if (!rec) return null;
      return {
        ...rec,
        status: rec.status as FollowRecord['status'],
      } as FollowRecord;
    },
    async list(
      request: RepositoryListRequest<FollowFilter, FollowSortField>,
    ): Promise<RepositoryListPage<FollowRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.followerId)
          items = items.filter((r) => r.followerId === f.followerId);
        if (f.followeeId)
          items = items.filter((r) => r.followeeId === f.followeeId);
        if (f.status) items = items.filter((r) => r.status === f.status);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort(
        (a, b) =>
          (request.sort.field === 'createdAt'
            ? a.createdAt.localeCompare(b.createdAt)
            : a.updatedAt.localeCompare(b.updatedAt)) * dir,
      );
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page.map((r) => ({
          ...r,
          status: r.status as FollowRecord['status'],
        })) as unknown as readonly FollowRecord[],
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.limit)
            : null,
      };
    },
    async pause(id, expectedVersion) {
      const existing = store.get(id);
      if (!existing) throw new Error('not found');
      if (existing.version !== expectedVersion) {
        throw new Error('version conflict');
      }
      const updated: PersistedFollow = {
        ...existing,
        version: existing.version + 1,
        status: 'PAUSED',
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return {
        ...updated,
        status: updated.status as FollowRecord['status'],
      } as FollowRecord;
    },
  };
}

export function createInMemorySaveRepository(): SaveRepository {
  const store = new Map<string, PersistedSave>();
  const idempIndex = new Map<string, string>();

  return {
    async createIfNotExists(input) {
      const idxKey = buildIdxKey(input.userId, input.idempotencyKey);
      const existingId = idempIndex.get(idxKey);
      if (existingId) {
        const existing = store.get(existingId);
        if (existing) {
          return {
            created: false,
            save: existing as unknown as SaveRecord,
          };
        }
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: PersistedSave = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
        collectionId: input.collectionId,
        contentType: input.contentType,
        contentId: input.contentId,
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
      };
      store.set(id, rec);
      idempIndex.set(idxKey, id);
      return {
        created: true,
        save: rec as unknown as SaveRecord,
      };
    },
    async findByIdempotencyKey(userId, idempotencyKey) {
      const id = idempIndex.get(buildIdxKey(userId, idempotencyKey));
      if (!id) return null;
      const rec = store.get(id);
      return (rec as unknown as SaveRecord) ?? null;
    },
    async list(
      request: RepositoryListRequest<SaveFilter, SaveSortField>,
    ): Promise<RepositoryListPage<SaveRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.userId) items = items.filter((r) => r.userId === f.userId);
        if (f.contentType)
          items = items.filter((r) => r.contentType === f.contentType);
        if (f.collectionId)
          items = items.filter((r) => r.collectionId === f.collectionId);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort(
        (a, b) =>
          (request.sort.field === 'createdAt'
            ? a.createdAt.localeCompare(b.createdAt)
            : a.updatedAt.localeCompare(b.updatedAt)) * dir,
      );
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page as unknown as readonly SaveRecord[],
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.length)
            : null,
      };
    },
    async remove(id) {
      store.delete(id);
    },
  };
}
