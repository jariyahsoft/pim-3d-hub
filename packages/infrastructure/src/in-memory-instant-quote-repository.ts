import {
  RepositoryConflictError,
  type CanonicalRecord,
  type CreateInstantQuoteInput,
  type InstantQuoteFilter,
  type InstantQuoteRecord,
  type InstantQuoteRepository,
  type InstantQuoteSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type Uuidv7,
} from '@pim/domain';

interface PersistedInstantQuote extends Omit<CanonicalRecord, 'deletedAt'> {
  buyerId: string;
  consumedOrderId: string | null;
  currency: string;
  deletedAt: string | null;
  expiresAt: string;
  fileAssetId: string;
  inputSnapshot: string;
  lineItems: string;
  modelAnalysisId: string;
  pricingProfileId: string;
  pricingProfileVersion: number;
  providerId: string;
  reservationId: string | null;
  reservationUnits: number;
  schemaVersion: number;
  sourceRuleSetVersion: number;
  status: string;
  subtotalMinor: number;
  totalMinor: number;
}

function toDomain(rec: PersistedInstantQuote): InstantQuoteRecord {
  return {
    ...rec,
    inputSnapshot: JSON.parse(rec.inputSnapshot),
    lineItems: JSON.parse(rec.lineItems),
    status: rec.status as InstantQuoteRecord['status'],
  } as InstantQuoteRecord;
}

function toPersistence(rec: InstantQuoteRecord): PersistedInstantQuote {
  return {
    ...rec,
    inputSnapshot: JSON.stringify(rec.inputSnapshot),
    lineItems: JSON.stringify(rec.lineItems),
  } as PersistedInstantQuote;
}

export function createInMemoryInstantQuoteRepository(): InstantQuoteRepository {
  const store = new Map<string, PersistedInstantQuote>();
  const idempotencyIndex = new Map<string, string>(); // `${buyerId}:${key}` -> id

  return {
    async createIfNotExists(
      input: CreateInstantQuoteInput,
      idempotencyKey: string,
    ): Promise<{ created: boolean; quote: InstantQuoteRecord }> {
      const idxKey = `${input.buyerId}:${idempotencyKey}`;
      const existingId = idempotencyIndex.get(idxKey);
      if (existingId) {
        const existing = store.get(existingId);
        if (existing) {
          return { created: false, quote: toDomain(existing) };
        }
      }

      const now = new Date().toISOString();
      const id = input.id ?? crypto.randomUUID();
      const rec: InstantQuoteRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now as InstantQuoteRecord['createdAt'],
        updatedAt: now as InstantQuoteRecord['updatedAt'],
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.updatedBy ?? input.actorUserId ?? null,
        buyerId: input.buyerId,
        consumedOrderId: null,
        currency: input.currency ?? ('THB' as InstantQuoteRecord['currency']),
        expiresAt: input.expiresAt,
        fileAssetId: input.fileAssetId,
        inputSnapshot: { ...input.inputSnapshot },
        lineItems: [...input.lineItems],
        modelAnalysisId: input.modelAnalysisId,
        pricingProfileId: input.pricingProfileId,
        pricingProfileVersion: input.pricingProfileVersion,
        providerId: input.providerId,
        reservationId: null,
        reservationUnits: input.reservationUnits,
        sourceRuleSetVersion: input.sourceRuleSetVersion,
        status: input.status ?? 'ACTIVE',
        subtotalMinor: input.subtotalMinor,
        totalMinor: input.totalMinor,
      };

      store.set(id, toPersistence(rec));
      idempotencyIndex.set(idxKey, id);

      return { created: true, quote: rec };
    },

    async findById(
      id: Uuidv7,
      options?: { includeDeleted?: boolean },
    ): Promise<InstantQuoteRecord | null> {
      const rec = store.get(id);
      if (!rec) return null;
      if (rec.deletedAt && !options?.includeDeleted) return null;
      return toDomain(rec);
    },

    async findByIdempotencyKey(
      buyerId: Uuidv7,
      idempotencyKey: string,
    ): Promise<InstantQuoteRecord | null> {
      const idxKey = `${buyerId}:${idempotencyKey}`;
      const id = idempotencyIndex.get(idxKey);
      if (!id) return null;
      const rec = store.get(id);
      return rec ? toDomain(rec) : null;
    },

    async list(
      request: RepositoryListRequest<InstantQuoteFilter, InstantQuoteSortField>,
    ): Promise<RepositoryListPage<InstantQuoteRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);

      const filter = request.filter;
      if (filter) {
        if (filter.buyerId)
          items = items.filter((r) => r.buyerId === filter.buyerId);
        if (filter.providerId)
          items = items.filter((r) => r.providerId === filter.providerId);
        if (filter.fileAssetId)
          items = items.filter((r) => r.fileAssetId === filter.fileAssetId);
        if (filter.status)
          items = items.filter((r) => r.status === filter.status);
      }

      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        let cmp = 0;
        if (request.sort.field === 'expiresAt')
          cmp = a.expiresAt.localeCompare(b.expiresAt);
        else if (request.sort.field === 'createdAt')
          cmp = a.createdAt.localeCompare(b.createdAt);
        else cmp = a.updatedAt.localeCompare(b.updatedAt);
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

    async markConsumed(
      id: Uuidv7,
      orderId: Uuidv7,
      expectedVersion: number,
    ): Promise<InstantQuoteRecord> {
      const existing = store.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedInstantQuote = {
        ...existing,
        version: existing.version + 1,
        status: 'CONSUMED',
        consumedOrderId: orderId,
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return toDomain(updated);
    },

    async markExpired(
      id: Uuidv7,
      expectedVersion: number,
    ): Promise<InstantQuoteRecord> {
      const existing = store.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedInstantQuote = {
        ...existing,
        version: existing.version + 1,
        status: 'EXPIRED',
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return toDomain(updated);
    },

    async markInvalidated(
      id: Uuidv7,
      expectedVersion: number,
    ): Promise<InstantQuoteRecord> {
      const existing = store.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedInstantQuote = {
        ...existing,
        version: existing.version + 1,
        status: 'INVALIDATED',
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return toDomain(updated);
    },

    async reserve(
      id: Uuidv7,
      reservationId: Uuidv7,
      expectedVersion: number,
    ): Promise<InstantQuoteRecord> {
      const existing = store.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'InstantQuote',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedInstantQuote = {
        ...existing,
        version: existing.version + 1,
        status: 'RESERVED',
        reservationId,
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return toDomain(updated);
    },
  };
}
