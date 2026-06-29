import {
  RepositoryConflictError,
  parseUtcTimestamp,
  type CanonicalRecord,
  type CreatePricingProfileInput,
  type PricingProfileFilter,
  type PricingProfileRecord,
  type PricingProfileRepository,
  type PricingProfileScope,
  type PricingProfileSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UtcTimestamp,
} from '@pim/domain';

interface PersistedPricingProfile extends CanonicalRecord {
  currency: string;
  effectiveFrom: string;
  formula: string; // JSON
  name: string;
  providerProfileId: string;
  scope: string; // JSON
  status: string;
  versionNo: number;
}

function toDomain(rec: PersistedPricingProfile): PricingProfileRecord {
  return {
    ...rec,
    currency: rec.currency as PricingProfileRecord['currency'],
    formula: JSON.parse(rec.formula),
    scope: JSON.parse(rec.scope),
    status: rec.status as PricingProfileRecord['status'],
  } as PricingProfileRecord;
}

function toPersistence(rec: PricingProfileRecord): PersistedPricingProfile {
  return {
    ...rec,
    currency: rec.currency,
    formula: JSON.stringify(rec.formula),
    scope: JSON.stringify(rec.scope),
  };
}

export function createInMemoryPricingProfileRepository(): PricingProfileRepository {
  const store = new Map<string, PersistedPricingProfile>();

  return {
    async create(
      input: CreatePricingProfileInput,
    ): Promise<PricingProfileRecord> {
      const now = parseUtcTimestamp(new Date());
      const id = input.id ?? crypto.randomUUID();

      const rec: PricingProfileRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        name: input.name,
        providerProfileId: input.providerProfileId,
        scope: input.scope,
        currency: input.currency ?? ('THB' as PricingProfileRecord['currency']),
        effectiveFrom: input.effectiveFrom,
        formula: { ...input.formula },
        status: input.status ?? 'DRAFT',
        versionNo: 0, // assigned on first publish
      };

      store.set(id, toPersistence(rec));
      return rec;
    },

    async findById(
      id: string,
      options?: { includeDeleted?: boolean },
    ): Promise<PricingProfileRecord | null> {
      const rec = store.get(id);
      if (!rec) return null;
      if (rec.deletedAt && !options?.includeDeleted) return null;
      return toDomain(rec);
    },

    async findLatestByProviderAndScope(
      providerProfileId: string,
      scope: PricingProfileScope,
      options?: { includeDeleted?: boolean },
    ): Promise<PricingProfileRecord | null> {
      const candidates: PersistedPricingProfile[] = [];
      for (const rec of store.values()) {
        if (rec.deletedAt && !options?.includeDeleted) continue;
        if (rec.providerProfileId !== providerProfileId) continue;
        const recScope: PricingProfileScope = JSON.parse(rec.scope);
        if (
          recScope.materialCode === scope.materialCode &&
          recScope.printerId === scope.printerId &&
          recScope.serviceId === scope.serviceId
        ) {
          candidates.push(rec);
        }
      }
      if (candidates.length === 0) return null;
      candidates.sort(
        (a, b) =>
          b.versionNo - a.versionNo || b.createdAt.localeCompare(a.createdAt),
      );
      return toDomain(candidates[0]);
    },

    async findActiveAtTimestamp(
      providerProfileId: string,
      scope: PricingProfileScope,
      at: UtcTimestamp,
    ): Promise<PricingProfileRecord | null> {
      const latest = await this.findLatestByProviderAndScope(
        providerProfileId,
        scope,
      );
      if (!latest) return null;
      if (latest.status !== 'ACTIVE') return null;
      if (latest.effectiveFrom > at) return null;
      return latest;
    },

    async list(
      request: RepositoryListRequest<
        PricingProfileFilter,
        PricingProfileSortField
      >,
    ): Promise<RepositoryListPage<PricingProfileRecord>> {
      let items = Array.from(store.values());
      const filter = request.filter;

      if (filter) {
        if (filter.providerProfileId) {
          items = items.filter(
            (r) => r.providerProfileId === filter.providerProfileId,
          );
        }
        if (filter.printerId) {
          items = items.filter((r) => {
            const s: PricingProfileScope = JSON.parse(r.scope);
            return s.printerId === filter.printerId;
          });
        }
        if (filter.serviceId) {
          items = items.filter((r) => {
            const s: PricingProfileScope = JSON.parse(r.scope);
            return s.serviceId === filter.serviceId;
          });
        }
        if (filter.materialCode) {
          items = items.filter((r) => {
            const s: PricingProfileScope = JSON.parse(r.scope);
            return s.materialCode === filter.materialCode;
          });
        }
        if (filter.status) {
          items = items.filter((r) => r.status === filter.status);
        }
        if (!request.includeDeleted) {
          items = items.filter((r) => !r.deletedAt);
        }
      }

      const field = request.sort.field;
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        let cmp = 0;
        if (field === 'effectiveFrom')
          cmp = a.effectiveFrom.localeCompare(b.effectiveFrom);
        else if (field === 'createdAt')
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

    async softDelete(
      id: string,
      expectedVersion: number,
      deletedBy?: string | null,
    ): Promise<PricingProfileRecord> {
      const rec = store.get(id);
      if (!rec)
        throw new RepositoryConflictError({
          entityName: 'PricingProfile',
          entityId: id,
          expectedVersion,
          actualVersion: -1,
        });
      if (rec.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityName: 'PricingProfile',
          entityId: id,
          expectedVersion,
          actualVersion: rec.version,
        });
      }
      const updated: PersistedPricingProfile = {
        ...rec,
        version: rec.version + 1,
        deletedAt: parseUtcTimestamp(new Date()),
        updatedAt: parseUtcTimestamp(new Date()),
        updatedBy: deletedBy ?? rec.updatedBy,
      };
      store.set(id, updated);
      return toDomain(updated);
    },

    async update(
      profile: PricingProfileRecord,
      expectedVersion: number,
    ): Promise<PricingProfileRecord> {
      const existing = store.get(profile.id);
      if (!existing)
        throw new RepositoryConflictError({
          entityName: 'PricingProfile',
          entityId: profile.id,
          expectedVersion,
          actualVersion: -1,
        });
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityName: 'PricingProfile',
          entityId: profile.id,
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const now = parseUtcTimestamp(new Date());
      const updated: PersistedPricingProfile = {
        ...toPersistence(profile),
        version: existing.version + 1,
        updatedAt: now,
      };
      store.set(profile.id, updated);
      return toDomain(updated);
    },
  };
}
