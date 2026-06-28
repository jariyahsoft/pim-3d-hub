import { describe, it, expect, beforeEach } from 'vitest'
import {
  createPaymentWebhookService,
  type PaymentWebhookServicePorts,
  WebhookSignatureInvalidError,
  WebhookAmountMismatchError,
} from './payment-webhook.js'
import {
  createInMemoryOrderRepository,
  createInMemoryPaymentIntentRepository,
  createInMemoryPaymentWebhookEventRepository,
  createInMemoryOrderStatusEventRepository,
} from '@pim/testkit'
import {
  createSandboxWebhookSignatureVerifier,
  generateSandboxWebhookSignature,
} from '@pim/infrastructure'
import {
  createMoneyMinor,
  parseUuidv7,
  parseUtcTimestamp,
  type OrderRecord,
  type PaymentIntentRecord,
} from '@pim/domain'

describe('PaymentWebhookService', () => {
  let service: ReturnType<typeof createPaymentWebhookService>
  let ports: PaymentWebhookServicePorts
  let testOrder: OrderRecord
  let testIntent: PaymentIntentRecord
  const webhookSecret = 'test-webhook-secret-key'

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T15:05:00.000Z'),
  }

  const uuidGenerator = {
    next: (() => {
      let counter = 1
      return () =>
        parseUuidv7(`01234567-89ab-7000-8000-${String(counter++).padStart(12, '0')}`)
    })(),
  }

  const buyerUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
  const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')

  beforeEach(async () => {
    const orderRepository = createInMemoryOrderRepository(clock, uuidGenerator)
    const paymentIntentRepository = createInMemoryPaymentIntentRepository(
      clock,
      uuidGenerator,
    )
    const paymentWebhookEventRepository =
      createInMemoryPaymentWebhookEventRepository(clock, uuidGenerator)
    const signatureVerifier = createSandboxWebhookSignatureVerifier()

    ports = {
      clock,
      uuidGenerator,
      paymentIntentRepository,
      paymentWebhookEventRepository,
      orderRepository,
      signatureVerifier,
    }

    service = createPaymentWebhookService(ports)

    // Create test order
    testOrder = await orderRepository.create({
      id: parseUuidv7('01234567-89ab-7000-8000-000000000100'),
      orderNumber: 'ORD-20260628-00001',
      buyerUserId,
      providerProfileId,
      status: 'AWAITING_PAYMENT',
      currency: 'USD',
      subtotal: createMoneyMinor(10000),
      totalAmount: createMoneyMinor(10000),
      buyerSnapshot: {
        userId: buyerUserId,
        displayName: 'Test Buyer',
        email: 'buyer@test.com',
        phone: null,
      },
      providerSnapshot: {
        userId: parseUuidv7('01234567-89ab-7000-8000-000000000002'),
        displayName: 'Test Provider',
        email: 'provider@test.com',
        phone: null,
      },
      sourceSnapshot: {
        sourceType: 'PROPOSAL',
        sourceId: parseUuidv7('01234567-89ab-7000-8000-000000000200'),
        sourceRevisionNumber: 1,
        snapshotData: '{}',
      },
      createdBy: buyerUserId,
    })

    // Create test payment intent
    testIntent = await paymentIntentRepository.create({
      id: parseUuidv7('01234567-89ab-7000-8000-000000000300'),
      orderId: testOrder.id,
      amount: createMoneyMinor(10000),
      currency: 'USD',
      status: 'PENDING',
      providerName: 'sandbox',
      providerIntentId: 'sandbox_intent_12345678',
      idempotencyKey: 'test-idem-key-1',
      createdBy: buyerUserId,
    })
  })

  function createWebhookPayload(overrides?: Partial<any>) {
    const payload = {
      providerEventId: `evt_${Math.random().toString(36).slice(2)}`,
      eventType: 'payment_intent.succeeded',
      providerIntentId: testIntent.providerIntentId,
      status: 'succeeded',
      amount: testIntent.amount,
      currency: testIntent.currency,
      metadata: {
        orderId: testOrder.id,
      },
      ...overrides,
    }
    return JSON.stringify(payload)
  }

  describe('processWebhook', () => {
    it('should process valid payment success webhook', async () => {
      const rawBody = createWebhookPayload()
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const result = await service.processWebhook({
        rawBody,
        signature,
        webhookSecret,
      })

      expect(result.status).toBe('processed')
      expect(result.paymentIntentId).toBe(testIntent.id)
      expect(result.orderId).toBe(testOrder.id)

      // Verify payment intent was updated
      const updated = await ports.paymentIntentRepository.findById(testIntent.id)
      expect(updated?.status).toBe('SUCCEEDED')
      expect(updated?.succeededAt).toBeTruthy()
    })

    it('should reject webhook with invalid signature', async () => {
      const rawBody = createWebhookPayload()
      const invalidSignature = 'invalid-signature-value'

      await expect(
        service.processWebhook({
          rawBody,
          signature: invalidSignature,
          webhookSecret,
        }),
      ).rejects.toThrow(WebhookSignatureInvalidError)
    })

    it('should be idempotent - duplicate event returns same result', async () => {
      const rawBody = createWebhookPayload()
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const first = await service.processWebhook({
        rawBody,
        signature,
        webhookSecret,
      })

      const second = await service.processWebhook({
        rawBody,
        signature,
        webhookSecret,
      })

      expect(second.status).toBe('duplicate')
      expect(second.eventId).toBe(first.eventId)
    })

    it('should detect amount mismatch', async () => {
      const rawBody = createWebhookPayload({
        amount: createMoneyMinor(99999), // Different amount
      })
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      await expect(
        service.processWebhook({
          rawBody,
          signature,
          webhookSecret,
        }),
      ).rejects.toThrow(WebhookAmountMismatchError)

      // Verify event was recorded with error
      const events = await ports.paymentWebhookEventRepository.listByPaymentIntentId(
        testIntent.id,
      )
      expect(events).toHaveLength(1)
      expect(events[0].status).toBe('amount_mismatch')
      expect(events[0].processingError).toContain('Amount mismatch')
    })

    it('should detect currency mismatch', async () => {
      const rawBody = createWebhookPayload({
        currency: 'EUR', // Different currency
      })
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      await expect(
        service.processWebhook({
          rawBody,
          signature,
          webhookSecret,
        }),
      ).rejects.toThrow(WebhookAmountMismatchError)
    })

    it('should handle payment failure event', async () => {
      const rawBody = createWebhookPayload({
        eventType: 'payment_intent.payment_failed',
        status: 'failed',
      })
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const result = await service.processWebhook({
        rawBody,
        signature,
        webhookSecret,
      })

      expect(result.status).toBe('processed')

      // Verify payment intent was marked as failed
      const updated = await ports.paymentIntentRepository.findById(testIntent.id)
      expect(updated?.status).toBe('FAILED')
      expect(updated?.failedAt).toBeTruthy()
      expect(updated?.failureReason).toBe('Payment failed')
    })

    it('should handle unsupported event type', async () => {
      const rawBody = createWebhookPayload({
        eventType: 'payment_intent.unknown_event',
      })
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const result = await service.processWebhook({
        rawBody,
        signature,
        webhookSecret,
      })

      expect(result.status).toBe('unsupported')

      // Verify event was recorded
      const events = await ports.paymentWebhookEventRepository.listByPaymentIntentId(
        testIntent.id,
      )
      expect(events).toHaveLength(1)
      expect(events[0].processingError).toContain('Unsupported event type')
    })

    it('should handle webhook for non-existent payment intent', async () => {
      const rawBody = createWebhookPayload({
        providerIntentId: 'non_existent_intent_id',
      })
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const result = await service.processWebhook({
        rawBody,
        signature,
        webhookSecret,
      })

      expect(result.status).toBe('unsupported')
      expect(result.paymentIntentId).toBeNull()
    })

    it('should record all webhook events for reconciliation', async () => {
      // Process first event
      const rawBody1 = createWebhookPayload()
      const signature1 = generateSandboxWebhookSignature(rawBody1, webhookSecret)
      await service.processWebhook({
        rawBody: rawBody1,
        signature: signature1,
        webhookSecret,
      })

      // Process second event (different event ID)
      const rawBody2 = createWebhookPayload({
        providerEventId: 'evt_second_event',
        eventType: 'payment_intent.payment_failed',
        status: 'failed',
      })
      const signature2 = generateSandboxWebhookSignature(rawBody2, webhookSecret)
      await service.processWebhook({
        rawBody: rawBody2,
        signature: signature2,
        webhookSecret,
      })

      // Verify both events are recorded
      const events = await ports.paymentWebhookEventRepository.listByPaymentIntentId(
        testIntent.id,
      )
      expect(events).toHaveLength(2)
    })

    it('should not process webhook if signature verification fails', async () => {
      const rawBody = createWebhookPayload()
      const wrongSecret = 'wrong-secret'
      const signature = generateSandboxWebhookSignature(rawBody, wrongSecret)

      await expect(
        service.processWebhook({
          rawBody,
          signature,
          webhookSecret, // Using correct secret for verification
        }),
      ).rejects.toThrow(WebhookSignatureInvalidError)

      // Verify no events were recorded
      const events = await ports.paymentWebhookEventRepository.listByPaymentIntentId(
        testIntent.id,
      )
      expect(events).toHaveLength(0)
    })
  })

  describe('webhook signature verification', () => {
    it('should verify correct signature', () => {
      const rawBody = '{"test":"data"}'
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const isValid = ports.signatureVerifier.verify({
        rawBody,
        signature,
        secret: webhookSecret,
      })

      expect(isValid).toBe(true)
    })

    it('should reject tampered body', () => {
      const rawBody = '{"test":"data"}'
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const tamperedBody = '{"test":"modified"}'
      const isValid = ports.signatureVerifier.verify({
        rawBody: tamperedBody,
        signature,
        secret: webhookSecret,
      })

      expect(isValid).toBe(false)
    })

    it('should reject wrong secret', () => {
      const rawBody = '{"test":"data"}'
      const signature = generateSandboxWebhookSignature(rawBody, webhookSecret)

      const isValid = ports.signatureVerifier.verify({
        rawBody,
        signature,
        secret: 'wrong-secret',
      })

      expect(isValid).toBe(false)
    })
  })
})
