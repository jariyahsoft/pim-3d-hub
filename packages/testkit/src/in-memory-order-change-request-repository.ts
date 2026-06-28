import {
  RepositoryConflictError,
  type CreateOrderChangeRequestInput,
  type OrderChangeRequestRecord,
  type OrderChangeRequestRepository,
  type Uuidv7,
} from '@pim/domain'

export type ClockPort = { now: () => string }
export type UuidGeneratorPort = { next: () => Uuidv7 }

export function createInMemoryOrderChangeRequestRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): OrderChangeRequestRepository {
  const changeRequests = new Map<Uuidv7, OrderChangeRequestRecord>()

  return {
    async create(
      input: CreateOrderChangeRequestInput,
    ): Promise<OrderChangeRequestRecord> {
      const id = input.id ?? uuidGenerator.next()
      const now = clock.now()

      const changeRequest: OrderChangeRequestRecord = {
        id,
        orderId: input.orderId,
        requestType: input.requestType,
        requestedByUserId: input.requestedByUserId,
        title: input.title,
        description: input.description,
        priceAdjustment: input.priceAdjustment ?? null,
        scheduleAdjustmentDays: input.scheduleAdjustmentDays ?? null,
        scopeDetails: input.scopeDetails ?? null,
        status: input.status ?? 'PENDING',
        approvedAt: input.approvedAt ?? null,
        approvedByUserId: input.approvedByUserId ?? null,
        rejectedAt: input.rejectedAt ?? null,
        rejectedByUserId: input.rejectedByUserId ?? null,
        rejectionReason: input.rejectionReason ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
      }

      changeRequests.set(id, changeRequest)
      return changeRequest
    },

    async findById(id: Uuidv7): Promise<OrderChangeRequestRecord | null> {
      return changeRequests.get(id) ?? null
    },

    async listByOrderId(orderId: Uuidv7): Promise<readonly OrderChangeRequestRecord[]> {
      return Array.from(changeRequests.values())
        .filter((cr) => cr.orderId === orderId && !cr.deletedAt)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },

    async update(
      changeRequest: OrderChangeRequestRecord,
      expectedVersion: number,
    ): Promise<OrderChangeRequestRecord> {
      const existing = changeRequests.get(changeRequest.id)
      if (!existing) {
        throw new Error(`Order change request ${changeRequest.id} not found`)
      }

      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityName: 'OrderChangeRequest',
          entityId: changeRequest.id,
          expectedVersion,
          actualVersion: existing.version,
        })
      }

      const updated: OrderChangeRequestRecord = {
        ...changeRequest,
        version: existing.version + 1,
        updatedAt: clock.now(),
      }

      changeRequests.set(changeRequest.id, updated)
      return updated
    },
  }
}
