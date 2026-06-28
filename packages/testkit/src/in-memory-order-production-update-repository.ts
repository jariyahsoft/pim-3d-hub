import {
  type CreateOrderProductionUpdateInput,
  type OrderProductionUpdateRecord,
  type OrderProductionUpdateRepository,
  type Uuidv7,
} from '@pim/domain'

export type ClockPort = { now: () => string }
export type UuidGeneratorPort = { next: () => Uuidv7 }

export function createInMemoryOrderProductionUpdateRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): OrderProductionUpdateRepository {
  const updates = new Map<Uuidv7, OrderProductionUpdateRecord>()

  return {
    async create(
      input: CreateOrderProductionUpdateInput,
    ): Promise<OrderProductionUpdateRecord> {
      const id = input.id ?? uuidGenerator.next()
      const now = clock.now()

      const update: OrderProductionUpdateRecord = {
        id,
        orderId: input.orderId,
        updateType: input.updateType,
        postedByUserId: input.postedByUserId,
        occurredAt: input.occurredAt,
        title: input.title,
        description: input.description ?? null,
        mediaAssetIds: input.mediaAssetIds ?? [],
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
      }

      updates.set(id, update)
      return update
    },

    async findById(id: Uuidv7): Promise<OrderProductionUpdateRecord | null> {
      return updates.get(id) ?? null
    },

    async listByOrderId(orderId: Uuidv7): Promise<readonly OrderProductionUpdateRecord[]> {
      return Array.from(updates.values())
        .filter((u) => u.orderId === orderId && !u.deletedAt)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    },
  }
}
