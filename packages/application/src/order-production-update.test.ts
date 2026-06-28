import { describe, it, expect, beforeEach } from 'vitest'
import {
  createOrderProductionUpdateService,
  type OrderProductionUpdateServicePorts,
  InvalidProductionUpdateError,
  AuthorizationDeniedError,
} from './order-production-update.js'
import {
  createInMemoryOrderRepository,
  createInMemoryOrderProductionUpdateRepository,
} from '@pim/testkit'
import {
  createMoneyMinor,
  parseUuidv7,
  parseUtcTimestamp,
  type OrderRecord,
  type ProviderProfileRepository,
} from '@pim/domain'

describe('OrderProductionUpdateService', () => {
  let service: ReturnType<typeof createOrderProductionUpdateService>
  let ports: OrderProductionUpdateServicePorts
  let testOrder: OrderRecord

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T14:47:00.000Z'),
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
    const orderProductionUpdateRepository =
      createInMemoryOrderProductionUpdateRepository(clock, uuidGenerator)

    ports = {
      clock,
      uuidGenerator,
      orderRepository,
      orderProductionUpdateRepository,
      providerProfileRepository: mockProviderProfileRepository,
    }

    service = createOrderProductionUpdateService(ports)

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

  describe('createProductionUpdate', () => {
    it('should allow provider to post production update', async () => {
      const result = await service.createProductionUpdate({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        updateType: 'PROGRESS',
        occurredAt: parseUtcTimestamp('2026-06-28T14:00:00.000Z'),
        title: 'Printing layer 50 of 200',
        description: '25% complete',
      })

      expect(result.updateType).toBe('PROGRESS')
      expect(result.title).toBe('Printing layer 50 of 200')
      expect(result.postedByUserId).toBe(providerUserId)
    })

    it('should allow media attachments', async () => {
      const mediaAssetIds = [parseUuidv7('01234567-89ab-7000-8000-000000000400')]

      const result = await service.createProductionUpdate({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        updateType: 'MILESTONE_EVIDENCE',
        occurredAt: parseUtcTimestamp('2026-06-28T14:00:00.000Z'),
        title: 'Print completed',
        description: 'Print finished successfully',
        mediaAssetIds,
      })

      expect(result.mediaAssetIds).toEqual(mediaAssetIds)
    })

    it('should reject update by non-provider', async () => {
      await expect(
        service.createProductionUpdate({
          actorUserId: buyerUserId,
          orderId: testOrder.id,
          updateType: 'PROGRESS',
          occurredAt: parseUtcTimestamp('2026-06-28T14:00:00.000Z'),
          title: 'Test',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('should reject update for non-production state', async () => {
      const draftOrder = await ports.orderRepository.update(
        { ...testOrder, status: 'AWAITING_PAYMENT' },
        1,
      )

      await expect(
        service.createProductionUpdate({
          actorUserId: providerUserId,
          orderId: draftOrder.id,
          updateType: 'PROGRESS',
          occurredAt: parseUtcTimestamp('2026-06-28T14:00:00.000Z'),
          title: 'Test',
        }),
      ).rejects.toThrow(InvalidProductionUpdateError)
    })

    it('should reject future occurredAt', async () => {
      await expect(
        service.createProductionUpdate({
          actorUserId: providerUserId,
          orderId: testOrder.id,
          updateType: 'PROGRESS',
          occurredAt: parseUtcTimestamp('2026-06-29T00:00:00.000Z'),
          title: 'Test',
        }),
      ).rejects.toThrow(InvalidProductionUpdateError)
    })
  })

  describe('listProductionUpdates', () => {
    it('should allow buyer to view updates', async () => {
      await service.createProductionUpdate({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        updateType: 'PROGRESS',
        occurredAt: parseUtcTimestamp('2026-06-28T14:00:00.000Z'),
        title: 'Update 1',
      })

      await service.createProductionUpdate({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        updateType: 'PROGRESS',
        occurredAt: parseUtcTimestamp('2026-06-28T14:30:00.000Z'),
        title: 'Update 2',
      })

      const result = await service.listProductionUpdates(buyerUserId, testOrder.id)

      expect(result).toHaveLength(2)
    })

    it('should allow provider to view updates', async () => {
      await service.createProductionUpdate({
        actorUserId: providerUserId,
        orderId: testOrder.id,
        updateType: 'ISSUE',
        occurredAt: parseUtcTimestamp('2026-06-28T14:00:00.000Z'),
        title: 'Minor issue detected',
        description: 'Small surface defect, will fix in post-processing',
      })

      const result = await service.listProductionUpdates(
        providerUserId,
        testOrder.id,
      )

      expect(result).toHaveLength(1)
      expect(result[0].updateType).toBe('ISSUE')
    })

    it('should reject unauthorized access', async () => {
      const otherUserId = parseUuidv7('01234567-89ab-7000-8000-000000000999')

      await expect(
        service.listProductionUpdates(otherUserId, testOrder.id),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })
})
