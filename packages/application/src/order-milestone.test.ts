import { describe, it, expect, beforeEach } from 'vitest'
import {
  createOrderMilestoneService,
  type OrderMilestoneServicePorts,
  OrderMilestoneNotFoundError,
  InvalidMilestoneStateError,
  MilestoneRevisionLimitError,
  AuthorizationDeniedError,
} from './order-milestone.js'
import {
  createInMemoryOrderRepository,
  createInMemoryOrderMilestoneRepository,
} from '@pim/testkit'
import {
  createMoneyMinor,
  parseUuidv7,
  parseUtcTimestamp,
  type OrderMilestoneRecord,
  type OrderRecord,
  type ProviderProfileRepository,
} from '@pim/domain'

describe('OrderMilestoneService', () => {
  let service: ReturnType<typeof createOrderMilestoneService>
  let ports: OrderMilestoneServicePorts
  let testOrder: OrderRecord
  let testMilestone: OrderMilestoneRecord

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T14:45:00.000Z'),
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
    const orderMilestoneRepository = createInMemoryOrderMilestoneRepository(
      clock,
      uuidGenerator,
    )

    ports = {
      clock,
      orderRepository,
      orderMilestoneRepository,
      providerProfileRepository: mockProviderProfileRepository,
    }

    service = createOrderMilestoneService(ports)

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

    // Create test milestone
    testMilestone = await orderMilestoneRepository.create({
      id: parseUuidv7('01234567-89ab-7000-8000-000000000300'),
      orderId: testOrder.id,
      sequence: 1,
      title: 'Design Approval',
      description: 'Submit design for buyer approval',
      status: 'PENDING',
      createdBy: providerUserId,
    })
  })

  describe('submitMilestone', () => {
    it('should allow provider to submit milestone', async () => {
      const assetIds = [parseUuidv7('01234567-89ab-7000-8000-000000000400')]

      const result = await service.submitMilestone(
        providerUserId,
        testMilestone.id,
        1,
        assetIds,
      )

      expect(result.status).toBe('SUBMITTED')
      expect(result.submittedAt).toBe('2026-06-28T14:45:00.000Z')
      expect(result.deliverableAssetIds).toEqual(assetIds)
    })

    it('should reject submission by non-provider', async () => {
      await expect(
        service.submitMilestone(buyerUserId, testMilestone.id, 1, []),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject submission from invalid state', async () => {
      // Update to APPROVED state
      const approved = await ports.orderMilestoneRepository.update(
        { ...testMilestone, status: 'APPROVED' },
        1,
      )

      await expect(
        service.submitMilestone(providerUserId, approved.id, 2, []),
      ).rejects.toThrow(InvalidMilestoneStateError)
    })
  })

  describe('requestMilestoneRevision', () => {
    beforeEach(async () => {
      // Submit milestone first
      testMilestone = await ports.orderMilestoneRepository.update(
        {
          ...testMilestone,
          status: 'SUBMITTED',
          submittedAt: clock.now(),
          submittedByUserId: providerUserId,
        },
        1,
      )
    })

    it('should allow buyer to request revision', async () => {
      const result = await service.requestMilestoneRevision(
        buyerUserId,
        testMilestone.id,
        2,
        'Please adjust the color scheme',
      )

      expect(result.status).toBe('REVISION_REQUESTED')
      expect(result.revisionNotes).toBe('Please adjust the color scheme')
      expect(result.revisionCount).toBe(1)
    })

    it('should reject revision request by non-buyer', async () => {
      await expect(
        service.requestMilestoneRevision(
          providerUserId,
          testMilestone.id,
          2,
          'Test',
        ),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should enforce revision limit', async () => {
      // Reach max revisions
      let current = testMilestone
      for (let i = 0; i < 5; i++) {
        current = await ports.orderMilestoneRepository.update(
          {
            ...current,
            status: 'REVISION_REQUESTED',
            revisionCount: i + 1,
          },
          current.version,
        )
        current = await ports.orderMilestoneRepository.update(
          { ...current, status: 'SUBMITTED' },
          current.version,
        )
      }

      await expect(
        service.requestMilestoneRevision(buyerUserId, current.id, current.version, 'Test'),
      ).rejects.toThrow(MilestoneRevisionLimitError)
    })
  })

  describe('approveMilestone', () => {
    beforeEach(async () => {
      // Submit milestone first
      testMilestone = await ports.orderMilestoneRepository.update(
        {
          ...testMilestone,
          status: 'SUBMITTED',
          submittedAt: clock.now(),
          submittedByUserId: providerUserId,
        },
        1,
      )
    })

    it('should allow buyer to approve milestone', async () => {
      const result = await service.approveMilestone(
        buyerUserId,
        testMilestone.id,
        2,
      )

      expect(result.status).toBe('APPROVED')
      expect(result.approvedAt).toBe('2026-06-28T14:45:00.000Z')
      expect(result.approvedByUserId).toBe(buyerUserId)
    })

    it('should reject approval by non-buyer', async () => {
      await expect(
        service.approveMilestone(providerUserId, testMilestone.id, 2),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject approval from invalid state', async () => {
      const pending = await ports.orderMilestoneRepository.update(
        { ...testMilestone, status: 'PENDING' },
        2,
      )

      await expect(
        service.approveMilestone(buyerUserId, pending.id, 3),
      ).rejects.toThrow(InvalidMilestoneStateError)
    })
  })

  describe('listMilestones', () => {
    it('should allow buyer to list milestones', async () => {
      const result = await service.listMilestones(buyerUserId, testOrder.id)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(testMilestone.id)
    })

    it('should allow provider to list milestones', async () => {
      const result = await service.listMilestones(providerUserId, testOrder.id)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(testMilestone.id)
    })

    it('should reject access by unauthorized user', async () => {
      const otherUserId = parseUuidv7('01234567-89ab-7000-8000-000000000999')

      await expect(
        service.listMilestones(otherUserId, testOrder.id),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })
})
