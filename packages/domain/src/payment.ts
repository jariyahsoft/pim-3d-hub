import type {
  CanonicalRecord,
  MoneyMinor,
  UtcTimestamp,
  Uuidv7,
} from './index.js'

// Payment intent statuses
export const paymentIntentStatuses = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const

export type PaymentIntentStatus = (typeof paymentIntentStatuses)[number]

// Payment methods
export const paymentMethods = [
  'CARD',
  'BANK_TRANSFER',
  'DIGITAL_WALLET',
  'QR_CODE',
] as const

export type PaymentMethod = (typeof paymentMethods)[number]

// Payment intent record
export type PaymentIntentRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    amount: MoneyMinor
    currency: string
    status: PaymentIntentStatus
    paymentMethod: PaymentMethod | null
    providerName: string
    providerIntentId: string | null
    providerMetadata: Record<string, unknown>
    idempotencyKey: string
    expiresAt: UtcTimestamp | null
    succeededAt: UtcTimestamp | null
    failedAt: UtcTimestamp | null
    cancelledAt: UtcTimestamp | null
    failureReason: string | null
  }
>

export type CreatePaymentIntentInput = Readonly<{
  amount: MoneyMinor
  cancelledAt?: UtcTimestamp | null
  createdBy?: Uuidv7 | null
  currency: string
  expiresAt?: UtcTimestamp | null
  failedAt?: UtcTimestamp | null
  failureReason?: string | null
  id?: Uuidv7
  idempotencyKey: string
  orderId: Uuidv7
  paymentMethod?: PaymentMethod | null
  providerIntentId?: string | null
  providerMetadata?: Record<string, unknown>
  providerName: string
  status?: PaymentIntentStatus
  succeededAt?: UtcTimestamp | null
  updatedBy?: Uuidv7 | null
}>

export type PaymentIntentRepository = Readonly<{
  create(input: CreatePaymentIntentInput): Promise<PaymentIntentRecord>
  findById(id: Uuidv7): Promise<PaymentIntentRecord | null>
  findByIdempotencyKey(idempotencyKey: string): Promise<PaymentIntentRecord | null>
  findByOrderId(orderId: Uuidv7): Promise<readonly PaymentIntentRecord[]>
  update(
    intent: PaymentIntentRecord,
    expectedVersion: number,
  ): Promise<PaymentIntentRecord>
}>

// Payment webhook event record for idempotency
export type PaymentWebhookEventRecord = Readonly<
  CanonicalRecord & {
    providerName: string
    providerEventId: string
    eventType: string
    paymentIntentId: Uuidv7 | null
    orderId: Uuidv7 | null
    amount: MoneyMinor | null
    currency: string | null
    status: string
    rawPayload: string
    processedAt: UtcTimestamp | null
    processingError: string | null
  }
>

export type CreatePaymentWebhookEventInput = Readonly<{
  amount?: MoneyMinor | null
  createdBy?: Uuidv7 | null
  currency?: string | null
  eventType: string
  id?: Uuidv7
  orderId?: Uuidv7 | null
  paymentIntentId?: Uuidv7 | null
  processedAt?: UtcTimestamp | null
  processingError?: string | null
  providerEventId: string
  providerName: string
  rawPayload: string
  status: string
  updatedBy?: Uuidv7 | null
}>

export type PaymentWebhookEventRepository = Readonly<{
  create(input: CreatePaymentWebhookEventInput): Promise<PaymentWebhookEventRecord>
  findByProviderEventId(
    providerName: string,
    providerEventId: string,
  ): Promise<PaymentWebhookEventRecord | null>
  listByPaymentIntentId(
    paymentIntentId: Uuidv7,
  ): Promise<readonly PaymentWebhookEventRecord[]>
}>
