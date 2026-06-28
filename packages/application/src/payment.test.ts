import { describe, it, expect, beforeEach } from 'vitest'
import {
  createPaymentService,
  type PaymentServicePorts,
  PaymentIntentNotFoundError,
  PaymentAmountMismatchError,
  AuthorizationDeniedError,
} from './payment.js'
import {
  createInMemoryOrderRepository,
  createInMemoryPaymentIntentRepository,
} from '@pim/testkit'
import { createSandboxPaymentAdapter } from '@pim/infrastructure'
import {
  createMoneyMinor,
  parseUuidv7,
  parseUtcTimestamp,
  type OrderRecord,
} from '@pim/domain'

describe('PaymentService', () => {
  let service: ReturnType<typeof createPaymentService>
  let ports: PaymentServicePorts
  let testOrder: OrderRecord

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T15:00:00.000Z'),
  }

  const uuidGenerator = {
    next: (() => {
      let counter = 1
      return () =>
        parseUuidv7(`01234567-89ab-7000-8000-${String(counter++).padStart(12, '0')}`)
    })(),
  }

  const buyerUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
  const providerUserId = parseUuidv7('01234567-89ab-7000-8000-000000000002')
  const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')

  beforeEach(async () => {
    const orderRepository = createInMemoryOrderRepository(clock, uuidGenerator)
    const paymentIntentRepository = createInMemoryPaymentIntentRepository(
      clock,
      uuidGenerator,
    )
    const paymentPort = createSandboxPaymentAdapter()

    ports = {
      clock,
      uuidGenerator,
      orderRepository,
      paymentIntentRepository,
      paymentPort,
    }

    service = createPaymentService(ports)

    // Create test order in AWAITING_PAYMENT state
    testOrder = await orderRepository.create({
      id: parseUuidv7('01234567-89ab-7000-8000-000000000100'),
      orderNumber: 'ORD-20260628-00001',
      buyerUserId,
      providerProfileId,
      status: 'AWAITING_PAYMENT',
      currency: 'USD',
      subtotal: createMoneyMinor(10000),
      taxAmount: createMoneyMinor(800),
      shippingAmount: createMoneyMinor(500),
      totalAmount: createMoneyMinor(11300),
      buyerSnapshot: {
        userId: buyerUserId,
        displayName: 'Test Buyer',
        email: 'buyer@test.com',
        phone: null,
      },
      providerSnapshot: {
        userId: providerUserId,
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
  })

  describe('createPaymentIntent', () => {
    it('should create payment intent with server-side amount', async () => {
      const result = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-1',
      })

      expect(result.orderId).toBe(testOrder.id)
      expect(result.amount).toEqual(createMoneyMinor(11300)) // Server-calculated
      expect(result.currency).toBe('USD')
      expect(result.status).toBe('PENDING')
      expect(result.providerIntentId).toBeTruthy()
      expect(result.clientSecret).toBeTruthy()
      expect(result.expiresAt).toBeTruthy()
    })

    it('should be idempotent - same key returns same intent', async () => {
      const first = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-2',
      })

      const second = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-2',
      })

      expect(first.id).toBe(second.id)
      expect(first.providerIntentId).toBe(second.providerIntentId)
    })

    it('should reject payment creation by non-buyer', async () => {
      await expect(
        service.createPaymentIntent({
          actorUserId: providerUserId,
          orderId: testOrder.id,
          idempotencyKey: 'test-idempotency-key-3',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject payment for order not in AWAITING_PAYMENT state', async () => {
      const paidOrder = await ports.orderRepository.update(
        { ...testOrder, status: 'PAID' },
        1,
      )

      await expect(
        service.createPaymentIntent({
          actorUserId: buyerUserId,
          orderId: paidOrder.id,
          idempotencyKey: 'test-idempotency-key-4',
        }),
      ).rejects.toThrow('Cannot create payment for order with status PAID')
    })

    it('should set expiry to 24 hours from creation', async () => {
      const result = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-5',
      })

      const expiresAt = new Date(result.expiresAt!)
      const createdAt = new Date('2026-06-28T15:00:00.000Z')
      const diff = expiresAt.getTime() - createdAt.getTime()
      expect(diff).toBe(24 * 60 * 60 * 1000) // 24 hours
    })
  })

  describe('getPaymentIntent', () => {
    it('should allow buyer to view payment intent', async () => {
      const created = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-6',
      })

      const retrieved = await service.getPaymentIntent(buyerUserId, created.id)

      expect(retrieved.id).toBe(created.id)
      expect(retrieved.amount).toEqual(createMoneyMinor(11300))
    })

    it('should reject non-buyer access', async () => {
      const created = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-7',
      })

      await expect(
        service.getPaymentIntent(providerUserId, created.id),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should throw error for non-existent intent', async () => {
      const fakeId = parseUuidv7('01234567-89ab-7000-8000-999999999999')

      await expect(service.getPaymentIntent(buyerUserId, fakeId)).rejects.toThrow(
        PaymentIntentNotFoundError,
      )
    })
  })

  describe('listPaymentIntents', () => {
    it('should list all intents for order', async () => {
      await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-8',
      })

      await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-9',
      })

      const result = await service.listPaymentIntents(buyerUserId, testOrder.id)

      expect(result).toHaveLength(2)
    })

    it('should reject non-buyer access', async () => {
      await expect(
        service.listPaymentIntents(providerUserId, testOrder.id),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })

  describe('cancelPaymentIntent', () => {
    it('should allow buyer to cancel pending payment', async () => {
      const created = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-10',
      })

      const result = await service.cancelPaymentIntent(
        buyerUserId,
        created.id,
        1,
      )

      expect(result.status).toBe('CANCELLED')
      expect(result.cancelledAt).toBeTruthy()
    })

    it('should reject cancel by non-buyer', async () => {
      const created = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-11',
      })

      await expect(
        service.cancelPaymentIntent(providerUserId, created.id, 1),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject cancel of succeeded payment', async () => {
      const created = await service.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-12',
      })

      // Simulate payment success
      const intent = await ports.paymentIntentRepository.findById(created.id)
      await ports.paymentIntentRepository.update(
        { ...intent!, status: 'SUCCEEDED', succeededAt: clock.now() },
        1,
      )

      await expect(
        service.cancelPaymentIntent(buyerUserId, created.id, 2),
      ).rejects.toThrow('Cannot cancel succeeded payment')
    })
  })

  describe('sandbox adapter behavior', () => {
    it('should handle forced failure mode', async () => {
      const failPort = createSandboxPaymentAdapter({ forceFailure: true })
      const failService = createPaymentService({ ...ports, paymentPort: failPort })

      const result = await failService.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-13',
      })

      expect(result.status).toBe('FAILED')
      expect(result.failureReason).toContain('forced failure')
    })

    it('should handle forced expiry mode', async () => {
      const expiryPort = createSandboxPaymentAdapter({ forceExpiry: true })
      const expiryService = createPaymentService({
        ...ports,
        paymentPort: expiryPort,
      })

      const result = await expiryService.createPaymentIntent({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        idempotencyKey: 'test-idempotency-key-14',
      })

      expect(result.status).not.toBe('PENDING')
    })
  })
})
