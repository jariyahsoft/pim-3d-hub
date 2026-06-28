import type { MoneyMinor, UtcTimestamp } from '@pim/domain'

// Provider-neutral payment port
export type PaymentPort = Readonly<{
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>
  getPaymentIntent(providerIntentId: string): Promise<PaymentIntentResponse>
  cancelPaymentIntent(providerIntentId: string): Promise<PaymentIntentResponse>
  createRefund(request: CreateRefundRequest): Promise<RefundResponse>
}>

export type CreatePaymentIntentRequest = Readonly<{
  amount: MoneyMinor
  currency: string
  orderId: string
  idempotencyKey: string
  metadata?: Record<string, string>
  expiresAt?: UtcTimestamp
}>

export type PaymentIntentResponse = Readonly<{
  providerIntentId: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'expired'
  amount: MoneyMinor
  currency: string
  clientSecret?: string
  failureReason?: string
  expiresAt?: UtcTimestamp
  succeededAt?: UtcTimestamp
  metadata: Record<string, unknown>
}>

export type CreateRefundRequest = Readonly<{
  providerIntentId: string
  amount: MoneyMinor
  currency: string
  reason: string
  idempotencyKey: string
}>

export type RefundResponse = Readonly<{
  providerRefundId: string
  status: 'pending' | 'succeeded' | 'failed'
  amount: MoneyMinor
  currency: string
  failureReason?: string
}>

export type WebhookSignatureVerificationRequest = Readonly<{
  rawBody: string
  signature: string
  secret: string
}>

export type WebhookSignatureVerifier = Readonly<{
  verify(request: WebhookSignatureVerificationRequest): boolean
}>
