import {
  RepositoryConflictError,
  type CanonicalRecord,
  type CreateProductOrderInput,
  type CreateStockReservationInput,
  type ProductOrderFilter,
  type ProductOrderRecord,
  type ProductOrderRepository,
  type ProductOrderSnapshot,
  type ProductOrderSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type StockReservationFilter,
  type StockReservationRecord,
  type StockReservationRepository,
  type StockReservationSortField,
  type Uuidv7,
} from '@pim/domain';

interface PersistedStockReservation extends CanonicalRecord {
  idempotencyKey: string;
  orderId: string;
  productId: string;
  status: string;
  units: number;
  variantSku: string;
}

interface PersistedProductOrder extends CanonicalRecord {
  buyerId: string;
  expiresAt: string | null;
  idempotencyKey: string;
  orderNumber: string;
  paidAt: string | null;
  reservationId: string;
  shippingAddressSnapshot: string | null;
  snapshot: string; // JSON
  status: string;
  totalMinor: number;
}

function reservationToDomain(
  rec: PersistedStockReservation,
): StockReservationRecord {
  return {
    ...rec,
    status: rec.status as StockReservationRecord['status'],
  } as StockReservationRecord;
}

function orderToDomain(rec: PersistedProductOrder): ProductOrderRecord {
  return {
    ...rec,
    snapshot: JSON.parse(rec.snapshot) as ProductOrderSnapshot,
    status: rec.status as ProductOrderRecord['status'],
  } as ProductOrderRecord;
}

function orderToPersistence(rec: ProductOrderRecord): PersistedProductOrder {
  return {
    ...rec,
    snapshot: JSON.stringify(rec.snapshot),
  } as PersistedProductOrder;
}

export function createInMemoryStockReservationRepository(): StockReservationRepository {
  const store = new Map<string, PersistedStockReservation>();
  const orderIndex = new Map<string, string>();

  return {
    async createIfNotExists(input: CreateStockReservationInput): Promise<{
      created: boolean;
      reservation: StockReservationRecord;
    }> {
      const existingId = orderIndex.get(input.orderId);
      if (existingId) {
        const existing = store.get(existingId);
        if (existing) {
          return {
            created: false,
            reservation: reservationToDomain(existing),
          };
        }
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rec: PersistedStockReservation = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        idempotencyKey: input.idempotencyKey,
        orderId: input.orderId,
        productId: input.productId,
        status: 'ACTIVE',
        units: input.units,
        variantSku: input.variantSku,
      };
      store.set(id, rec);
      orderIndex.set(input.orderId, id);
      return {
        created: true,
        reservation: reservationToDomain(rec),
      };
    },
    async commit(
      id: Uuidv7,
      expectedVersion: number,
    ): Promise<StockReservationRecord> {
      const existing = store.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'StockReservation',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'StockReservation',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedStockReservation = {
        ...existing,
        version: existing.version + 1,
        status: 'COMMITTED',
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return reservationToDomain(updated);
    },
    async findById(id: Uuidv7): Promise<StockReservationRecord | null> {
      const rec = store.get(id);
      return rec ? reservationToDomain(rec) : null;
    },
    async findByOrderId(
      orderId: Uuidv7,
    ): Promise<StockReservationRecord | null> {
      const id = orderIndex.get(orderId);
      if (!id) return null;
      const rec = store.get(id);
      return rec ? reservationToDomain(rec) : null;
    },
    async list(
      request: RepositoryListRequest<
        StockReservationFilter,
        StockReservationSortField
      >,
    ): Promise<RepositoryListPage<StockReservationRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.orderId) items = items.filter((r) => r.orderId === f.orderId);
        if (f.productId)
          items = items.filter((r) => r.productId === f.productId);
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
        items: page.map(reservationToDomain),
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.length)
            : null,
      };
    },
    async release(
      id: Uuidv7,
      expectedVersion: number,
    ): Promise<StockReservationRecord> {
      const existing = store.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'StockReservation',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'StockReservation',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedStockReservation = {
        ...existing,
        version: existing.version + 1,
        status: 'RELEASED',
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      orderIndex.delete(existing.orderId);
      // Soft-delete so it disappears from listings
      const deleted: PersistedStockReservation = {
        ...updated,
        deletedAt: new Date().toISOString(),
        version: updated.version + 1,
      };
      store.set(id, deleted);
      return reservationToDomain(deleted);
    },
  };
}

export function createInMemoryProductOrderRepository(): ProductOrderRepository {
  const store = new Map<string, PersistedProductOrder>();
  const idempIndex = new Map<string, string>();
  const orderNumberIndex = new Map<string, string>();

  let counter = 1000;

  function nextOrderNumber(): string {
    counter += 1;
    return `PO-${counter}`;
  }

  return {
    async createIfNotExists(
      input: CreateProductOrderInput,
    ): Promise<{ created: boolean; order: ProductOrderRecord }> {
      const idxKey = `${input.buyerId}:${input.idempotencyKey}`;
      const existingId = idempIndex.get(idxKey);
      if (existingId) {
        const existing = store.get(existingId);
        if (existing) {
          return {
            created: false,
            order: orderToDomain(existing),
          };
        }
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const orderNumber = nextOrderNumber();
      const rec: PersistedProductOrder = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        buyerId: input.buyerId,
        expiresAt: input.expiresAt ?? null,
        idempotencyKey: input.idempotencyKey,
        orderNumber,
        paidAt: null,
        reservationId: '',
        shippingAddressSnapshot: input.shippingAddressSnapshot ?? null,
        snapshot: JSON.stringify(input.snapshot),
        status: 'DRAFT',
        totalMinor: input.snapshot.priceMinor * input.snapshot.quantity,
      };
      store.set(id, rec);
      idempIndex.set(idxKey, id);
      orderNumberIndex.set(orderNumber, id);
      return {
        created: true,
        order: orderToDomain(rec),
      };
    },
    async findById(id: Uuidv7): Promise<ProductOrderRecord | null> {
      const rec = store.get(id);
      return rec ? orderToDomain(rec) : null;
    },
    async findByOrderNumber(
      orderNumber: string,
    ): Promise<ProductOrderRecord | null> {
      const id = orderNumberIndex.get(orderNumber);
      if (!id) return null;
      const rec = store.get(id);
      return rec ? orderToDomain(rec) : null;
    },
    async list(
      request: RepositoryListRequest<ProductOrderFilter, ProductOrderSortField>,
    ): Promise<RepositoryListPage<ProductOrderRecord>> {
      let items = Array.from(store.values()).filter((r) => !r.deletedAt);
      const f = request.filter;
      if (f) {
        if (f.buyerId) items = items.filter((r) => r.buyerId === f.buyerId);
        if (f.status) items = items.filter((r) => r.status === f.status);
        if (f.sellerId) {
          items = items.filter((r) => {
            const s = JSON.parse(r.snapshot);
            return s.sellerId === f.sellerId;
          });
        }
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        let cmp = 0;
        if (request.sort.field === 'orderNumber') {
          cmp = a.orderNumber.localeCompare(b.orderNumber);
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
        items: page.map(orderToDomain),
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.length)
            : null,
      };
    },
    async update(
      order: ProductOrderRecord,
      expectedVersion: number,
    ): Promise<ProductOrderRecord> {
      const existing = store.get(order.id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: order.id,
          entityName: 'ProductOrder',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: order.id,
          entityName: 'ProductOrder',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedProductOrder = {
        ...orderToPersistence(order),
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(order.id, updated);
      return orderToDomain(updated);
    },
  };
}
