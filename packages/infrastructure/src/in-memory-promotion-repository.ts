import {
  RepositoryConflictError,
  type CanonicalRecord,
  type CreatePromotionInput,
  type PromotionFilter,
  type PromotionRecord,
  type PromotionRepository,
  type PromotionSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type Uuidv7,
} from '@pim/domain';

interface PersistedPromotion extends CanonicalRecord {
  approvedByUserId: string | null;
  budgetMinor: number;
  currency: string;
  endsAt: string;
  goals: string; // JSON
  kind: string;
  label: string;
  placementId: string;
  reviewNotes: string | null;
  sellerId: string;
  startsAt: string;
  status: string;
  targetId: string;
  targetKind: string;
}

function toDomain(rec: PersistedPromotion): PromotionRecord {
  return {
    ...rec,
    goals: JSON.parse(rec.goals),
    status: rec.status as PromotionRecord['status'],
    kind: rec.kind as PromotionRecord['kind'],
    targetKind: rec.targetKind as PromotionRecord['targetKind'],
  } as PromotionRecord;
}

function toPersistence(rec: PromotionRecord): PersistedPromotion {
  return {
    ...rec,
    goals: JSON.stringify(rec.goals),
  } as PersistedPromotion;
}

export function createInMemoryPromotionRepository(): PromotionRepository {
  const store = new Map<string, PersistedPromotion>();

  return {
    async create(input: CreatePromotionInput): Promise<PromotionRecord> {
      const now = new Date().toISOString();
      const id = input.placementId ?? crypto.randomUUID();
      const rec: PromotionRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        approvedByUserId: null,
        budgetMinor: input.budgetMinor,
        currency: input.currency,
        endsAt: input.endsAt,
        goals: input.goals ?? {},
        kind: input.kind,
        label: input.label,
        placementId: id,
        reviewNotes: null,
        sellerId: input.sellerId,
        startsAt: input.startsAt,
        status: input.status ?? 'DRAFT',
        targetId: input.targetId,
        targetKind: input.targetKind,
      };
      store.set(id, toPersistence(rec));
      return rec;
    },
    async findById(id: Uuidv7): Promise<PromotionRecord | null> {
      const rec = store.get(id);
      return rec ? toDomain(rec) : null;
    },
    async list(
      request: RepositoryListRequest<PromotionFilter, PromotionSortField>,
    ): Promise<RepositoryListPage<PromotionRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.placementId)
          items = items.filter((r) => r.placementId === f.placementId);
        if (f.sellerId) items = items.filter((r) => r.sellerId === f.sellerId);
        if (f.status) items = items.filter((r) => r.status === f.status);
        if (f.targetId) items = items.filter((r) => r.targetId === f.targetId);
        if (f.targetKind)
          items = items.filter((r) => r.targetKind === f.targetKind);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        let cmp = 0;
        if (request.sort.field === 'startsAt')
          cmp = a.startsAt.localeCompare(b.startsAt);
        else if (request.sort.field === 'endsAt')
          cmp = a.endsAt.localeCompare(b.endsAt);
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
            ? String(start + request.length)
            : null,
      };
    },
    async update(
      record: PromotionRecord,
      expectedVersion: number,
    ): Promise<PromotionRecord> {
      const existing = store.get(record.id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: record.id,
          entityName: 'Promotion',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: record.id,
          entityName: 'Promotion',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedPromotion = {
        ...toPersistence(record),
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(record.id, updated);
      return toDomain(updated);
    },
  };
}

interface MetricEvent {
  recordedAt: string;
  placementId: string | null;
  contentId: string;
  kind: string;
  dedupeKey: string;
  actorUserId: string | null;
}

const metricsStore: MetricEvent[] = [];
const metricsSeen = new Set<string>();

export function recordMetricEvent(event: MetricEvent): boolean {
  // Dedupe by dedupeKey within a 5-minute window
  if (metricsSeen.has(event.dedupeKey)) {
    return false;
  }
  metricsSeen.add(event.dedupeKey);
  metricsStore.push(event);
  return true;
}

export function getMetricEvents(): readonly MetricEvent[] {
  return metricsStore;
}

export function resetMetrics() {
  metricsStore.length = 0;
  metricsSeen.clear();
}
