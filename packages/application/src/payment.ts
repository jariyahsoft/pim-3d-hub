import {
  AuthorizationDeniedError as AuthzDenied,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'

// Re-export for use in tests and API
export { AuthorizationDeniedError } from './identity.js'

import {
  type CreatePaymentIntentInput,
  type MoneyMinor,
  type OrderRecord,
  type OrderRepository,
  type PaymentIntentRecord,
  type PaymentIntentRepository,
  type Uuidv7,
} from '@pim/domain'

import type {
  PaymentPort,
  PaymentIntentResponse,
} from './payment-port.js'

export type PaymentIntentDto = Readonly<{
  id: Uuidv7
  orderId: Uuidv7
  amount: MoneyMinor
  currency: string
  status: string
  paymentMethod: string | null
  providerIntentId: string | null
  clientSecret: string | null
  expiresAt: string | null
  succeededAt: string | null
  failedAt: string | null
  cancelledAt: string | null
  failureReason: string | null
  version: number
}>

export class PaymentIntentNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'PaymentIntentNotFoundError'
  }
}

export class PaymentAmountMismatchError extends Error {
  readonly code = 'PAYMENT_AMOUNT_MISMATCH'
  readonly fields = ['amount']
  readonly status = 409

  constructor(message: string) {
    super(message)
    this.name = 'PaymentAmountMismatchError'
  }
}

export type CreatePaymentIntentCommand = Readonly<{
  actorUserId: Uuidv7
  orderId: Uuidv7
  idempotencyKey: string
  returnUrl?: string
}>

export type PaymentServicePorts = Readonly<{
  clock: ClockPort
  uuidGenerator: UuidGeneratorPort
  orderRepository: OrderRepository
  paymentIntentRepository: PaymentIntentRepository
  paymentPort: PaymentPort
}>

export function createPaymentService(ports: PaymentServicePorts) {
  const {
    clock,
    uuidGenerator,
    orderRepository,
    paymentIntentRepository,
    paymentPort,
  } = ports

  function toDto(
    intent: PaymentIntentRecord,
    clientSecret: string | null = null,
  ): PaymentIntentDto {
    return {
      id: intent.id,
      orderId: intent.orderId,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      paymentMethod: intent.paymentMethod,
      providerIntentId: intent.providerIntentId,
      clientSecret,
      expiresAt: intent.expiresAt,
      succeededAt: intent.succeededAt,
      failedAt: intent.failedAt,
      cancelledAt: intent.cancelledAt,
      failureReason: intent.failureReason,
      version: intent.version,
    }
  }

  async function createPaymentIntent(
    command: CreatePaymentIntentCommand,
  ): Promise<PaymentIntentDto> {
    // Check for existing intent with same idempotency key
    const existing = await paymentIntentRepository.findByIdempotencyKey(
      command.idempotencyKey,
    )
    if (existing) {
      // Return existing intent (idempotent)
      const clientSecret = existing.providerMetadata.clientSecret as string | null
      return toDto(existing, clientSecret ?? null)
    }

    // Load order
    const order = await orderRepository.findById(command.orderId)
    if (!order) {
      throw new Error(`Order ${command.orderId} not found`)
    }

    // Verify actor is buyer
    if (order.buyerUserId !== command.actorUserId) {
      throw new AuthzDenied('Only the buyer can create payment intents')
    }

    // Verify order is in AWAITING_PAYMENT state
    if (order.status !== 'AWAITING_PAYMENT') {
      throw new Error(`Cannot create payment for order with status ${order.status}`)
    }

    // Server-side amount calculation from order (prevent client manipulation)
    const serverAmount = order.totalAmount
    const serverCurrency = order.currency

    // Calculate expiry (24 hours from now)
    const now = clock.now()
    const expiresAt = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString()

    // Create payment intent via provider
    const providerResponse: PaymentIntentResponse = await paymentPort.createPaymentIntent({
      amount: serverAmount,
      currency: serverCurrency,
      orderId: order.id,
      idempotencyKey: command.idempotencyKey,
      expiresAt,
      metadata: {
        orderNumber: order.orderNumber,
        buyerUserId: order.buyerUserId,
      },
    })

    // Persist payment intent
    const input: CreatePaymentIntentInput = {
      id: uuidGenerator.next(),
      orderId: order.id,
      amount: serverAmount,
      currency: serverCurrency,
      status: providerResponse.status === 'pending' ? 'PENDING' : 'FAILED',
      providerName: 'sandbox', // TODO: Make configurable
      providerIntentId: providerResponse.providerIntentId,
      providerMetadata: {
        ...providerResponse.metadata,
        clientSecret: providerResponse.clientSecret,
      },
      idempotencyKey: command.idempotencyKey,
      expiresAt,
      createdBy: command.actorUserId,
    }

    const intent = await paymentIntentRepository.create(input)
    return toDto(intent, providerResponse.clientSecret ?? null)
  }

  async function getPaymentIntent(
    actorUserId: Uuidv7,
    intentId: Uuidv7,
  ): Promise<PaymentIntentDto> {
    const intent = await paymentIntentRepository.findById(intentId)
    if (!intent) {
      throw new PaymentIntentNotFoundError(`Payment intent ${intentId} not found`)
    }

    // Verify order access
    const order = await orderRepository.findById(intent.orderId)
    if (!order) {
      throw new Error(`Order ${intent.orderId} not found`)
    }

    // Only buyer can view payment intent
    if (order.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only the buyer can view payment intents')
    }

    const clientSecret = intent.providerMetadata.clientSecret as string | null
    return toDto(intent, clientSecret ?? null)
  }

  async function listPaymentIntents(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
  ): Promise<readonly PaymentIntentDto[]> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // Only buyer can view payment intents
    if (order.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only the buyer can view payment intents')
    }

    const intents = await paymentIntentRepository.findByOrderId(orderId)
    return intents.map((intent) => toDto(intent))
  }

  async function cancelPaymentIntent(
    actorUserId: Uuidv7,
    intentId: Uuidv7,
    expectedVersion: number,
  ): Promise<PaymentIntentDto> {
    const intent = await paymentIntentRepository.findById(intentId)
    if (!intent) {
      throw new PaymentIntentNotFoundError(`Payment intent ${intentId} not found`)
    }

    // Verify order access
    const order = await orderRepository.findById(intent.orderId)
    if (!order) {
      throw new Error(`Order ${intent.orderId} not found`)
    }

    // Only buyer can cancel
    if (order.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only the buyer can cancel payment intents')
    }

    // Cannot cancel if already succeeded
    if (intent.status === 'SUCCEEDED') {
      throw new Error('Cannot cancel succeeded payment')
    }

    // Cancel via provider if providerIntentId exists
    if (intent.providerIntentId) {
      await paymentPort.cancelPaymentIntent(intent.providerIntentId)
    }

    // Update local state
    const now = clock.now()
    const updated = await paymentIntentRepository.update(
      {
        ...intent,
        status: 'CANCELLED',
        cancelledAt: now,
      },
      expectedVersion,
    )

    return toDto(updated)
  }

  return Object.freeze({
    createPaymentIntent,
    getPaymentIntent,
    listPaymentIntents,
    cancelPaymentIntent,
  })
}

export type PaymentService = ReturnType<typeof createPaymentService>
