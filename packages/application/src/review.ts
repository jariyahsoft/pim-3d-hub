import type {
  OrderRecord,
  OrderRepository,
  OrderStatus,
  RatingProjectionRecord,
  RatingProjectionRepository,
  RatingValue,
  ReviewRecord,
  ReviewRepository,
  ReviewRatingDimension,
  ReviewSubjectType,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'
import { InvalidRequestError, AuthorizationDeniedError } from './errors.js'

export type ReviewService = ReturnType<typeof createReviewService>

export class ReviewNotFoundError extends Error {
  constructor(reviewId: Uuidv7) {
    super(`Review ${reviewId} not found`)
    this.name = 'ReviewNotFoundError'
  }
}

export class ReviewEligibilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReviewEligibilityError'
  }
}

export type ReviewDto = Readonly<{
  approvedMediaAssetIds: Uuidv7[]
  createdAt: UtcTimestamp
  helpfulCount: number
  id: Uuidv7
  isVerifiedPurchase: boolean
  moderatedAt: UtcTimestamp | null
  orderId: Uuidv7
  ratings: Record<ReviewRatingDimension, RatingValue>
  reviewText: string | null
  reviewerUserId: Uuidv7
  sellerRespondedAt: UtcTimestamp | null
  sellerRespondedBy: Uuidv7 | null
  sellerResponse: string | null
  status: string
  subjectId: Uuidv7
  subjectType: ReviewSubjectType
  updatedAt: UtcTimestamp
  version: number
}>

export type RatingProjectionDto = Readonly<{
  averageCommunicationRating: number
  averageDeliveryRating: number
  averageOverallRating: number
  averageQualityRating: number
  averageValueRating: number
  createdAt: UtcTimestamp
  id: Uuidv7
  lastReviewedAt: UtcTimestamp | null
  ratingDistribution: Record<RatingValue, number>
  subjectId: Uuidv7
  subjectType: ReviewSubjectType
  totalReviewCount: number
  updatedAt: UtcTimestamp
  verifiedReviewCount: number
  version: number
}>

