import {
  RepositoryConflictError,
  type CreateOrderInput,
  type OrderFilter,
  type OrderRecord,
  type OrderRepository,
  type OrderSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export function createInMemoryOrderRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): OrderRepository {
  const orders = new Map<Uuidv7, OrderRecord>()
  const orderNumberIndex = new Map<string, Uuidv7>()

  async function create(input: CreateOrderInput): Promise<OrderRecord> {
    const now = clock.now()

    // Check for duplicate order number
    if (orderNumberIndex.has(input.orderNumber)) {
      throw new Error(`Order number ${input.orderNumber} already exists`)
    }

    const record: OrderRecord = {
      id: input.id ?? uuidGenerator.next(),
      orderNumber: input.orderNumber,
      buyerUserId: input.buyerUserId,
      providerProfileId: input.providerProfileId,
      serviceRequestId: input.serviceRequestId ?? null,
      status: input.status ?? 'DRAFT',
      currency: input.currency,
      subtotal: input.subtotal,
      taxAmount: input.taxAmount ?? null,
      shippingAmount: input.shippingAmount ?? null,
      totalAmount: input.totalAmount,
      buyerSnapshot: input.buyerSnapshot,
      providerSnapshot: input.providerSnapshot,
      shippingAddressSnapshot: input.shippingAddressSnapshot ?? null,
      sourceSnapshot: input.sourceSnapshot,
      notes: input.notes ?? null,
      expectedDeliveryAt: input.expectedDeliveryAt ?? null,
      confirmedAt: input.confirmedAt ?? null,
      cancelledAt: input.cancelledAt ?? null,
      completedAt: input.completedAt ?? null,
      createdAt: now,
      createdBy: input.createdBy ?? null,
      deletedAt: null,
      updatedAt: now,
      updatedBy: input.updatedBy ?? null,
      version: 1,
      schemaVersion: 1,
    }

    orders.set(record.id, record)
    orderNumberIndex.set(record.orderNumber, record.id)
    return record
  }

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<OrderRecord | null> {
    const order = orders.get(id)
    if (!order) {
      return null
    }

    if (order.deletedAt && !options?.includeDeleted) {
      return null
    }

    return order
  }

  async function findByOrderNumber(orderNumber: string): Promise<OrderRecord | null> {
    const id = orderNumberIndex.get(orderNumber)
    if (!id) {
      return null
    }

    return findById(id)
  }

  async function list(
    request: RepositoryListRequest<OrderFilter, OrderSortField>,
  ): Promise<RepositoryListPage<OrderRecord>> {
    const { cursor: cursorInput, filter = {}, limit, sort } = request
    const sortDirection = sort.direction
    const sortField = sort.field

    let items = Array.from(orders.values()).filter((o) => !o.deletedAt)

    // Apply filters
    if (filter.buyerUserId) {
      items = items.filter((o) => o.buyerUserId === filter.buyerUserId)
    }

    if (filter.providerProfileId) {
      items = items.filter((o) => o.providerProfileId === filter.providerProfileId)
    }

    if (filter.serviceRequestId) {
      items = items.filter((o) => o.serviceRequestId === filter.serviceRequestId)
    }

    if (filter.status) {
      items = items.filter((o) => o.status === filter.status)
    }

    // Sort
    items.sort((a, b) => {
      let aValue: string
      let bValue: string

      if (sortField === 'orderNumber') {
        aValue = a.orderNumber
        bValue = b.orderNumber
      } else {
        aValue = a[sortField] as UtcTimestamp
        bValue = b[sortField] as UtcTimestamp
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    })

    // Apply cursor
    if (cursorInput) {
      const cursorIndex = items.findIndex((o) => o.id === cursorInput)
      if (cursorIndex !== -1) {
        items = items.slice(cursorIndex + 1)
      }
    }

    // Paginate
    const page = items.slice(0, limit)
    const hasMore = items.length > limit
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1]!.id : null

    return {
      items: page,
      nextCursor,
    }
  }

  async function update(
    order: OrderRecord,
    expectedVersion: number,
  ): Promise<OrderRecord> {
    const existing = orders.get(order.id)
    if (!existing) {
      throw new RepositoryConflictError({
        entityName: 'Order',
        entityId: order.id,
        expectedVersion,
        actualVersion: 0,
      })
    }

    if (existing.version !== expectedVersion) {
      throw new RepositoryConflictError({
        entityName: 'Order',
        entityId: order.id,
        expectedVersion,
        actualVersion: existing.version,
      })
    }

    const updated: OrderRecord = {
      ...order,
      updatedAt: clock.now(),
      version: existing.version + 1,
    }

    orders.set(updated.id, updated)
    return updated
  }

  return Object.freeze({
    create,
    findById,
    findByOrderNumber,
    list,
    update,
  })
}
