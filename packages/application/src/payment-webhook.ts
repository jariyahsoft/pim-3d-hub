import {
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'
import {
  type CreatePaymentWebhookEventInput,
  type MoneyMinor,
  type OrderRepository,
  type PaymentIntentRepository,
  type PaymentWebhookEventRepository,
  type Uuidv7,
} from '@pim/domain'
import type { WebhookSignatureVerifier } from './payment-port.js'
import { createOrderService } from './order.js'

export type WebhookPayload = Readonly<{
  providerEventId: string
  eventType: string
  providerIntentId: string
  status: string
  amount: MoneyMinor
  currency: string
  metadata: Record<string, unknown>
}>

export class WebhookSignatureInvalidError extends Error {
  readonly code = 'WEBHOOK_SIGNATURE_INVALID'
  readonly status = 401

  constructor(message: string) {
    super(message)
    this.name = 'WebhookSignatureInvalidError'
  }
}

export class WebhookAmountMismatchError extends Error {
  readonly code = 'WEBHOOK_AMOUNT_MISMATCH'
  readonly status = 409

  constructor(message: string) {
    super(message)
    this.name = 'WebhookAmountMismatchError'
  }
}

export type ProcessWebhookCommand = Readonly<{
  rawBody: string
  signature: string
  webhookSecret: string
}>

export type WebhookProcessingResult = Readonly<{
  eventId: Uuidv7
  status: 'processed' | 'duplicate' | 'unsupported'
  paymentIntentId: Uuidv7 | null
  orderId: Uuidv7 | null
}>

export type PaymentWebhookServicePorts = Readonly<{
  clock: ClockPort
  uuidGenerator: UuidGeneratorPort
  paymentIntentRepository: PaymentIntentRepository
  paymentWebhookEventRepository: PaymentWebhookEventRepository
  orderRepository: OrderRepository
  signatureVerifier: WebhookSignatureVerifier
}>

export function createPaymentWebhookService(ports: PaymentWebhookServicePorts) {
  const {
    clock,
    uuidGenerator,
    paymentIntentRepository,
    paymentWebhookEventRepository,
    orderRepository,
    signatureVerifier,
  } = ports

  async function processWebhook(
    command: ProcessWebhookCommand,
  ): Promise<WebhookProcessingResult> {
    // Step 1: Verify signature BEFORE parsing JSON
    const isValid = signatureVerifier.verify({
      rawBody: command.rawBody,
      signature: command.signature,
      secret: command.webhookSecret,
    })

    if (!isValid) {
      throw new WebhookSignatureInvalidError('Webhook signature verification failed')
    }

    // Step 2: Parse payload
    const payload: WebhookPayload = JSON.parse(command.rawBody)

    // Step 3: Check for duplicate event
    const existing = await paymentWebhookEventRepository.findByProviderEventId(
      'sandbox', // TODO: Make provider configurable
      payload.providerEventId,
    )

    if (existing) {
      // Idempotent: return existing result
      return {
        eventId: existing.id,
        status: 'duplicate',
        paymentIntentId: existing.paymentIntentId,
        orderId: existing.orderId,
      }
    }

    // Step 4: Find payment intent by provider intent ID
    const intents = await paymentIntentRepository.findByOrderId(
      payload.metadata.orderId as Uuidv7,
    )
    const intent = intents.find((i) => i.providerIntentId === payload.providerIntentId)

    if (!intent) {
      // Record unsupported event (intent not found)
      const eventInput: CreatePaymentWebhookEventInput = {
        id: uuidGenerator.next(),
        providerName: 'sandbox',
        providerEventId: payload.providerEventId,
        eventType: payload.eventType,
        amount: payload.amount,
        currency: payload.currency,
        status: 'unsupported',
        rawPayload: command.rawBody,
        processingError: 'Payment intent not found',
      }

      const event = await paymentWebhookEventRepository.create(eventInput)
      return {
        eventId: event.id,
        status: 'unsupported',
        paymentIntentId: null,
        orderId: null,
      }
    }

    // Step 5: Verify amount matches
    if (payload.amount !== intent.amount || payload.currency !== intent.currency) {
      const eventInput: CreatePaymentWebhookEventInput = {
        id: uuidGenerator.next(),
        providerName: 'sandbox',
        providerEventId: payload.providerEventId,
        eventType: payload.eventType,
        paymentIntentId: intent.id,
        orderId: intent.orderId,
        amount: payload.amount,
        currency: payload.currency,
        status: 'amount_mismatch',
        rawPayload: command.rawBody,
        processingError: `Amount mismatch: expected ${intent.amount} ${intent.currency}, got ${payload.amount} ${payload.currency}`,
      }

      await paymentWebhookEventRepository.create(eventInput)

      throw new WebhookAmountMismatchError(
        `Amount mismatch for payment intent ${intent.id}`,
      )
    }

    // Step 6: Process event based on type
    const now = clock.now()
    let processedAt: string | null = null
    let processingError: string | null = null

    try {
      if (payload.eventType === 'payment_intent.succeeded' && payload.status === 'succeeded') {
        // Update payment intent
        await paymentIntentRepository.update(
          {
            ...intent,
            status: 'SUCCEEDED',
            succeededAt: now,
          },
          intent.version,
        )

        // Update order to PAID
        const order = await orderRepository.findById(intent.orderId)
        if (order && order.status === 'AWAITING_PAYMENT') {
          const orderService = createOrderService({
            clock,
            uuidGenerator,
            orderRepository,
            orderItemRepository: null as any, // Not needed for markOrderPaid
            orderStatusEventRepository: null as any,
            proposalRepository: null as any,
            providerProfileRepository: null as any,
            serviceRequestRepository: null as any,
            userRepository: null as any,
          })

          await orderService.markOrderPaid(
            order.buyerUserId,
            order.id,
            order.version,
            payload.providerIntentId,
          )
        }

        processedAt = now
      } else if (payload.eventType === 'payment_intent.payment_failed') {
        // Update payment intent
        await paymentIntentRepository.update(
          {
            ...intent,
            status: 'FAILED',
            failedAt: now,
            failureReason: 'Payment failed',
          },
          intent.version,
        )

        processedAt = now
      } else {
        // Unsupported event type
        processingError = `Unsupported event type: ${payload.eventType}`
      }
    } catch (error) {
      processingError = error instanceof Error ? error.message : String(error)
    }

    // Step 7: Record webhook event
    const eventInput: CreatePaymentWebhookEventInput = {
      id: uuidGenerator.next(),
      providerName: 'sandbox',
      providerEventId: payload.providerEventId,
      eventType: payload.eventType,
      paymentIntentId: intent.id,
      orderId: intent.orderId,
      amount: payload.amount,
      currency: payload.currency,
      status: processedAt ? 'processed' : 'failed',
      rawPayload: command.rawBody,
      processedAt,
      processingError,
    }

    const event = await paymentWebhookEventRepository.create(eventInput)

    return {
      eventId: event.id,
      status: processedAt ? 'processed' : 'unsupported',
      paymentIntentId: intent.id,
      orderId: intent.orderId,
    }
  }

  return Object.freeze({
    processWebhook,
  })
}

export type PaymentWebhookService = ReturnType<typeof createPaymentWebhookService>
