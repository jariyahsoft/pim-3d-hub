import {
  AuthorizationDeniedError as AuthzDenied,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'

export { AuthorizationDeniedError } from './identity.js'

import {
  type CreateRefundInput,
  type MoneyMinor,
  type OrderRepository,
  type PaymentIntentRepository,
  type RefundRecord,
  type RefundRepository,
  type Uuidv7,
} from '@pim/domain'

import type { PaymentPort } from './payment-port.js'

export class RefundExceedsPaymentError extends Error {
  readonly code = 'REFUND_EXCEEDS_PAYMENT'
  readonly status = 409

  constructor(message: string) {
    super(message)
    this.name = 'RefundExceedsPaymentError'
  }
}

export type CreateRefundCommand = Readonly<{
  actorUserId: Uuidv7
  orderId: Uuidv7
  paymentIntentId: Uuidv7
  amount: MoneyMinor
  reason: string
}>

export type RefundServicePorts = Readonly<{
  clock: ClockPort
  uuidGenerator: UuidGeneratorPort
  orderRepository: OrderRepository
  paymentIntentRepository: PaymentIntentRepository
  refundRepository: RefundRepository
  paymentPort: PaymentPort
}>

export function createRefundService(ports: RefundServicePorts) {
  const {
    clock,
    uuidGenerator,
    orderRepository,
    paymentIntentRepository,
    refundRepository,
    paymentPort,
  } = ports

  async function createRefund(command: CreateRefundCommand) {
    // Verify order exists and actor authorization
    const order = await orderRepository.findById(command.orderId)
    if (!order) {
      throw new Error(`Order ${command.orderId} not found`)
    }

    // Only buyer can request refund
    if (order.buyerUserId !== command.actorUserId) {
      throw new AuthzDenied('Only the buyer can request refunds')
    }

    // Verify payment intent
    const intent = await paymentIntentRepository.findById(command.paymentIntentId)
    if (!intent) {
      throw new Error(`Payment intent ${command.paymentIntentId} not found`)
    }

    if (intent.orderId !== command.orderId) {
      throw new Error('Payment intent does not belong to this order')
    }

    if (intent.status !== 'SUCCEEDED') {
      throw new Error('Can only refund succeeded payments')
    }

    // Calculate total refunded amount
    const existingRefunds = await refundRepository.listByPaymentIntentId(
      command.paymentIntentId,
    )
    const totalRefunded = existingRefunds
      .filter((r) => r.status === 'SUCCEEDED' || r.status === 'PROCESSING')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    // Verify refund doesn't exceed payment
    const remainingRefundable = Number(intent.amount) - totalRefunded
    if (Number(command.amount) > remainingRefundable) {
      throw new RefundExceedsPaymentError(
        `Refund amount ${command.amount} exceeds refundable amount ${remainingRefundable}`,
      )
    }

    // Create refund via payment provider
    const providerResponse = await paymentPort.createRefund({
      providerIntentId: intent.providerIntentId!,
      amount: command.amount,
      currency: intent.currency,
      reason: command.reason,
      idempotencyKey: `refund_${command.orderId}_${Date.now()}`,
    })

    // Persist refund record
    const input: CreateRefundInput = {
      id: uuidGenerator.next(),
      paymentIntentId: command.paymentIntentId,
      orderId: command.orderId,
      amount: command.amount,
      currency: intent.currency,
      status: providerResponse.status === 'succeeded' ? 'SUCCEEDED' : 'PROCESSING',
      reason: command.reason,
      requestedByUserId: command.actorUserId,
      providerRefundId: providerResponse.providerRefundId,
      succeededAt:
        providerResponse.status === 'succeeded' ? clock.now() : null,
      createdBy: command.actorUserId,
    }

    return await refundRepository.create(input)
  }

  async function listRefunds(actorUserId: Uuidv7, orderId: Uuidv7) {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // Only buyer can view refunds
    if (order.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only the buyer can view refunds')
    }

    return await refundRepository.listByOrderId(orderId)
  }

  return Object.freeze({
    createRefund,
    listRefunds,
  })
}

export type RefundService = ReturnType<typeof createRefundService>