export function createReviewService(deps: {
  now: () => Date
  orderRepository: OrderRepository
  ratingProjectionRepository: RatingProjectionRepository
  reviewRepository: ReviewRepository
}) {
  const { now, orderRepository, ratingProjectionRepository, reviewRepository } = deps

  async function createReview(
    actorUserId: Uuidv7,
    input: Readonly<{
      approvedMediaAssetIds?: Uuidv7[]
      orderId: Uuidv7
      ratings: Record<ReviewRatingDimension, RatingValue>
      reviewText?: string
      subjectId: Uuidv7
      subjectType: ReviewSubjectType
    }>,
  ): Promise<ReviewDto> {
    // Load order to verify eligibility
    const order = await orderRepository.findById(input.orderId)
    if (!order) {
      throw new ReviewEligibilityError('Order not found')
    }

    // Only COMPLETED orders can be reviewed
    if (order.status !== 'COMPLETED') {
      throw new ReviewEligibilityError('Only completed orders can be reviewed')
    }

    // Only the buyer can create a review
    if (order.buyerUserId !== actorUserId) {
      throw new AuthorizationDeniedError('Only the order buyer can create a review')
    }

    // Verify subject matches order
    if (input.subjectType === 'PROVIDER_PROFILE') {
      if (input.subjectId !== order.providerProfileId) {
        throw new InvalidRequestError('Subject must be the order provider')
      }
    }

    // Check for duplicate review (one review per order)
    const existing = await reviewRepository.findByOrderAndReviewer(input.orderId, actorUserId)
    if (existing) {
      throw new InvalidRequestError('Review already exists for this order')
    }

    // Validate ratings (all dimensions required)
    const requiredDimensions: ReviewRatingDimension[] = [
      'OVERALL',
      'QUALITY',
      'COMMUNICATION',
      'DELIVERY',
      'VALUE',
    ]
    for (const dimension of requiredDimensions) {
      const rating = input.ratings[dimension]
      if (!rating || rating < 1 || rating > 5) {
        throw new InvalidRequestError(`Invalid rating for ${dimension}: must be 1-5`)
      }
    }

    // Validate review text length
    if (input.reviewText && input.reviewText.length > 5000) {
      throw new InvalidRequestError('Review text must not exceed 5000 characters')
    }

    // Validate media count
    if (input.approvedMediaAssetIds && input.approvedMediaAssetIds.length > 10) {
      throw new InvalidRequestError('Maximum 10 media assets allowed per review')
    }

    // Create review
    const review = await reviewRepository.create({
      approvedMediaAssetIds: input.approvedMediaAssetIds ?? [],
      createdBy: actorUserId,
      orderId: input.orderId,
      ratings: input.ratings,
      reviewText: input.reviewText ?? null,
      reviewerUserId: actorUserId,
      status: 'PUBLISHED',
      subjectId: input.subjectId,
      subjectType: input.subjectType,
      updatedBy: actorUserId,
    })

    // Rebuild rating projection
    await rebuildRatingProjection(input.subjectType, input.subjectId)

    return toReviewDto(review)
  }

  async function updateReview(
    actorUserId: Uuidv7,
    reviewId: Uuidv7,
    input: Readonly<{
      approvedMediaAssetIds?: Uuidv7[]
      ratings?: Record<ReviewRatingDimension, RatingValue>
      reviewText?: string
    }>,
  ): Promise<ReviewDto> {
    const review = await reviewRepository.findById(reviewId)
    if (!review) {
      throw new ReviewNotFoundError(reviewId)
    }

    // Only reviewer can update
    if (review.reviewerUserId !== actorUserId) {
      throw new AuthorizationDeniedError('Only the reviewer can update this review')
    }

    // Cannot update moderated reviews
    if (review.status === 'MODERATED') {
      throw new InvalidRequestError('Cannot update moderated reviews')
    }

    // Validate ratings if provided
    if (input.ratings) {
      const requiredDimensions: ReviewRatingDimension[] = [
        'OVERALL',
        'QUALITY',
        'COMMUNICATION',
        'DELIVERY',
        'VALUE',
      ]
      for (const dimension of requiredDimensions) {
        const rating = input.ratings[dimension]
        if (!rating || rating < 1 || rating > 5) {
          throw new InvalidRequestError(`Invalid rating for ${dimension}: must be 1-5`)
        }
      }
    }

    // Validate review text length
    if (input.reviewText !== undefined && input.reviewText.length > 5000) {
      throw new InvalidRequestError('Review text must not exceed 5000 characters')
    }

    // Validate media count
    if (input.approvedMediaAssetIds && input.approvedMediaAssetIds.length > 10) {
      throw new InvalidRequestError('Maximum 10 media assets allowed per review')
    }

    const updated = await reviewRepository.update(reviewId, review.version, {
      approvedMediaAssetIds: input.approvedMediaAssetIds,
      ratings: input.ratings,
      reviewText: input.reviewText ?? null,
    })

    // Rebuild rating projection if ratings changed
    if (input.ratings) {
      await rebuildRatingProjection(review.subjectType, review.subjectId)
    }

    return toReviewDto(updated)
  }

  async function addSellerResponse(
    actorUserId: Uuidv7,
    reviewId: Uuidv7,
    response: string,
  ): Promise<ReviewDto> {
    const review = await reviewRepository.findById(reviewId)
    if (!review) {
      throw new ReviewNotFoundError(reviewId)
    }

    // Load order to verify seller
    const order = await orderRepository.findById(review.orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    // Verify actor is provider (would need to check provider ownership)
    // For now, just record the response
    if (response.length > 2000) {
      throw new InvalidRequestError('Seller response must not exceed 2000 characters')
    }

    const updated = await reviewRepository.update(reviewId, review.version, {
      sellerResponse: response,
      sellerRespondedAt: now().toISOString() as UtcTimestamp,
      sellerRespondedBy: actorUserId,
    })

    return toReviewDto(updated)
  }

  async function rebuildRatingProjection(
    subjectType: ReviewSubjectType,
    subjectId: Uuidv7,
  ): Promise<RatingProjectionDto> {
    // Load all published, non-moderated reviews for subject
    const reviews = await reviewRepository.list({
      filter: {
        status: 'PUBLISHED',
        subjectId,
        subjectType,
      },
      limit: 10000, // Load all for accurate aggregation
    })

    const publishedReviews = reviews.items.filter((r) => r.moderatedAt === null)

    // Calculate aggregates
    let totalReviewCount = publishedReviews.length
    let verifiedReviewCount = publishedReviews.filter((r) => r.isVerifiedPurchase).length

    const ratingDistribution: Record<RatingValue, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    }

    let sumOverall = 0
    let sumQuality = 0
    let sumCommunication = 0
    let sumDelivery = 0
    let sumValue = 0
    let lastReviewedAt: UtcTimestamp | null = null

    for (const review of publishedReviews) {
      sumOverall += review.ratings.OVERALL
      sumQuality += review.ratings.QUALITY
      sumCommunication += review.ratings.COMMUNICATION
      sumDelivery += review.ratings.DELIVERY
      sumValue += review.ratings.VALUE

      ratingDistribution[review.ratings.OVERALL]++

      if (!lastReviewedAt || review.createdAt > lastReviewedAt) {
        lastReviewedAt = review.createdAt
      }
    }

    const count = totalReviewCount || 1 // Avoid division by zero

    const averageOverallRating = totalReviewCount > 0 ? sumOverall / count : 0
    const averageQualityRating = totalReviewCount > 0 ? sumQuality / count : 0
    const averageCommunicationRating = totalReviewCount > 0 ? sumCommunication / count : 0
    const averageDeliveryRating = totalReviewCount > 0 ? sumDelivery / count : 0
    const averageValueRating = totalReviewCount > 0 ? sumValue / count : 0

    // Find or create projection
    let projection = await ratingProjectionRepository.findBySubject(subjectType, subjectId)

    if (!projection) {
      projection = await ratingProjectionRepository.create({
        subjectId,
        subjectType,
      })
    }

    const updated = await ratingProjectionRepository.update(projection.id, projection.version, {
      averageCommunicationRating,
      averageDeliveryRating,
      averageOverallRating,
      averageQualityRating,
      averageValueRating,
      lastReviewedAt,
      ratingDistribution,
      totalReviewCount,
      verifiedReviewCount,
    })

    return toRatingProjectionDto(updated)
  }

  return {
    addSellerResponse,
    createReview,
    rebuildRatingProjection,
    updateReview,
  }
}

