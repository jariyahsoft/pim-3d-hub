import {
  type CreateProductOrderInput,
  type ProductOrderFilter,
  type ProductOrderRecord,
  type ProductOrderRepository,
  type ProductOrderSortField,
  type ProductOrderSnapshot,
  type ProductOrderStatus,
  type ProductRepository,
  type ProductSearchFilter,
  type ProductSearchPort,
  type ProductSearchResult,
  type ProductSearchSortField,
  type ProductVariantRecord,
  type RepositoryListPage,
  type RepositoryListRequest,
  type StockReservationRecord,
  type StockReservationRepository,
  type Uuidv7,
  assertProductOrderTransition,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type SearchProductsQuery = Readonly<{
  cursor: string | null;
  filter?: ProductSearchFilter;
  limit: number;
  sortDirection?: 'asc' | 'desc';
  sortField?: ProductSearchSortField;
}>;

export type PlaceOrderCommand = Readonly<{
  actorUserId: Uuidv7;
  buyerId: Uuidv7;
  idempotencyKey: string;
  productId: Uuidv7;
  quantity: number;
  shippingAddress: string | null;
  variantSku: string;
}>;

export type PayOrderCommand = Readonly<{
  actorPaymentId: string;
  buyerId: Uuidv7;
  expectedVersion: number;
  idempotencyKey: string;
  orderId: Uuidv7;
  reservationId: Uuidv7;
}>;

export type CancelExpiredOrderCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  expiresAt: number;
  orderId: Uuidv7;
  reason: 'PAYMENT_EXPIRED' | 'PAYMENT_FAILED';
}>;

export type ListOrdersQuery = Readonly<{
  cursor: string | null;
  filter?: ProductOrderFilter;
  limit: number;
  sortDirection?: 'asc' | 'desc';
  sortField?: ProductOrderSortField;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type ProductSearchResponseDto = RepositoryListPage<ProductSearchResult>;

export type ProductOrderDto = Readonly<{
  buyerId: Uuidv7;
  createdAt: string;
  expiresAt: string | null;
  id: Uuidv7;
  orderNumber: string;
  paidAt: string | null;
  reservationId: Uuidv7;
  snapshot: ProductOrderSnapshot;
  status: ProductOrderStatus;
  totalMinor: number;
  version: number;
}>;

function orderToDto(rec: ProductOrderRecord): ProductOrderDto {
  return {
    id: rec.id,
    orderNumber: rec.orderNumber,
    buyerId: rec.buyerId,
    status: rec.status,
    snapshot: { ...rec.snapshot },
    totalMinor: rec.totalMinor,
    paidAt: rec.paidAt,
    expiresAt: rec.expiresAt,
    reservationId: rec.reservationId,
    createdAt: rec.createdAt,
    version: rec.version,
  };
}

// ── Errors ────────────────────────────────────────────────────────────────

export class ProductSearchOrderError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ProductSearchOrderError';
  }
}

// ── Service ports ─────────────────────────────────────────────────────────

export type ProductSearchOrderServicePorts = Readonly<{
  productRepository: ProductRepository;
  productOrderRepository: ProductOrderRepository;
  searchPort: ProductSearchPort;
  stockReservationRepository: StockReservationRepository;
}>;

// ── Service ───────────────────────────────────────────────────────────────

export type ProductSearchOrderService = Readonly<{
  cancelExpiredOrder(
    command: CancelExpiredOrderCommand,
  ): Promise<ProductOrderDto>;
  getOrder(orderId: Uuidv7): Promise<ProductOrderDto>;
  listOrders(
    query: ListOrdersQuery,
  ): Promise<RepositoryListPage<ProductOrderDto>>;
  payOrder(command: PayOrderCommand): Promise<ProductOrderDto>;
  placeOrder(command: PlaceOrderCommand): Promise<ProductOrderDto>;
  search(query: SearchProductsQuery): Promise<ProductSearchResponseDto>;
}>;

