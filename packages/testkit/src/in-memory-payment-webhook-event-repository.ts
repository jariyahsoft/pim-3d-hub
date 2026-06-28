import {
  type CreatePaymentWebhookEventInput,
  type PaymentWebhookEventRecord,
  type PaymentWebhookEventRepository,
  type Uuidv7,
} from '@pim/domain'

export type ClockPort = { now: () => string }
export type UuidGeneratorPort = { next: () => Uuidv7 }

export function createInMemoryPaymentWebhookEventRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): PaymentWebhookEventRepository {
  const events = new Map<Uuidv7, PaymentWebhookEventRecord>()
  const providerEventIndex = new Map<string, Uuidv7>()

  function makeProviderEventKey(providerName: string, providerEventId: string): string {
    return `${providerName}:${providerEventId}`
  }

  return {
    async create(
      input: CreatePaymentWebhookEventInput,
    ): Promise<PaymentWebhookEventRecord> {
      const id = input.id ?? uuidGenerator.next()
      const now = clock.now()

      const event: PaymentWebhookEventRecord = {
        id,
        providerName: input.providerName,
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        paymentIntentId: input.paymentIntentId ?? null,
        orderId: input.orderId ?? null,
        amount: input.amount ?? null,
        currency: input.currency ?? null,
        status: input.status,
        rawPayload: input.rawPayload,
        processedAt: input.processedAt ?? null,
        processingError: input.processingError ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedAt: null,
      }

      events.set(id, event)
      const key = makeProviderEventKey(input.providerName, input.providerEventId)
      providerEventIndex.set(key, id)
      return event
    },

    async findByProviderEventId(
      providerName: string,
      providerEventId: string,
    ): Promise<PaymentWebhookEventRecord | null> {
      const key = makeProviderEventKey(providerName, providerEventId)
      const id = providerEventIndex.get(key)
      if (!id) return null
      return events.get(id) ?? null
    },

    async listByPaymentIntentId(
      paymentIntentId: Uuidv7,
    ): Promise<readonly PaymentWebhookEventRecord[]> {
      return Array.from(events.values())
        .filter(
          (event) => event.paymentIntentId === paymentIntentId && !event.deletedAt,
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },
  }
}
