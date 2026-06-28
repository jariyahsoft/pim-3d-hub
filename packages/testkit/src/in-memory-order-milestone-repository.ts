import {
  RepositoryConflictError,
  type CreateOrderMilestoneInput,
  type OrderMilestoneRecord,
  type OrderMilestoneRepository,
  type Uuidv7,
} from '@pim/domain'

export type ClockPort = { now: () => string }
export type UuidGeneratorPort = { next: () => Uuidv7 }

export function createInMemoryOrderMilestoneRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): OrderMilestoneRepository {
  const milestones = new Map<Uuidv7, OrderMilestoneRecord>()

  return {
    async create(input: CreateOrderMilestoneInput): Promise<OrderMilestoneRecord> {
      const id = input.id ?? uuidGenerator.next()
      const now = clock.now()

      const milestone: OrderMilestoneRecord = {
        id,
        orderId: input.orderId,
        sequence: input.sequence,
        title: input.title,
        description: input.description ?? null,
        dueAt: input.dueAt ?? null,
        status: input.status ?? 'PENDING',
        submittedAt: input.submittedAt ?? null,
        submittedByUserId: input.submittedByUserId ?? null,
        approvedAt: input.approvedAt ?? null,
        approvedByUserId: input.approvedByUserId ?? null,
        revisionRequestedAt: input.revisionRequestedAt ?? null,
        revisionRequestedByUserId: input.revisionRequestedByUserId ?? null,
        revisionNotes: input.revisionNotes ?? null,
        revisionCount: input.revisionCount ?? 0,
        deliverableAssetIds: input.deliverableAssetIds ?? [],
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
      }

      milestones.set(id, milestone)
      return milestone
    },

    async findById(id: Uuidv7): Promise<OrderMilestoneRecord | null> {
      return milestones.get(id) ?? null
    },

    async listByOrderId(orderId: Uuidv7): Promise<readonly OrderMilestoneRecord[]> {
      return Array.from(milestones.values())
        .filter((m) => m.orderId === orderId && !m.deletedAt)
        .sort((a, b) => a.sequence - b.sequence)
    },

    async update(
      milestone: OrderMilestoneRecord,
      expectedVersion: number,
    ): Promise<OrderMilestoneRecord> {
      const existing = milestones.get(milestone.id)
      if (!existing) {
        throw new Error(`Order milestone ${milestone.id} not found`)
      }

      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityName: 'OrderMilestone',
          entityId: milestone.id,
          expectedVersion,
          actualVersion: existing.version,
        })
      }

      const updated: OrderMilestoneRecord = {
        ...milestone,
        version: existing.version + 1,
        updatedAt: clock.now(),
      }

      milestones.set(milestone.id, updated)
      return updated
    },
  }
}
