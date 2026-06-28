import type {
  PaymentPort,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  CreateRefundRequest,
  RefundResponse,
} from '@pim/application'

export type SandboxPaymentAdapterConfig = Readonly<{
  forceFailure?: boolean
  forceExpiry?: boolean
  delayMs?: number
}>

export function createSandboxPaymentAdapter(
  config: SandboxPaymentAdapterConfig = {},
): PaymentPort {
  const intents = new Map<string, PaymentIntentResponse>()
  const refunds = new Map<string, RefundResponse>()
  let intentCounter = 1
  let refundCounter = 1

  const generateIntentId = () => `sandbox_intent_${String(intentCounter++).padStart(8, '0')}`
  const generateRefundId = () => `sandbox_refund_${String(refundCounter++).padStart(8, '0')}`
  const generateClientSecret = (intentId: string) => `${intentId}_secret_${Math.random().toString(36).slice(2)}`

  async function delay(): Promise<void> {
    if (config.delayMs && config.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delayMs))
    }
  }

  return Object.freeze({
    async createPaymentIntent(
      request: CreatePaymentIntentRequest,
    ): Promise<PaymentIntentResponse> {
      await delay()

      const providerIntentId = generateIntentId()

      // Check for forced failure
      if (config.forceFailure) {
        const response: PaymentIntentResponse = {
          providerIntentId,
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          failureReason: 'Sandbox: forced failure mode enabled',
          metadata: { orderId: request.orderId, idempotencyKey: request.idempotencyKey },
        }
        intents.set(providerIntentId, response)
        return response
      }

      // Check for forced expiry
      if (config.forceExpiry) {
        const response: PaymentIntentResponse = {
          providerIntentId,
          status: 'expired',
          amount: request.amount,
          currency: request.currency,
          expiresAt: request.expiresAt,
          metadata: { orderId: request.orderId, idempotencyKey: request.idempotencyKey },
        }
        intents.set(providerIntentId, response)
        return response
      }

      // Happy path: pending intent
      const response: PaymentIntentResponse = {
        providerIntentId,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        clientSecret: generateClientSecret(providerIntentId),
        expiresAt: request.expiresAt,
        metadata: {
          orderId: request.orderId,
          idempotencyKey: request.idempotencyKey,
          ...request.metadata,
        },
      }
      intents.set(providerIntentId, response)
      return response
    },

    async getPaymentIntent(providerIntentId: string): Promise<PaymentIntentResponse> {
      await delay()

      const intent = intents.get(providerIntentId)
      if (!intent) {
        throw new Error(`Sandbox: Payment intent ${providerIntentId} not found`)
      }
      return intent
    },

    async cancelPaymentIntent(providerIntentId: string): Promise<PaymentIntentResponse> {
      await delay()

      const intent = intents.get(providerIntentId)
      if (!intent) {
        throw new Error(`Sandbox: Payment intent ${providerIntentId} not found`)
      }

      // Cannot cancel if already succeeded
      if (intent.status === 'succeeded') {
        throw new Error('Sandbox: Cannot cancel succeeded payment')
      }

      const cancelled: PaymentIntentResponse = {
        ...intent,
        status: 'cancelled',
      }
      intents.set(providerIntentId, cancelled)
      return cancelled
    },

    async createRefund(request: CreateRefundRequest): Promise<RefundResponse> {
      await delay()

      const intent = intents.get(request.providerIntentId)
      if (!intent) {
        throw new Error(`Sandbox: Payment intent ${request.providerIntentId} not found`)
      }

      if (intent.status !== 'succeeded') {
        const response: RefundResponse = {
          providerRefundId: generateRefundId(),
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          failureReason: 'Sandbox: Can only refund succeeded payments',
        }
        refunds.set(response.providerRefundId, response)
        return response
      }

      // Check amount
      if (request.amount > intent.amount) {
        const response: RefundResponse = {
          providerRefundId: generateRefundId(),
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          failureReason: 'Sandbox: Refund amount exceeds payment amount',
        }
        refunds.set(response.providerRefundId, response)
        return response
      }

      // Happy path
      const response: RefundResponse = {
        providerRefundId: generateRefundId(),
        status: 'succeeded',
        amount: request.amount,
        currency: request.currency,
      }
      refunds.set(response.providerRefundId, response)
      return response
    },
  })
}

// Test helper to simulate payment success
export function simulatePaymentSuccess(
  adapter: PaymentPort,
  providerIntentId: string,
): void {
  // In real implementation, this would be handled by webhook
  // For sandbox, we directly update the intent state
  const adapterInternal = adapter as any
  const intents = adapterInternal.intents
  if (intents) {
    const intent = intents.get(providerIntentId)
    if (intent && intent.status === 'pending') {
      intents.set(providerIntentId, {
        ...intent,
        status: 'succeeded',
        succeededAt: new Date().toISOString(),
      })
    }
  }
}