function toReviewDto(record: ReviewRecord): ReviewDto {
  return {
    approvedMediaAssetIds: record.approvedMediaAssetIds,
    createdAt: record.createdAt,
    helpfulCount: record.helpfulCount,
    id: record.id,
    isVerifiedPurchase: record.isVerifiedPurchase,
    moderatedAt: record.moderatedAt,
    orderId: record.orderId,
    ratings: record.ratings,
    reviewText: record.reviewText,
    reviewerUserId: record.reviewerUserId,
    sellerRespondedAt: record.sellerRespondedAt,
    sellerRespondedBy: record.sellerRespondedBy,
    sellerResponse: record.sellerResponse,
    status: record.status,
    subjectId: record.subjectId,
    subjectType: record.subjectType,
    updatedAt: record.updatedAt,
    version: record.version,
  }
}

function toRatingProjectionDto(record: RatingProjectionRecord): RatingProjectionDto {
  return {
    averageCommunicationRating: record.averageCommunicationRating,
    averageDeliveryRating: record.averageDeliveryRating,
    averageOverallRating: record.averageOverallRating,
    averageQualityRating: record.averageQualityRating,
    averageValueRating: record.averageValueRating,
    createdAt: record.createdAt,
    id: record.id,
    lastReviewedAt: record.lastReviewedAt,
    ratingDistribution: record.ratingDistribution,
    subjectId: record.subjectId,
    subjectType: record.subjectType,
    totalReviewCount: record.totalReviewCount,
    updatedAt: record.updatedAt,
    verifiedReviewCount: record.verifiedReviewCount,
    version: record.version,
  }
}
