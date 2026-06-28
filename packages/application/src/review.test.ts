import { describe, it, expect, beforeEach } from 'vitest'
import { createReviewService, ReviewEligibilityError, ReviewNotFoundError } from './review.js'
import { AuthorizationDeniedError, InvalidRequestError } from './errors.js'
import type {
  OrderRepository,
  OrderRecord,
  RatingProjectionRepository,
  ReviewRepository,
  Uuidv7,
  UtcTimestamp,
  RatingValue,
} from '@pim/domain'
import {
  createInMemoryReviewRepository,
  createInMemoryRatingProjectionRepository,
} from '../../infrastructure/src/in-memory-review-repositories.js'

describe('ReviewService', () => {
  let reviewRepository: ReviewRepository
  let ratingProjectionRepository: RatingProjectionRepository
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
      serviceRequestId: null,
      currency: 'THB',
      totalAmount: { minorUnits: 100000, currency: 'THB' as any },
      buyerSnapshot: {
        userId: buyerId,
        displayName: 'Buyer Name',
        email: 'buyer@example.com',
        phone: null,
      },
      providerSnapshot: {
        userId: providerId,
        displayName: 'Provider Name',
        email: 'provider@example.com',
        phone: null,
      },
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

    reviewRepository = createInMemoryReviewRepository({ generateId, now })
    ratingProjectionRepository = createInMemoryRatingProjectionRepository({ generateId, now })

    const orders = new Map<Uuidv7, OrderRecord>()
    orderRepository = {
      findById: async (id: Uuidv7) => orders.get(id) ?? null,
      create: async (order: OrderRecord) => {
        orders.set(order.id, order)
        return order
      },
    } as any
  })

  describe('createReview', () => {
    it('creates verified purchase review for completed order', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const review = await service.createReview(buyerId, {
        orderId: order.id,
        subjectType: 'PROVIDER_PROFILE',
        subjectId: providerId,
        ratings: {
          OVERALL: 5,
          QUALITY: 5,
          COMMUNICATION: 4,
          DELIVERY: 5,
          VALUE: 5,
        },
        reviewText: 'Excellent service!',
        approvedMediaAssetIds: [generateId()],
      })

      expect(review.isVerifiedPurchase).toBe(true)
      expect(review.orderId).toBe(order.id)
      expect(review.reviewerUserId).toBe(buyerId)
      expect(review.ratings.OVERALL).toBe(5)
      expect(review.reviewText).toBe('Excellent service!')
      expect(review.status).toBe('PUBLISHED')
    })

    it('throws error when order not found', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()

      await expect(
        service.createReview(buyerId, {
          orderId: generateId(),
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: 5,
            QUALITY: 5,
            COMMUNICATION: 5,
            DELIVERY: 5,
            VALUE: 5,
          },
        }),
      ).rejects.toThrow(ReviewEligibilityError)
    })

    it('throws error when order is not completed', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'IN_PRODUCTION')
      await orderRepository.create(order)

      await expect(
        service.createReview(buyerId, {
          orderId: order.id,
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: 5,
            QUALITY: 5,
            COMMUNICATION: 5,
            DELIVERY: 5,
            VALUE: 5,
          },
        }),
      ).rejects.toThrow('Only completed orders can be reviewed')
    })

    it('throws error when actor is not the buyer', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const otherUserId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      await expect(
        service.createReview(otherUserId, {
          orderId: order.id,
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: 5,
            QUALITY: 5,
            COMMUNICATION: 5,
            DELIVERY: 5,
            VALUE: 5,
          },
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('enforces one review per order policy', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      // First review
      await service.createReview(buyerId, {
        orderId: order.id,
        subjectType: 'PROVIDER_PROFILE',
        subjectId: providerId,
        ratings: {
          OVERALL: 5,
          QUALITY: 5,
          COMMUNICATION: 5,
          DELIVERY: 5,
          VALUE: 5,
        },
      })

      // Duplicate review
      await expect(
        service.createReview(buyerId, {
          orderId: order.id,
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: 4,
            QUALITY: 4,
            COMMUNICATION: 4,
            DELIVERY: 4,
            VALUE: 4,
          },
        }),
      ).rejects.toThrow('Review already exists for this order')
    })

    it('validates rating dimensions are all present', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      await expect(
        service.createReview(buyerId, {
          orderId: order.id,
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: 5,
            QUALITY: 5,
            // Missing other dimensions
          } as any,
        }),
      ).rejects.toThrow(InvalidRequestError)
    })

    it('validates review text length', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      await expect(
        service.createReview(buyerId, {
          orderId: order.id,
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: 5,
            QUALITY: 5,
            COMMUNICATION: 5,
            DELIVERY: 5,
            VALUE: 5,
          },
          reviewText: 'x'.repeat(5001),
        }),
      ).rejects.toThrow('Review text must not exceed 5000 characters')
    })

    it('validates media asset limit', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const mediaIds = Array.from({ length: 11 }, () => generateId())

      await expect(
        service.createReview(buyerId, {
          orderId: order.id,
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: 5,
            QUALITY: 5,
            COMMUNICATION: 5,
            DELIVERY: 5,
            VALUE: 5,
          },
          approvedMediaAssetIds: mediaIds,
        }),
      ).rejects.toThrow('Maximum 10 media assets allowed per review')
    })

    it('rebuilds rating projection after review creation', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      await service.createReview(buyerId, {
        orderId: order.id,
        subjectType: 'PROVIDER_PROFILE',
        subjectId: providerId,
        ratings: {
          OVERALL: 4,
          QUALITY: 5,
          COMMUNICATION: 4,
          DELIVERY: 3,
          VALUE: 5,
        },
      })

      const projection = await ratingProjectionRepository.findBySubject(
        'PROVIDER_PROFILE',
        providerId,
      )

      expect(projection).not.toBeNull()
      expect(projection!.totalReviewCount).toBe(1)
      expect(projection!.verifiedReviewCount).toBe(1)
      expect(projection!.averageOverallRating).toBe(4)
      expect(projection!.averageQualityRating).toBe(5)
      expect(projection!.ratingDistribution[4]).toBe(1)
    })
  })

  describe('updateReview', () => {
    it('allows reviewer to update their review', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const review = await service.createReview(buyerId, {
        orderId: order.id,
        subjectType: 'PROVIDER_PROFILE',
        subjectId: providerId,
        ratings: {
          OVERALL: 4,
          QUALITY: 4,
          COMMUNICATION: 4,
          DELIVERY: 4,
          VALUE: 4,
        },
        reviewText: 'Original review',
      })

      const updated = await service.updateReview(buyerId, review.id, {
        ratings: {
          OVERALL: 5,
          QUALITY: 5,
          COMMUNICATION: 5,
          DELIVERY: 5,
          VALUE: 5,
        },
        reviewText: 'Updated review',
      })

      expect(updated.ratings.OVERALL).toBe(5)
      expect(updated.reviewText).toBe('Updated review')
    })

    it('prevents non-reviewer from updating review', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const otherUserId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const review = await service.createReview(buyerId, {
        orderId: order.id,
        subjectType: 'PROVIDER_PROFILE',
        subjectId: providerId,
        ratings: {
          OVERALL: 5,
          QUALITY: 5,
          COMMUNICATION: 5,
          DELIVERY: 5,
          VALUE: 5,
        },
      })

      await expect(
        service.updateReview(otherUserId, review.id, {
          reviewText: 'Malicious update',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })

  describe('addSellerResponse', () => {
    it('adds seller response to review', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const review = await service.createReview(buyerId, {
        orderId: order.id,
        subjectType: 'PROVIDER_PROFILE',
        subjectId: providerId,
        ratings: {
          OVERALL: 5,
          QUALITY: 5,
          COMMUNICATION: 5,
          DELIVERY: 5,
          VALUE: 5,
        },
        reviewText: 'Great service!',
      })

      const updated = await service.addSellerResponse(
        providerId,
        review.id,
        'Thank you for your feedback!',
      )

      expect(updated.sellerResponse).toBe('Thank you for your feedback!')
      expect(updated.sellerRespondedAt).not.toBeNull()
      expect(updated.sellerRespondedBy).toBe(providerId)
    })

    it('validates seller response length', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const buyerId = generateId()
      const providerId = generateId()
      const order = createMockOrder(buyerId, providerId, 'COMPLETED')
      await orderRepository.create(order)

      const review = await service.createReview(buyerId, {
        orderId: order.id,
        subjectType: 'PROVIDER_PROFILE',
        subjectId: providerId,
        ratings: {
          OVERALL: 5,
          QUALITY: 5,
          COMMUNICATION: 5,
          DELIVERY: 5,
          VALUE: 5,
        },
      })

      await expect(
        service.addSellerResponse(providerId, review.id, 'x'.repeat(2001)),
      ).rejects.toThrow('Seller response must not exceed 2000 characters')
    })
  })

  describe('rebuildRatingProjection', () => {
    it('calculates correct averages and distribution', async () => {
      const service = createReviewService({
        now,
        orderRepository,
        ratingProjectionRepository,
        reviewRepository,
      })

      const providerId = generateId()

      // Create 3 reviews with different ratings
      for (let i = 0; i < 3; i++) {
        const buyerId = generateId()
        const order = createMockOrder(buyerId, providerId, 'COMPLETED')
        await orderRepository.create(order)

        await service.createReview(buyerId, {
          orderId: order.id,
          subjectType: 'PROVIDER_PROFILE',
          subjectId: providerId,
          ratings: {
            OVERALL: (i + 3) as RatingValue, // 3, 4, 5
            QUALITY: 5,
            COMMUNICATION: 4,
            DELIVERY: 4,
            VALUE: 5,
          },
        })
      }

      const projection = await ratingProjectionRepository.findBySubject(
        'PROVIDER_PROFILE',
        providerId,
      )

      expect(projection!.totalReviewCount).toBe(3)
      expect(projection!.verifiedReviewCount).toBe(3)
      expect(projection!.averageOverallRating).toBe(4) // (3 + 4 + 5) / 3
      expect(projection!.averageQualityRating).toBe(5)
      expect(projection!.ratingDistribution[3]).toBe(1)
      expect(projection!.ratingDistribution[4]).toBe(1)
      expect(projection!.ratingDistribution[5]).toBe(1)
    })
  })
})
