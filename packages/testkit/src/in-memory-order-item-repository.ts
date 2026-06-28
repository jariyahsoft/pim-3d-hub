import {
  type CreateOrderItemInput,
  type OrderItemRecord,
  type OrderItemRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export function createInMemoryOrderItemRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): OrderItemRepository {
  const items = new Map<Uuidv7, OrderItemRecord>()

  async function create(input: CreateOrderItemInput): Promise<OrderItemRecord> {
    const now = clock.now()
    const record: OrderItemRecord = {
      id: input.id ?? uuidGenerator.next(),
      orderId: input.orderId,
      itemType: input.itemType,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      totalPrice: input.totalPrice,
      sequence: input.sequence,
      createdAt: now,
      createdBy: input.createdBy ?? null,
      deletedAt: null,
      updatedAt: now,
      updatedBy: input.updatedBy ?? null,
      version: 1,
      schemaVersion: 1,
    }

    items.set(record.id, record)
    return record
  }

  async function findById(id: Uuidv7): Promise<OrderItemRecord | null> {
    const item = items.get(id)
    if (!item || item.deletedAt) {
      return null
    }

    return item
  }

  async function listByOrderId(orderId: Uuidv7): Promise<readonly OrderItemRecord[]> {
    return Array.from(items.values())
      .filter((item) => item.orderId === orderId && !item.deletedAt)
      .sort((a, b) => a.sequence - b.sequence)
  }

  return Object.freeze({
    create,
    findById,
    listByOrderId,
  })
}
