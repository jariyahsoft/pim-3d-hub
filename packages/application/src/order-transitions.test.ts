import { describe, it, expect, beforeEach } from 'vitest'
import {
  createOrderService,
  type OrderServicePorts,
  OrderNotFoundError,
  InvalidOrderStateError,
  AuthorizationDeniedError,
} from './order.js'
import {
  createInMemoryOrderRepository,
  createInMemoryOrderItemRepository,
  createInMemoryOrderStatusEventRepository,
  createInMemoryProposalRepository,
  createInMemoryProposalMilestoneRepository,
} from '@pim/testkit'
import {
  createMoneyMinor,
  parseUuidv7,
  parseUtcTimestamp,
  type OrderRecord,
  type ProviderProfileRepository,
  type ServiceRequestRepository,
  type UserRepository,
} from '@pim/domain'

describe('OrderService - State Transitions', () => {
  let service: ReturnType<typeof createOrderService>
  let ports: OrderServicePorts
  let testOrder: OrderRecord

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T14:30:00.000Z'),
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
  const serviceRequestId = parseUuidv7('01234567-89ab-7000-8000-000000000020')

  const mockProviderProfileRepository: ProviderProfileRepository = {
    findById: async (id: any) => ({
      id,
      ownerUserId: providerUserId,
      status: 'ACTIVE',
      businessName: 'Test Provider',
      createdAt: clock.now(),
      createdBy: null,
      deletedAt: null,
      updatedAt: clock.now(),
      updatedBy: null,
      version: 1,
      schemaVersion: 1,
    } as any),
  } as any

  const mockServiceRequestRepository: ServiceRequestRepository = {
    findById: async (id: any) => ({
      id,
      buyerUserId,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      createdAt: clock.now(),
      createdBy: null,
      deletedAt: null,
      updatedAt: clock.now(),
      updatedBy: null,
      version: 1,
      schemaVersion: 1,
    } as any),
  } as any

  const mockUserRepository: UserRepository = {
    findById: async (id: any) => ({
      id,
      displayName: id === buyerUserId ? 'Test Buyer' : 'Test Provider',
      email: id === buyerUserId ? 'buyer@test.com' : 'provider@test.com',
      phone: '+66812345678',
      createdAt: clock.now(),
      createdBy: null,
      deletedAt: null,
      updatedAt: clock.now(),
      updatedBy: null,
      version: 1,
      schemaVersion: 1,
    } as any),
  } as any

  beforeEach(async () => {
    const proposalRepository = createInMemoryProposalRepository(clock, uuidGenerator)

    ports = {
      clock,
      uuidGenerator,
      orderRepository: createInMemoryOrderRepository(clock, uuidGenerator),
      orderItemRepository: createInMemoryOrderItemRepository(clock, uuidGenerator),
      orderStatusEventRepository: createInMemoryOrderStatusEventRepository(
        clock,
        uuidGenerator,
      ),
      proposalRepository,
      providerProfileRepository: mockProviderProfileRepository,
      serviceRequestRepository: mockServiceRequestRepository,
      userRepository: mockUserRepository,
    }
    service = createOrderService(ports)

    // Create an accepted proposal
    const proposal = await proposalRepository.create({
      serviceRequestId,
      providerProfileId,
      status: 'ACCEPTED',
      revisionNumber: 1,
      currency: 'THB',
      totalAmount: createMoneyMinor(100000, 'THB'),
      lineItems: [
        {
          amount: createMoneyMinor(100000, 'THB'),
          description: '3D printing service',
          itemType: 'SERVICE',
          quantity: 1,
        },
      ],
      createdBy: providerUserId,
    })

    // Create order for testing
    const order = await service.createOrderFromProposal({
      actorUserId: buyerUserId,
      proposalId: proposal.id,
      idempotencyKey: 'test-order-001',
      expectedProposalVersion: proposal.version,
    })

    testOrder = await ports.orderRepository.findById(order.id) as OrderRecord
  })

  describe('confirmOrder', () => {
    it('should allow provider to confirm order', async () => {
      const result = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
        'Provider accepts order',
      )

      expect(result.status).toBe('AWAITING_PAYMENT')
      expect(result.version).toBe(testOrder.version + 1)
      expect(result.confirmedAt).toBeDefined()
    })

    it('should reject confirmation from non-provider', async () => {
      await expect(
        service.confirmOrder(buyerUserId, testOrder.id, testOrder.version),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject confirmation from wrong state', async () => {
      // Confirm once
      await service.confirmOrder(providerUserId, testOrder.id, testOrder.version)

      // Try to confirm again
      await expect(
        service.confirmOrder(providerUserId, testOrder.id, testOrder.version + 1),
      ).rejects.toThrow(InvalidOrderStateError)
    })

    it('should reject with stale version', async () => {
      await expect(
        service.confirmOrder(providerUserId, testOrder.id, 999),
      ).rejects.toThrow()
    })
  })

  describe('markOrderPaid', () => {
    beforeEach(async () => {
      // Move to AWAITING_PAYMENT
      const confirmed = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )
      testOrder = await ports.orderRepository.findById(confirmed.id) as OrderRecord
    })

    it('should mark order as paid', async () => {
      const result = await service.markOrderPaid(
        buyerUserId,
        testOrder.id,
        testOrder.version,
        'pi_123456',
        'Payment captured',
      )

      expect(result.status).toBe('PAID')
      expect(result.version).toBe(testOrder.version + 1)
    })

    it('should reject payment from wrong state', async () => {
      // Move to PAID first
      await service.markOrderPaid(buyerUserId, testOrder.id, testOrder.version, 'pi_123')

      // Try to mark paid again
      await expect(
        service.markOrderPaid(buyerUserId, testOrder.id, testOrder.version + 1, 'pi_456'),
      ).rejects.toThrow(InvalidOrderStateError)
    })
  })

  describe('production workflow', () => {
    beforeEach(async () => {
      // Move to PAID
      const confirmed = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )
      const paid = await service.markOrderPaid(
        buyerUserId,
        confirmed.id,
        confirmed.version,
        'pi_123',
      )
      testOrder = await ports.orderRepository.findById(paid.id) as OrderRecord
    })

    it('should complete full production workflow', async () => {
      // Start preparation
      let result = await service.startPreparation(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )
      expect(result.status).toBe('PREPARING')

      // Start production
      result = await service.startProduction(providerUserId, result.id, result.version)
      expect(result.status).toBe('IN_PRODUCTION')

      // Post-processing
      result = await service.startPostProcessing(providerUserId, result.id, result.version)
      expect(result.status).toBe('POST_PROCESSING')

      // Quality check
      result = await service.startQualityCheck(providerUserId, result.id, result.version)
      expect(result.status).toBe('QUALITY_CHECK')

      // Ready to ship
      result = await service.markReadyToShip(providerUserId, result.id, result.version)
      expect(result.status).toBe('READY_TO_SHIP')

      // Ship
      result = await service.shipOrder(
        providerUserId,
        result.id,
        result.version,
        'TRACK123',
        'ThaiPost',
      )
      expect(result.status).toBe('SHIPPED')

      // Deliver
      result = await service.markDelivered(buyerUserId, result.id, result.version)
      expect(result.status).toBe('DELIVERED')

      // Complete
      result = await service.completeOrder(buyerUserId, result.id, result.version)
      expect(result.status).toBe('COMPLETED')
      expect(result.completedAt).toBeDefined()
    })

    it('should reject production steps from non-provider', async () => {
      await expect(
        service.startPreparation(buyerUserId, testOrder.id, testOrder.version),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject out-of-order transitions', async () => {
      // Try to skip preparation
      await expect(
        service.startProduction(providerUserId, testOrder.id, testOrder.version),
      ).rejects.toThrow(InvalidOrderStateError)
    })
  })

  describe('cancelOrder', () => {
    it('should allow provider to cancel during confirmation', async () => {
      const result = await service.cancelOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
        'Provider unavailable',
      )

      expect(result.status).toBe('CANCELLED')
      expect(result.cancelledAt).toBeDefined()
    })

    it('should allow buyer to cancel during payment', async () => {
      const confirmed = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )

      const result = await service.cancelOrder(
        buyerUserId,
        confirmed.id,
        confirmed.version,
        'Changed mind',
      )

      expect(result.status).toBe('CANCELLED')
    })

    it('should reject cancellation from wrong actor during confirmation', async () => {
      await expect(
        service.cancelOrder(buyerUserId, testOrder.id, testOrder.version, 'Cancel'),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject cancellation from non-cancellable state', async () => {
      // Move to SHIPPED
      const confirmed = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )
      const paid = await service.markOrderPaid(
        buyerUserId,
        confirmed.id,
        confirmed.version,
        'pi_123',
      )
      let current = await service.startPreparation(
        providerUserId,
        paid.id,
        paid.version,
      )
      current = await service.startProduction(providerUserId, current.id, current.version)
      current = await service.startPostProcessing(
        providerUserId,
        current.id,
        current.version,
      )
      current = await service.startQualityCheck(
        providerUserId,
        current.id,
        current.version,
      )
      current = await service.markReadyToShip(providerUserId, current.id, current.version)
      current = await service.shipOrder(
        providerUserId,
        current.id,
        current.version,
        'TRACK123',
      )

      // Try to cancel from SHIPPED
      await expect(
        service.cancelOrder(buyerUserId, current.id, current.version, 'Cancel'),
      ).rejects.toThrow(InvalidOrderStateError)
    })
  })

  describe('disputeOrder', () => {
    beforeEach(async () => {
      // Move to IN_PRODUCTION
      const confirmed = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )
      const paid = await service.markOrderPaid(
        buyerUserId,
        confirmed.id,
        confirmed.version,
        'pi_123',
      )
      const preparing = await service.startPreparation(
        providerUserId,
        paid.id,
        paid.version,
      )
      const inProduction = await service.startProduction(
        providerUserId,
        preparing.id,
        preparing.version,
      )
      testOrder = await ports.orderRepository.findById(inProduction.id) as OrderRecord
    })

    it('should allow buyer to dispute during production', async () => {
      const result = await service.disputeOrder(
        buyerUserId,
        testOrder.id,
        testOrder.version,
        'Quality concerns',
        { photos: ['photo1.jpg'] },
      )

      expect(result.status).toBe('DISPUTED')
    })

    it('should allow provider to dispute during production', async () => {
      const result = await service.disputeOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
        'Material issues',
      )

      expect(result.status).toBe('DISPUTED')
    })

    it('should reject dispute from unauthorized actor', async () => {
      const randomUser = parseUuidv7('01234567-89ab-7000-8000-999999999999')

      await expect(
        service.disputeOrder(randomUser, testOrder.id, testOrder.version, 'Issue'),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject dispute from non-disputable state', async () => {
      // Move back to AWAITING_PAYMENT
      const newProposal = await ports.proposalRepository.create({
        serviceRequestId,
        providerProfileId,
        status: 'ACCEPTED',
        revisionNumber: 1,
        currency: 'THB',
        totalAmount: createMoneyMinor(100000, 'THB'),
        lineItems: [
          {
            amount: createMoneyMinor(100000, 'THB'),
            description: 'Service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
        createdBy: providerUserId,
      })

      const newOrder = await service.createOrderFromProposal({
        actorUserId: buyerUserId,
        proposalId: newProposal.id,
        idempotencyKey: 'test-order-002',
        expectedProposalVersion: newProposal.version,
      })

      const confirmed = await service.confirmOrder(
        providerUserId,
        newOrder.id,
        newOrder.version,
      )

      // Try to dispute from AWAITING_PAYMENT
      await expect(
        service.disputeOrder(buyerUserId, confirmed.id, confirmed.version, 'Issue'),
      ).rejects.toThrow(InvalidOrderStateError)
    })
  })

  describe('completeOrder', () => {
    beforeEach(async () => {
      // Move to DELIVERED
      const confirmed = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )
      const paid = await service.markOrderPaid(
        buyerUserId,
        confirmed.id,
        confirmed.version,
        'pi_123',
      )
      let current = await service.startPreparation(
        providerUserId,
        paid.id,
        paid.version,
      )
      current = await service.startProduction(providerUserId, current.id, current.version)
      current = await service.startPostProcessing(
        providerUserId,
        current.id,
        current.version,
      )
      current = await service.startQualityCheck(
        providerUserId,
        current.id,
        current.version,
      )
      current = await service.markReadyToShip(providerUserId, current.id, current.version)
      current = await service.shipOrder(
        providerUserId,
        current.id,
        current.version,
        'TRACK123',
      )
      const delivered = await service.markDelivered(
        buyerUserId,
        current.id,
        current.version,
      )
      testOrder = await ports.orderRepository.findById(delivered.id) as OrderRecord
    })

    it('should allow buyer to complete order', async () => {
      const result = await service.completeOrder(
        buyerUserId,
        testOrder.id,
        testOrder.version,
      )

      expect(result.status).toBe('COMPLETED')
      expect(result.completedAt).toBeDefined()
    })

    it('should reject completion from non-buyer', async () => {
      await expect(
        service.completeOrder(providerUserId, testOrder.id, testOrder.version),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject completion from wrong state', async () => {
      // Complete once
      await service.completeOrder(buyerUserId, testOrder.id, testOrder.version)

      // Try to complete again
      await expect(
        service.completeOrder(buyerUserId, testOrder.id, testOrder.version + 1),
      ).rejects.toThrow(InvalidOrderStateError)
    })
  })

  describe('status event tracking', () => {
    it('should create status event for each transition', async () => {
      const confirmed = await service.confirmOrder(
        providerUserId,
        testOrder.id,
        testOrder.version,
      )

      const events = await ports.orderStatusEventRepository.listByOrderId(testOrder.id)

      // Should have 2 events: creation (AWAITING_PROVIDER_CONFIRMATION) + confirmation
      expect(events.length).toBeGreaterThanOrEqual(2)

      const confirmEvent = events.find((e) => e.toStatus === 'AWAITING_PAYMENT')
      expect(confirmEvent).toBeDefined()
      expect(confirmEvent?.fromStatus).toBe('AWAITING_PROVIDER_CONFIRMATION')
      expect(confirmEvent?.actorUserId).toBe(providerUserId)
    })
  })
})
