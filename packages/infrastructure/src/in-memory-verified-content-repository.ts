import {
  type CanonicalRecord,
  type GrantShowcaseConsentInput,
  type RepositoryListPage,
  type RepositoryListRequest,
  type ShowcaseConsentRecord,
  type ShowcaseConsentRepository,
  type VerifiedPurchaseRecord,
  type VerifiedPurchaseRepository,
} from '@pim/domain';

interface PersistedVerifiedPurchase extends CanonicalRecord {
  buyerId: string;
  contentId: string;
  contentType: string;
  orderId: string;
  status: string;
}

interface PersistedShowcaseConsent extends CanonicalRecord {
  customerId: string;
  expiresAt: string | null;
  orderId: string;
  providerId: string;
  scopes: string; // JSON array
  status: string;
}

export function createInMemoryVerifiedPurchaseRepository(): VerifiedPurchaseRepository {
  const store = new Map<string, PersistedVerifiedPurchase>();

  return {
    async createIfNotExists(input) {
      const id = `${input.contentId}:${input.orderId}`;
      const existing = store.get(id);
      if (existing) {
        return {
          created: false,
          record: {
            ...existing,
            status: existing.status as VerifiedPurchaseRecord['status'],
            contentType:
              existing.contentType as VerifiedPurchaseRecord['contentType'],
          } as VerifiedPurchaseRecord,
        };
      }
      const now = new Date().toISOString();
      const rec: PersistedVerifiedPurchase = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        buyerId: input.buyerId,
        contentId: input.contentId,
        contentType: input.contentType,
        orderId: input.orderId,
        status: 'ELIGIBLE',
      };
      store.set(id, rec);
      return {
        created: true,
        record: {
          ...rec,
          status: rec.status as VerifiedPurchaseRecord['status'],
          contentType: rec.contentType as VerifiedPurchaseRecord['contentType'],
        } as VerifiedPurchaseRecord,
      };
    },
    async findByContent(contentId, contentType) {
      const recs = Array.from(store.values()).filter(
        (r) => r.contentId === contentId && r.contentType === contentType,
      );
      if (recs.length === 0) return null;
      return {
        ...recs[0],
        status: recs[0].status as VerifiedPurchaseRecord['status'],
        contentType: recs[0]
          .contentType as VerifiedPurchaseRecord['contentType'],
      } as VerifiedPurchaseRecord;
    },
    async list(
      request: RepositoryListRequest<
        Record<string, never>,
        'createdAt' | 'updatedAt'
      >,
    ): Promise<RepositoryListPage<VerifiedPurchaseRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
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
          status: r.status as VerifiedPurchaseRecord['status'],
          contentType: r.contentType as VerifiedPurchaseRecord['contentType'],
        })) as unknown as readonly VerifiedPurchaseRecord[],
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.length)
            : null,
      };
    },
  };
}

export function createInMemoryShowcaseConsentRepository(): ShowcaseConsentRepository {
  const store = new Map<string, PersistedShowcaseConsent>();

  return {
    async create(
      input: GrantShowcaseConsentInput,
    ): Promise<ShowcaseConsentRecord> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: PersistedShowcaseConsent = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
        customerId: input.customerId,
        expiresAt: input.expiresAt ?? null,
        orderId: input.orderId,
        providerId: input.providerId,
        scopes: JSON.stringify(input.scopes),
        status: 'GRANTED',
      };
      store.set(id, rec);
      return {
        ...rec,
        scopes: JSON.parse(rec.scopes),
        status: rec.status as ShowcaseConsentRecord['status'],
      } as ShowcaseConsentRecord;
    },
    async findById(id, options) {
      const rec = store.get(id);
      if (!rec) return null;
      if (rec.deletedAt && !options?.includeDeleted) return null;
      return {
        ...rec,
        scopes: JSON.parse(rec.scopes),
        status: rec.status as ShowcaseConsentRecord['status'],
      } as ShowcaseConsentRecord;
    },
    async findByOrder(orderId) {
      const recs = Array.from(store.values()).filter(
        (r) => r.orderId === orderId,
      );
      if (recs.length === 0) return null;
      return {
        ...recs[0],
        scopes: JSON.parse(recs[0].scopes),
        status: recs[0].status as ShowcaseConsentRecord['status'],
      } as ShowcaseConsentRecord;
    },
    async list(
      request: RepositoryListRequest<
        Record<string, never>,
        'createdAt' | 'updatedAt'
      >,
    ): Promise<RepositoryListPage<ShowcaseConsentRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
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
          scopes: JSON.parse(r.scopes),
          status: r.status as ShowcaseConsentRecord['status'],
        })) as unknown as readonly ShowcaseConsentRecord[],
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.length)
            : null,
      };
    },
    async withdraw(consentId, expectedVersion) {
      const existing = store.get(consentId);
      if (!existing) throw new Error('consent not found');
      if (existing.version !== expectedVersion) {
        throw new Error('version conflict');
      }
      const updated: PersistedShowcaseConsent = {
        ...existing,
        version: existing.version + 1,
        status: 'WITHDRAWN',
        updatedAt: new Date().toISOString(),
      };
      store.set(consentId, updated);
      return {
        ...updated,
        scopes: JSON.parse(updated.scopes),
        status: updated.status as ShowcaseConsentRecord['status'],
      } as ShowcaseConsentRecord;
    },
  };
}
