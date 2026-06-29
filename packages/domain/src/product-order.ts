import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type {
  CurrencyCode,
  MoneyMinor,
  UtcTimestamp,
  Uuidv7,
} from './index.js';

// ── Statuses ───────────────────────────────────────────────────────────────

export const productOrderStatuses = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'FULFILLING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type ProductOrderStatus = (typeof productOrderStatuses)[number];

export const productOrderSortFields = [
  'createdAt',
  'updatedAt',
  'orderNumber',
] as const;
export type ProductOrderSortField = (typeof productOrderSortFields)[number];

const allowedProductOrderTransitions: Record<
  ProductOrderStatus,
  ProductOrderStatus[]
> = {
  DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['FULFILLING', 'REFUNDED'],
  FULFILLING: ['SHIPPED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export class ProductOrderStateTransitionError extends Error {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly currentStatus: ProductOrderStatus;
  readonly status = 422;
  readonly targetStatus: ProductOrderStatus;

  constructor(input: {
    currentStatus: ProductOrderStatus;
    targetStatus: ProductOrderStatus;
  }) {
    super(
      `Product order cannot transition from ${input.currentStatus} to ${input.targetStatus}`,
    );
    this.name = 'ProductOrderStateTransitionError';
    this.currentStatus = input.currentStatus;
    this.targetStatus = input.targetStatus;
  }
}

export function assertProductOrderTransition(
  current: ProductOrderStatus,
  target: ProductOrderStatus,
): void {
  if (!allowedProductOrderTransitions[current].includes(target)) {
    throw new ProductOrderStateTransitionError({
      currentStatus: current,
      targetStatus: target,
    });
  }
}

// ── Stock Reservation ────────────────────────────────────────────────────

/**
 * StockReservation tracks inventory units held by a pending product order.
 * The reservation is `ACTIVE` until released or converted to a committed sale.
 *
 * IDEMPOTENCY: each active reservation is keyed by the orderId so retries
 * return the same record rather than creating duplicates.
 */
export const stockReservationStatuses = [
  'ACTIVE',
  'RELEASED',
  'COMMITTED',
] as const;
export type StockReservationStatus = (typeof stockReservationStatuses)[number];

export type StockReservationRecord = Readonly<
  CanonicalRecord & {
    idempotencyKey: string;
    orderId: Uuidv7;
    productId: Uuidv7;
    status: StockReservationStatus;
    units: number;
    variantSku: string;
  }
>;

export type CreateStockReservationInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  idempotencyKey: string;
  orderId: Uuidv7;
  productId: Uuidv7;
  units: number;
  variantSku: string;
}>;

export type StockReservationFilter = Readonly<{
  orderId?: Uuidv7;
  productId?: Uuidv7;
  status?: StockReservationStatus;
}>;

export type StockReservationSortField = 'createdAt' | 'updatedAt';

export type StockReservationRepository = Readonly<{
  /**
   * Atomic create-or-get keyed by `orderId`. Returns the existing reservation
   * when present; otherwise creates a new one with `idempotencyKey` snapshot.
   */
  createIfNotExists(
    input: CreateStockReservationInput,
  ): Promise<
    Readonly<{ created: boolean; reservation: StockReservationRecord }>
  >;
  commit(id: Uuidv7, expectedVersion: number): Promise<StockReservationRecord>;
  findById(id: Uuidv7): Promise<StockReservationRecord | null>;
  findByOrderId(orderId: Uuidv7): Promise<StockReservationRecord | null>;
  list(
    request: RepositoryListRequest<
      StockReservationFilter,
      StockReservationSortField
    >,
  ): Promise<RepositoryListPage<StockReservationRecord>>;
  release(id: Uuidv7, expectedVersion: number): Promise<StockReservationRecord>;
}>;

// ── Product Order ────────────────────────────────────────────────────────

/**
 * ProductOrder snapshots the order at the time of purchase. Title, price,
 * variant info, and seller fields are captured here — even if the underlying
 * product listing is later edited or removed, the order keeps the values the
 * buyer and seller agreed on at checkout.
 */
export type ProductOrderSnapshot = Readonly<{
  currency: CurrencyCode;
  description: string;
  priceMinor: MoneyMinor;
  productId: Uuidv7;
  productTitle: string;
  quantity: number;
  sellerId: Uuidv7;
  variantOptions: Readonly<Record<string, string>>;
  variantSku: string;
}>;

export type ProductOrderRecord = Readonly<
  CanonicalRecord & {
    buyerId: Uuidv7;
    expiresAt: UtcTimestamp | null;
    idempotencyKey: string;
    orderNumber: string;
    paidAt: UtcTimestamp | null;
    reservationId: Uuidv7;
    shippingAddressSnapshot: string | null;
    snapshot: ProductOrderSnapshot;
    status: ProductOrderStatus;
    totalMinor: MoneyMinor;
  }
>;

export type CreateProductOrderInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  buyerId: Uuidv7;
  expiresAt?: UtcTimestamp | null;
  idempotencyKey: string;
  shippingAddressSnapshot?: string | null;
  snapshot: ProductOrderSnapshot;
}>;

export type ProductOrderFilter = Readonly<{
  buyerId?: Uuidv7;
  sellerId?: Uuidv7;
  status?: ProductOrderStatus;
}>;

export type ProductOrderRepository = Readonly<{
  createIfNotExists(
    input: CreateProductOrderInput,
  ): Promise<Readonly<{ created: boolean; order: ProductOrderRecord }>>;
  findById(id: Uuidv7): Promise<ProductOrderRecord | null>;
  findByOrderNumber(orderNumber: string): Promise<ProductOrderRecord | null>;
  list(
    request: RepositoryListRequest<ProductOrderFilter, ProductOrderSortField>,
  ): Promise<RepositoryListPage<ProductOrderRecord>>;
  update(
    order: ProductOrderRecord,
    expectedVersion: number,
  ): Promise<ProductOrderRecord>;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class ProductOrderError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ProductOrderError';
  }
}

export class InsufficientStockError extends ProductOrderError {
  constructor(productId: Uuidv7, requested: number, available: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Product ${productId} has ${available} units; requested ${requested}`,
      409,
    );
    this.name = 'InsufficientStockError';
  }
}
