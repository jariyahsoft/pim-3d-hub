import { describe, it, expect, beforeEach } from 'vitest'
import {
  createModerationDisputeService,
  DisputeEligibilityError,
  DisputeNotFoundError,
} from './moderation-dispute.js'
import { AuthorizationDeniedError, InvalidRequestError } from './errors.js'
import type {
  DisputeRepository,
  ModerationCaseRepository,
  OrderRecord,
  OrderRepository,
  ReportRepository,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'
import {
  createInMemoryDisputeRepository,
  createInMemoryModerationCaseRepository,
  createInMemoryReportRepository,
} from '../../infrastructure/src/in-memory-moderation-dispute-repositories.js'

describe('ModerationDisputeService', () => {
  let reportRepository: ReportRepository
  let moderationCaseRepository: ModerationCaseRepository
  let disputeRepository: DisputeRepository
  let orderRepository: OrderRepository
  let currentTime: Date
  let idCounter: number

  const generateId = (): Uuidv7 => {
    idCounter++
    return `0193e7a0-0000-7000-8000-${idCounter.toString().padStart(12, '0')}` as Uuidv7
  }

  const now = () => currentTime

  const createMockOrder = (
    buyerId: Uuidv7,
    providerId: Uuidv7,
    status: string,
  ): OrderRecord => {
    return {
      id: generateId(),
      buyerUserId: buyerId,
      providerProfileId: providerId,
      status,
      orderNumber: `ORD-${idCounter}`,
      totalAmount: { minorUnits: 100000, currency: 'THB' as any },
      buyerSnapshot: {
        userId: buyerId,
        displayName: 'Buyer',
        email: 'buyer@example.com',
        phone: null,
      },
      providerSnapshot: {
        userId: providerId,
        displayName: 'Provider',
        email: 'provider@example.com',
        phone: null,
      },
      serviceRequestId: null,
      currency: 'THB',
      shippingAddress: null,
      sourceSnapshot: null,
      createdAt: now().toISOString() as UtcTimestamp,
      createdBy: buyerId,
      updatedAt: now().toISOString() as UtcTimestamp,
      updatedBy: buyerId,
      deletedAt: null,
      version: 1,
    } as OrderRecord
  }

  beforeEach(() => {
    currentTime = new Date('2026-06-28T10:00:00.000Z')
    idCounter = 0

    reportRepository = createInMemoryReportRepository({ generateId, now })
    moderationCaseRepository = createInMemoryModerationCaseRepository({ generateId, now })
    disputeRepository = createInMemoryDisputeRepository({ generateId, now })

    const orders = new Map<Uuidv7, OrderRecord>()
    orderRepository = {
      findById: async (id: Uuidv7) => orders.get(id) ?? null,
      create: async (order: OrderRecord) => {
        orders.set(order.id, order)
        return order
      },
    } as any
  })

  describe('createReport', () => {
    it('creates a report for reported content', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const reporterId = generateId()
      const targetId = generateId()

      const report = await service.createReport(reporterId, {
        description: 'This content is spam and violates our policies.',
        reason: 'SPAM',
        targetId,
        targetType: 'POST',
      })

      expect(report.reporterUserId).toBe(reporterId)
      expect(report.targetId).toBe(targetId)
      expect(report.targetType).toBe('POST')
      expect(report.reason).toBe('SPAM')
      expect(report.status).toBe('PENDING')
    })

    it('validates description length', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      await expect(
        service.createReport(generateId(), {
          description: 'short',
          reason: 'SPAM',
          targetId: generateId(),
          targetType: 'POST',
        }),
      ).rejects.toThrow('Report description must be at least 10 characters')

      await expect(
        service.createReport(generateId(), {
          description: 'x'.repeat(2001),
          reason: 'SPAM',
          targetId: generateId(),
          targetType: 'POST',
        }),
      ).rejects.toThrow('Report description must not exceed 2000 characters')
    })
  })

  describe('createModerationCase', () => {
    it('creates moderation case from reports', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const targetId = generateId()
      const moderatorId = generateId()

      // Create some reports first
      const report1 = await service.createReport(generateId(), {
        description: 'This is spam content that violates policies.',
        reason: 'SPAM',
        targetId,
        targetType: 'POST',
      })

      const moderationCase = await service.createModerationCase(moderatorId, {
        assignedModeratorId: moderatorId,
        priority: 2,
        reportIds: [report1.id],
        targetId,
        targetType: 'POST',
      })

      expect(moderationCase.targetId).toBe(targetId)
      expect(moderationCase.status).toBe('OPEN')
      expect(moderationCase.assignedModeratorId).toBe(moderatorId)
      expect(moderationCase.reportIds).toContain(report1.id)
    })

    it('prevents duplicate moderation cases for same target', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const targetId = generateId()
      const moderatorId = generateId()

      await service.createModerationCase(moderatorId, {
        targetId,
        targetType: 'POST',
      })

      await expect(
        service.createModerationCase(moderatorId, {
          targetId,
          targetType: 'POST',
        }),
      ).rejects.toThrow('Moderation case already exists for this target')
    })
  })

  describe('takeModerationAction', () => {
    it('takes moderation action and resolves case', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const targetId = generateId()
      const moderatorId = generateId()

      const moderationCase = await service.createModerationCase(moderatorId, {
        assignedModeratorId: moderatorId,
        targetId,
        targetType: 'POST',
      })

      const result = await service.takeModerationAction(moderatorId, moderationCase.id, {
        actionDuration: 7,
        actionReason: 'Content violates spam policy and has been removed.',
        actionType: 'REMOVE',
      })

      expect(result.status).toBe('RESOLVED')
      expect(result.actionTaken).toBe('REMOVE')
      expect(result.actionDuration).toBe(7)
      expect(result.actionedAt).not.toBeNull()
    })

    it('validates action reason length', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const moderationCase = await service.createModerationCase(generateId(), {
        targetId: generateId(),
        targetType: 'POST',
      })

      await expect(
        service.takeModerationAction(generateId(), moderationCase.id, {
          actionReason: 'short',
          actionType: 'WARN',
        }),
      ).rejects.toThrow('Action reason must be at least 10 characters')
    })
  })

  describe('createDispute', () => {
    it('creates dispute for completed order', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const dispute = await service.createDispute(buyerId, {
        category: 'ITEM_DAMAGED',
        description: 'The item arrived with significant damage and is unusable.',
        orderId: order.id,
        requestedResolution: 'REFUND_FULL',
      })

      expect(dispute.orderId).toBe(order.id)
      expect(dispute.buyerUserId).toBe(buyerId)
      expect(dispute.providerUserId).toBe(providerId)
      expect(dispute.status).toBe('OPEN')
      expect(dispute.payoutHoldApplied).toBe(true)
    })

    it('only allows buyer to create dispute', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const otherId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      await expect(
        service.createDispute(otherId, {
          category: 'ITEM_DAMAGED',
          description: 'The item arrived with significant damage and is unusable.',
          orderId: order.id,
          requestedResolution: 'REFUND_FULL',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('only allows disputes for eligible order statuses', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'IN_PRODUCTION')
      await orderRepository.create(order)

      await expect(
        service.createDispute(buyerId, {
          category: 'ITEM_DAMAGED',
          description: 'The item arrived with significant damage and is unusable.',
          orderId: order.id,
          requestedResolution: 'REFUND_FULL',
        }),
      ).rejects.toThrow('Disputes can only be opened for shipped, delivered, or completed orders')
    })

    it('prevents duplicate disputes for same order', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      await service.createDispute(buyerId, {
        category: 'ITEM_DAMAGED',
        description: 'The item arrived with significant damage and is unusable.',
        orderId: order.id,
        requestedResolution: 'REFUND_FULL',
      })

      await expect(
        service.createDispute(buyerId, {
          category: 'QUALITY_ISSUE',
          description: 'Another issue with this order that needs resolution.',
          orderId: order.id,
          requestedResolution: 'REFUND_PARTIAL',
        }),
      ).rejects.toThrow('A dispute already exists for this order')
    })

    it('validates description length', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      await expect(
        service.createDispute(buyerId, {
          category: 'ITEM_DAMAGED',
          description: 'short',
          orderId: order.id,
          requestedResolution: 'REFUND_FULL',
        }),
      ).rejects.toThrow('Dispute description must be at least 20 characters')
    })
  })

  describe('addSellerResponse', () => {
    it('allows provider to respond to dispute', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const dispute = await service.createDispute(buyerId, {
        category: 'ITEM_DAMAGED',
        description: 'The item arrived with significant damage and is unusable.',
        orderId: order.id,
        requestedResolution: 'REFUND_FULL',
      })

      const updated = await service.addSellerResponse(providerId, dispute.id, {
        responseText: 'We apologize for the issue and are investigating the shipping damage.',
      })

      expect(updated.sellerResponseText).not.toBeNull()
      expect(updated.sellerRespondedAt).not.toBeNull()
      expect(updated.status).toBe('UNDER_REVIEW')
    })

    it('only allows provider to respond', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const otherId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const dispute = await service.createDispute(buyerId, {
        category: 'ITEM_DAMAGED',
        description: 'The item arrived with significant damage and is unusable.',
        orderId: order.id,
        requestedResolution: 'REFUND_FULL',
      })

      await expect(
        service.addSellerResponse(otherId, dispute.id, {
          responseText: 'Unauthorized response attempt from another user.',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })

  describe('resolveDispute', () => {
    it('resolves dispute and releases payout hold', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const moderatorId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const dispute = await service.createDispute(buyerId, {
        category: 'ITEM_DAMAGED',
        description: 'The item arrived with significant damage and is unusable.',
        orderId: order.id,
        requestedResolution: 'REFUND_FULL',
      })

      const resolved = await service.resolveDispute(moderatorId, dispute.id, {
        resolutionNotes: 'After reviewing evidence, full refund is warranted.',
        resolutionType: 'REFUND_FULL',
      })

      expect(resolved.status).toBe('RESOLVED')
      expect(resolved.resolutionType).toBe('REFUND_FULL')
      expect(resolved.resolvedAt).not.toBeNull()
      expect(resolved.payoutHoldApplied).toBe(false)
    })

    it('validates resolution notes', async () => {
      const service = createModerationDisputeService({
        disputeRepository,
        moderationCaseRepository,
        now,
        orderRepository,
        reportRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const dispute = await service.createDispute(buyerId, {
        category: 'ITEM_DAMAGED',
        description: 'The item arrived with significant damage and is unusable.',
        orderId: order.id,
        requestedResolution: 'REFUND_FULL',
      })

      await expect(
        service.resolveDispute(generateId(), dispute.id, {
          resolutionNotes: 'short',
          resolutionType: 'REFUND_FULL',
        }),
      ).rejects.toThrow('Resolution notes must be at least 20 characters')
    })
  })
})