export function createProductSearchOrderService(
  ports: ProductSearchOrderServicePorts,
): ProductSearchOrderService {
  const productRepo = ports.productRepository;
  const orderRepo = ports.productOrderRepository;
  const reservationRepo = ports.stockReservationRepository;

  async function search(
    query: SearchProductsQuery,
  ): Promise<ProductSearchResponseDto> {
    const request: RepositoryListRequest<
      ProductSearchFilter,
      ProductSearchSortField
    > = {
      cursor: query.cursor ?? undefined,
      filter: query.filter,
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'desc',
        field: query.sortField ?? 'NEWEST',
      },
    };
    return ports.searchPort.search(request);
  }

  async function placeOrder(
    command: PlaceOrderCommand,
  ): Promise<ProductOrderDto> {
    if (command.buyerId !== command.actorUserId) {
      throw new ProductSearchOrderError(
        'AUTHORIZATION_DENIED',
        'Cannot place order on behalf of another user',
        403,
      );
    }

    if (command.quantity <= 0) {
      throw new ProductSearchOrderError(
        'VALIDATION_ERROR',
        'Quantity must be positive',
        400,
      );
    }

    const product = await productRepo.findById(command.productId);
    if (!product) {
      throw new ProductSearchOrderError(
        'PRODUCT_NOT_FOUND',
        `Product ${command.productId} not found`,
        404,
      );
    }
    if (product.status !== 'PUBLISHED') {
      throw new ProductSearchOrderError(
        'PRODUCT_NOT_AVAILABLE',
        `Product is in ${product.status} state`,
        409,
      );
    }
    const variant = (product.variants as ProductVariantRecord[]).find(
      (v) => v.sku === command.variantSku,
    );
    if (!variant) {
      throw new ProductSearchOrderError(
        'VARIANT_NOT_FOUND',
        `Variant ${command.variantSku} not found; product.variants=${JSON.stringify(product.variants).slice(0, 200)}`,
        404,
      );
    }

    // Snapshot the order at purchase time (immutable from now)
    const snapshot: ProductOrderSnapshot = {
      currency: product.currency,
      description: product.description,
      priceMinor: variant.priceMinor,
      productId: product.id,
      productTitle: product.title,
      quantity: command.quantity,
      sellerId: product.publisherUserId,
      variantOptions: { ...variant.options },
      variantSku: variant.sku,
    };

    const input: CreateProductOrderInput = {
      actorUserId: command.actorUserId,
      buyerId: command.buyerId,
      idempotencyKey: command.idempotencyKey,
      snapshot,
      shippingAddressSnapshot: command.shippingAddress,
    };

    const orderResult = await orderRepo.createIfNotExists(input);
    const order = orderResult.order;

    // Reserve stock tied to the actual order ID
    const reservationResult = await reservationRepo.createIfNotExists({
      orderId: order.id,
      productId: command.productId,
      variantSku: command.variantSku,
      units: command.quantity,
      actorUserId: command.actorUserId,
      idempotencyKey: `res-${command.idempotencyKey}`,
    });
    const reservation = reservationResult.reservation as StockReservationRecord;

    // Verify enough stock is available (count other active reservations by variant)
    const activeReservations = await reservationRepo.list({
      filter: { productId: command.productId, status: 'ACTIVE' },
      limit: 100,
      sort: { direction: 'desc', field: 'createdAt' },
    });
    const otherReservedActive = activeReservations.items
      .filter(
        (r) => r.variantSku === command.variantSku && r.id !== reservation.id,
      )
      .reduce((sum, r) => sum + r.units, 0);
    const available =
      variant.inventoryTotalUnits -
      variant.inventoryReservedUnits -
      otherReservedActive;
    if (command.quantity > available) {
      await reservationRepo.release(reservation.id, reservation.version);
      throw new ProductSearchOrderError(
        'INSUFFICIENT_STOCK',
        `Only ${Math.max(0, available)} units available; ${command.quantity} requested (total=${variant.inventoryTotalUnits}, reserved=${variant.inventoryReservedUnits}, otherActive=${otherReservedActive})`,
        409,
      );
    }

    // Move order to PENDING_PAYMENT
    assertProductOrderTransition(order.status, 'PENDING_PAYMENT');
    const updated: ProductOrderRecord = {
      ...order,
      status: 'PENDING_PAYMENT',
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      reservationId: reservation.id,
    };
    try {
      const updatedOrder = await orderRepo.update(updated, order.version);
      return orderToDto(updatedOrder);
    } catch (err) {
      throw new ProductSearchOrderError(
        'VERSION_CONFLICT',
        err instanceof Error ? err.message : 'order update failed',
        409,
      );
    }
  }

  async function payOrder(command: PayOrderCommand): Promise<ProductOrderDto> {
    const existing = await orderRepo.findById(command.orderId);
    if (!existing) {
      throw new ProductSearchOrderError(
        'ORDER_NOT_FOUND',
        `Order ${command.orderId} not found`,
        404,
      );
    }
    if (existing.buyerId !== command.buyerId) {
      throw new ProductSearchOrderError(
        'AUTHORIZATION_DENIED',
        'Only the buyer can pay this order',
        403,
      );
    }

    assertProductOrderTransition(existing.status, 'PAID');
    const updated: ProductOrderRecord = {
      ...existing,
      status: 'PAID',
      paidAt: new Date().toISOString(),
      reservationId: command.reservationId,
      idempotencyKey: command.idempotencyKey,
    };
    try {
      const updatedOrder = await orderRepo.update(
        updated,
        command.expectedVersion,
      );
      // Commit reservation (terminal state)
      const reservation = await reservationRepo.findById(command.reservationId);
      if (reservation && reservation.status === 'ACTIVE') {
        await reservationRepo.commit(reservation.id, reservation.version);
      }
      return orderToDto(updatedOrder);
    } catch (err) {
      throw new ProductSearchOrderError(
        'VERSION_CONFLICT',
        err instanceof Error ? err.message : 'payment update failed',
        409,
      );
    }
  }

  async function cancelExpiredOrder(
    command: CancelExpiredOrderCommand,
  ): Promise<ProductOrderDto> {
    const existing = await orderRepo.findById(command.orderId);
    if (!existing) {
      throw new ProductSearchOrderError(
        'ORDER_NOT_FOUND',
        `Order ${command.orderId} not found`,
        404,
      );
    }
    if (existing.status !== 'PENDING_PAYMENT') {
      // Idempotent: already terminal
      return orderToDto(existing);
    }

    assertProductOrderTransition(existing.status, 'CANCELLED');
    const updated: ProductOrderRecord = {
      ...existing,
      status: 'CANCELLED',
    };
    try {
      const updatedOrder = await orderRepo.update(
        updated,
        command.expectedVersion,
      );

      // Release stock reservation exactly once
      if (existing.reservationId) {
        const r = await reservationRepo.findById(existing.reservationId);
        if (r && r.status === 'ACTIVE') {
          try {
            await reservationRepo.release(r.id, r.version);
          } catch {
            // Best-effort release; if it already released, that's idempotent
          }
        }
      }
      return orderToDto(updatedOrder);
    } catch (err) {
      throw new ProductSearchOrderError(
        'VERSION_CONFLICT',
        err instanceof Error ? err.message : 'cancel failed',
        409,
      );
    }
  }

  async function getOrder(orderId: Uuidv7): Promise<ProductOrderDto> {
    const rec = await orderRepo.findById(orderId);
    if (!rec) {
      throw new ProductSearchOrderError(
        'ORDER_NOT_FOUND',
        `Order ${orderId} not found`,
        404,
      );
    }
    return orderToDto(rec);
  }

  async function listOrders(
    query: ListOrdersQuery,
  ): Promise<RepositoryListPage<ProductOrderDto>> {
    const request: RepositoryListRequest<
      ProductOrderFilter,
      ProductOrderSortField
    > = {
      cursor: query.cursor ?? undefined,
      filter: query.filter,
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'desc',
        field: query.sortField ?? 'createdAt',
      },
    };
    const page = await orderRepo.list(request);
    return {
      items: page.items.map(orderToDto),
      nextCursor: page.nextCursor,
    };
  }

  return {
    cancelExpiredOrder,
    getOrder,
    listOrders,
    payOrder,
    placeOrder,
    search,
  };
}
