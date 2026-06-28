import {
  type CreatePaymentIntentInput,
  type PaymentIntentRecord,
  type PaymentIntentRepository,
  type Uuidv7,
  RepositoryConflictError,
} from '@pim/domain'

export type ClockPort = { now: () => string }
export type UuidGeneratorPort = { next: () => Uuidv7 }

export function createInMemoryPaymentIntentRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): PaymentIntentRepository {
  const intents = new Map<Uuidv7, PaymentIntentRecord>()
  const idempotencyIndex = new Map<string, Uuidv7>()

  return {
    async create(input: CreatePaymentIntentInput): Promise<PaymentIntentRecord> {
      // Check idempotency
      const existingId = idempotencyIndex.get(input.idempotencyKey)
      if (existingId) {
        const existing = intents.get(existingId)
        if (existing) {
          return existing
        }
      }

      const id = input.id ?? uuidGenerator.next()
      const now = clock.now()

      const intent: PaymentIntentRecord = {
        id,
        orderId: input.orderId,
        amount: input.amount,
        currency: input.currency,
        status: input.status ?? 'PENDING',
        paymentMethod: input.paymentMethod ?? null,
        providerName: input.providerName,
        providerIntentId: input.providerIntentId ?? null,
        providerMetadata: input.providerMetadata ?? {},
        idempotencyKey: input.idempotencyKey,
        expiresAt: input.expiresAt ?? null,
        succeededAt: input.succeededAt ?? null,
        failedAt: input.failedAt ?? null,
        cancelledAt: input.cancelledAt ?? null,
        failureReason: input.failureReason ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
      }

      intents.set(id, intent)
      idempotencyIndex.set(input.idempotencyKey, id)
      return intent
    },

    async findById(id: Uuidv7): Promise<PaymentIntentRecord | null> {
      return intents.get(id) ?? null
    },

    async findByIdempotencyKey(
      idempotencyKey: string,
    ): Promise<PaymentIntentRecord | null> {
      const id = idempotencyIndex.get(idempotencyKey)
      if (!id) return null
      return intents.get(id) ?? null
    },

    async findByOrderId(orderId: Uuidv7): Promise<readonly PaymentIntentRecord[]> {
      return Array.from(intents.values())
        .filter((intent) => intent.orderId === orderId && !intent.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async update(
      intent: PaymentIntentRecord,
      expectedVersion: number,
    ): Promise<PaymentIntentRecord> {
      const existing = intents.get(intent.id)
      if (!existing) {
        throw new Error(`Payment intent ${intent.id} not found`)
      }

      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityName: 'PaymentIntent',
          entityId: intent.id,
          expectedVersion,
          actualVersion: existing.version,
        })
      }

      const updated: PaymentIntentRecord = {
        ...intent,
        version: existing.version + 1,
        updatedAt: clock.now(),
      }

      intents.set(intent.id, updated)
      return updated
    },
  }
}
