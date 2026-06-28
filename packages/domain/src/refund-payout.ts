import type { MoneyMinor, UtcTimestamp, Uuidv7 } from '@pim/domain'

// Refund domain types
export const refundStatuses = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const

export type RefundStatus = (typeof refundStatuses)[number]

export type RefundRecord = Readonly<{
  id: Uuidv7
  paymentIntentId: Uuidv7
  orderId: Uuidv7
  amount: MoneyMinor
  currency: string
  status: RefundStatus
  reason: string
  requestedByUserId: Uuidv7
  providerRefundId: string | null
  failureReason: string | null
  succeededAt: UtcTimestamp | null
  failedAt: UtcTimestamp | null
  version: number
  createdAt: UtcTimestamp
  updatedAt: UtcTimestamp
  createdBy: Uuidv7 | null
  updatedBy: Uuidv7 | null
  deletedAt: UtcTimestamp | null
}>

export type CreateRefundInput = Readonly<{
  id?: Uuidv7
  paymentIntentId: Uuidv7
  orderId: Uuidv7
  amount: MoneyMinor
  currency: string
  status?: RefundStatus
  reason: string
  requestedByUserId: Uuidv7
  providerRefundId?: string | null
  failureReason?: string | null
  succeededAt?: UtcTimestamp | null
  failedAt?: UtcTimestamp | null
  createdBy?: Uuidv7 | null
  updatedBy?: Uuidv7 | null
}>

export type RefundRepository = Readonly<{
  create(input: CreateRefundInput): Promise<RefundRecord>
  findById(id: Uuidv7): Promise<RefundRecord | null>
  listByPaymentIntentId(paymentIntentId: Uuidv7): Promise<readonly RefundRecord[]>
  listByOrderId(orderId: Uuidv7): Promise<readonly RefundRecord[]>
  update(refund: RefundRecord, expectedVersion: number): Promise<RefundRecord>
}>

// Payout domain types
export const payoutStatuses = [
  'PENDING',
  'ON_HOLD',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
] as const

export type PayoutStatus = (typeof payoutStatuses)[number]

export type PayoutRecord = Readonly<{
  id: Uuidv7
  orderId: Uuidv7
  providerProfileId: Uuidv7
  amount: MoneyMinor
  currency: string
  status: PayoutStatus
  holdReason: string | null
  providerPayoutId: string | null
  failureReason: string | null
  succeededAt: UtcTimestamp | null
  failedAt: UtcTimestamp | null
  releasedAt: UtcTimestamp | null
  version: number
  createdAt: UtcTimestamp
  updatedAt: UtcTimestamp
  createdBy: Uuidv7 | null
  updatedBy: Uuidv7 | null
  deletedAt: UtcTimestamp | null
}>

export type CreatePayoutInput = Readonly<{
  id?: Uuidv7
  orderId: Uuidv7
  providerProfileId: Uuidv7
  amount: MoneyMinor
  currency: string
  status?: PayoutStatus
  holdReason?: string | null
  providerPayoutId?: string | null
  failureReason?: string | null
  succeededAt?: UtcTimestamp | null
  failedAt?: UtcTimestamp | null
  releasedAt?: UtcTimestamp | null
  createdBy?: Uuidv7 | null
  updatedBy?: Uuidv7 | null
}>

export type PayoutRepository = Readonly<{
  create(input: CreatePayoutInput): Promise<PayoutRecord>
  findById(id: Uuidv7): Promise<PayoutRecord | null>
  findByOrderId(orderId: Uuidv7): Promise<PayoutRecord | null>
  listByProviderProfileId(
    providerProfileId: Uuidv7,
  ): Promise<readonly PayoutRecord[]>
  update(payout: PayoutRecord, expectedVersion: number): Promise<PayoutRecord>
}>
