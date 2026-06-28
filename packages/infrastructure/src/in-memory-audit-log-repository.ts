import type {
  AuditLogFilter,
  AuditLogRecord,
  AuditLogRepository,
  AuditSortField,
  CreateAuditLogInput,
  RepositoryListPage,
  RepositoryListRequest,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain';

export function createInMemoryAuditLogRepository(deps: {
  generateId: () => Uuidv7;
  now: () => Date;
}): AuditLogRepository {
  const { generateId, now } = deps;
  const store = new Map<Uuidv7, AuditLogRecord>();

  return {
    async create(input: CreateAuditLogInput): Promise<AuditLogRecord> {
      const timestamp = now().toISOString() as UtcTimestamp;
      const record: AuditLogRecord = {
        id: input.id ?? generateId(),
        actorUserId: input.actorUserId ?? null,
        actorType: input.actorType ?? 'USER',
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        outcome: input.outcome ?? 'SUCCESS',
        reason: input.reason ?? null,
        requestId: input.requestId ?? null,
        traceId: input.traceId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        changeDiff: input.changeDiff ?? null,
        metadata: input.metadata ?? {},
        createdAt: timestamp,
        createdBy: input.createdBy ?? null,
        updatedAt: timestamp,
        updatedBy: null,
        deletedAt: null,
        schemaVersion: 1,
        version: 1,
      };
      store.set(record.id, record);
      return record;
    },

    async findById(id: Uuidv7): Promise<AuditLogRecord | null> {
      return store.get(id) ?? null;
    },

    async list(
      request: RepositoryListRequest<AuditLogFilter, AuditSortField>,
    ): Promise<RepositoryListPage<AuditLogRecord>> {
      let filtered = Array.from(store.values());

      if (request.filter) {
        const { action, actorUserId, outcome, resourceId, resourceType } =
          request.filter;
        filtered = filtered.filter((record) => {
          if (action && record.action !== action) return false;
          if (actorUserId && record.actorUserId !== actorUserId) return false;
          if (outcome && record.outcome !== outcome) return false;
          if (resourceId && record.resourceId !== resourceId) return false;
          if (resourceType && record.resourceType !== resourceType)
            return false;
          return true;
        });
      }

      const sortOrder = request.sort?.direction ?? 'desc';
      filtered.sort((a, b) => {
        const comparison =
          a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      const limit = request.limit ?? 20;
      const items = filtered.slice(0, limit);

      return {
        items,
        nextCursor: items.length < filtered.length ? `${items.length}` : null,
      };
    },

    // Note: No update or delete methods - audit logs are append-only and immutable
  };
}
