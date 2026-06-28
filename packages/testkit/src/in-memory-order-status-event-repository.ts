import {
  type CreateOrderStatusEventInput,
  type OrderStatusEventRecord,
  type OrderStatusEventRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export function createInMemoryOrderStatusEventRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): OrderStatusEventRepository {
  const events = new Map<Uuidv7, OrderStatusEventRecord>()

  async function create(
    input: CreateOrderStatusEventInput,
  ): Promise<OrderStatusEventRecord> {
    const now = clock.now()
    const record: OrderStatusEventRecord = {
      id: input.id ?? uuidGenerator.next(),
      orderId: input.orderId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
      createdAt: now,
      createdBy: input.createdBy ?? null,
      deletedAt: null,
      updatedAt: now,
      updatedBy: input.updatedBy ?? null,
      version: 1,
      schemaVersion: 1,
    }

    events.set(record.id, record)
    return record
  }

  async function listByOrderId(
    orderId: Uuidv7,
  ): Promise<readonly OrderStatusEventRecord[]> {
    return Array.from(events.values())
      .filter((event) => event.orderId === orderId && !event.deletedAt)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
  }

  return Object.freeze({
    create,
    listByOrderId,
  })
}
