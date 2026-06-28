import { describe, it, expect, beforeEach } from 'vitest'
import {
  createOrderChangeRequestService,
  type OrderChangeRequestServicePorts,
  OrderChangeRequestNotFoundError,
  InvalidChangeRequestStateError,
  AuthorizationDeniedError,
} from './order-change-request.js'
import {
  createInMemoryOrderRepository,
  createInMemoryOrderChangeRequestRepository,
} from '@pim/testkit'
import {
  createMoneyMinor,
  parseUuidv7,
  parseUtcTimestamp,
  type OrderRecord,
  type ProviderProfileRepository,
} from '@pim/domain'

describe('OrderChangeRequestService', () => {
  let service: ReturnType<typeof createOrderChangeRequestService>
  let ports: OrderChangeRequestServicePorts
  let testOrder: OrderRecord

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T14:46:00.000Z'),
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

  const mockProviderProfileRepository: ProviderProfileRepository = {
    findById: async (id: any) => ({
      id,
      ownerUserId: providerUserId,
      businessName: 'Test Provider',
      slug: 'test-provider',
      bio: null,
      logoAssetId: null,
      region: 'US',
      city: null,
      timezone: 'America/New_York',
      primaryLanguage: 'en',
      website: null,
      instantOrderEnabled: false,
      serviceTypes: [],
      leadTimeDays: 5,
      status: 'ACTIVE',
      version: 1,
      createdAt: parseUtcTimestamp('2026-01-01T00:00:00.000Z'),
      updatedAt: parseUtcTimestamp('2026-01-01T00:00:00.000Z'),
      createdBy: providerUserId,
      updatedBy: providerUserId,
      deletedAt: null,
      deletedBy: null,
    }),
  } as any

  beforeEach(async () => {
    const orderRepository = createInMemoryOrderRepository(clock, uuidGenerator)
    const orderChangeRequestRepository = createInMemoryOrderChangeRequestRepository(
      clock,
      uuidGenerator,
    )

    ports = {
      clock,
      uuidGenerator,
      orderRepository,
      orderChangeRequestRepository,
      providerProfileRepository: mockProviderProfileRepository,
    }

    service = createOrderChangeRequestService(ports)

    // Create test order
    testOrder = await orderRepository.create({
      id: parseUuidv7('01234567-89ab-7000-8000-000000000100'),
      orderNumber: 'ORD-20260628-00001',
      buyerUserId,
      providerProfileId,
      status: 'IN_PRODUCTION',
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

  describe('createChangeRequest', () => {
    it('should allow buyer to create change request', async () => {
      const result = await service.createChangeRequest({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        requestType: 'SCOPE',
        title: 'Add extra feature',
        description: 'Please add additional customization',
        scopeDetails: 'Custom engraving on the back',
      })

      expect(result.status).toBe('PENDING')
      expect(result.requestType).toBe('SCOPE')
      expect(result.requestedByUserId).toBe(buyerUserId)
    })

    it('should allow provider to create change request', async () => {
      const result = await service.createChangeRequest({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        requestType: 'PRICE',
        title: 'Material cost increase',
        description: 'Need to adjust price due to material cost increase',
        priceAdjustment: createMoneyMinor(2000),
      })

      expect(result.status).toBe('PENDING')
      expect(result.requestType).toBe('PRICE')
      expect(result.priceAdjustment).toEqual(createMoneyMinor(2000))
    })

    it('should reject change request for terminal state order', async () => {
      const completedOrder = await ports.orderRepository.update(
        { ...testOrder, status: 'COMPLETED' },
        1,
      )

      await expect(
        service.createChangeRequest({
          actorUserId: buyerUserId,
          orderId: completedOrder.id,
          requestType: 'SCOPE',
          title: 'Test',
          description: 'Test',
        }),
      ).rejects.toThrow(InvalidChangeRequestStateError)
    })

    it('should reject unauthorized user', async () => {
      const otherUserId = parseUuidv7('01234567-89ab-7000-8000-000000000999')

      await expect(
        service.createChangeRequest({
          actorUserId: otherUserId,
          orderId: testOrder.id,
          requestType: 'SCOPE',
          title: 'Test',
          description: 'Test',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })

  describe('approveChangeRequest', () => {
    it('should allow provider to approve buyer request', async () => {
      const changeRequest = await service.createChangeRequest({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        requestType: 'SCHEDULE',
        title: 'Rush order',
        description: 'Need it sooner',
        scheduleAdjustmentDays: -3,
      })

      const result = await service.approveChangeRequest(
        providerUserId,
        changeRequest.id,
        1,
      )

      expect(result.status).toBe('APPROVED')
      expect(result.approvedByUserId).toBe(providerUserId)
    })

    it('should allow buyer to approve provider request', async () => {
      const changeRequest = await service.createChangeRequest({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        requestType: 'PRICE',
        title: 'Material cost adjustment',
        description: 'Extra materials needed',
        priceAdjustment: createMoneyMinor(1500),
      })

      const result = await service.approveChangeRequest(
        buyerUserId,
        changeRequest.id,
        1,
      )

      expect(result.status).toBe('APPROVED')
      expect(result.approvedByUserId).toBe(buyerUserId)
    })

    it('should reject self-approval', async () => {
      const changeRequest = await service.createChangeRequest({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        requestType: 'SCOPE',
        title: 'Test',
        description: 'Test',
      })

      await expect(
        service.approveChangeRequest(buyerUserId, changeRequest.id, 1),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })

  describe('rejectChangeRequest', () => {
    it('should allow rejection with reason', async () => {
      const changeRequest = await service.createChangeRequest({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        requestType: 'PRICE',
        title: 'Discount request',
        description: 'Can you reduce the price?',
        priceAdjustment: createMoneyMinor(-1000),
      })

      const result = await service.rejectChangeRequest(
        providerUserId,
        changeRequest.id,
        1,
        'Cannot accommodate price reduction at this stage',
      )

      expect(result.status).toBe('REJECTED')
      expect(result.rejectedByUserId).toBe(providerUserId)
      expect(result.rejectionReason).toBe(
        'Cannot accommodate price reduction at this stage',
      )
    })

    it('should reject self-rejection', async () => {
      const changeRequest = await service.createChangeRequest({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        requestType: 'SCHEDULE',
        title: 'Test',
        description: 'Test',
      })

      await expect(
        service.rejectChangeRequest(providerUserId, changeRequest.id, 1, 'Test'),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })

  describe('listChangeRequests', () => {
    it('should return all change requests for order', async () => {
      await service.createChangeRequest({
        actorUserId: buyerUserId,
        orderId: testOrder.id,
        requestType: 'SCOPE',
        title: 'Request 1',
        description: 'Test',
      })

      await service.createChangeRequest({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        requestType: 'PRICE',
        title: 'Request 2',
        description: 'Test',
      })

      const result = await service.listChangeRequests(buyerUserId, testOrder.id)

      expect(result).toHaveLength(2)
    })

    it('should reject unauthorized access', async () => {
      const otherUserId = parseUuidv7('01234567-89ab-7000-8000-000000000999')

      await expect(
        service.listChangeRequests(otherUserId, testOrder.id),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })
})
