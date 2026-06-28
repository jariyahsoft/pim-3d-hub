import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { UtcTimestamp, Uuidv7 } from './index.js'

// Review types
export const reviewStatuses = ['DRAFT', 'PUBLISHED', 'HIDDEN', 'MODERATED'] as const
export const reviewSubjectTypes = ['PROVIDER_PROFILE', 'PRODUCT'] as const
export const reviewRatingDimensions = [
  'OVERALL',
  'QUALITY',
  'COMMUNICATION',
  'DELIVERY',
  'VALUE',
] as const

export type ReviewStatus = (typeof reviewStatuses)[number]
export type ReviewSubjectType = (typeof reviewSubjectTypes)[number]
export type ReviewRatingDimension = (typeof reviewRatingDimensions)[number]
export type ReviewSortField = 'createdAt' | 'updatedAt' | 'helpfulCount'

// Rating value (1-5 scale)
export type RatingValue = 1 | 2 | 3 | 4 | 5

// Review record
export type ReviewRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    reviewerUserId: Uuidv7
    subjectType: ReviewSubjectType
    subjectId: Uuidv7
    status: ReviewStatus
    isVerifiedPurchase: boolean
    ratings: Record<ReviewRatingDimension, RatingValue>
    reviewText: string | null
    approvedMediaAssetIds: Uuidv7[]
    sellerResponse: string | null
    sellerRespondedAt: UtcTimestamp | null
    sellerRespondedBy: Uuidv7 | null
    helpfulCount: number
    moderatedAt: UtcTimestamp | null
    moderatedBy: Uuidv7 | null
    moderationReason: string | null
  }
>

export type CreateReviewInput = Readonly<{
  approvedMediaAssetIds?: Uuidv7[]
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  orderId: Uuidv7
  ratings: Record<ReviewRatingDimension, RatingValue>
  reviewText?: string | null
  reviewerUserId: Uuidv7
  status?: ReviewStatus
  subjectId: Uuidv7
  subjectType: ReviewSubjectType
  updatedBy?: Uuidv7 | null
}>

export type UpdateReviewInput = Readonly<{
  approvedMediaAssetIds?: Uuidv7[]
  ratings?: Record<ReviewRatingDimension, RatingValue>
  reviewText?: string | null
  status?: ReviewStatus
}>

export type ReviewFilter = Readonly<{
  isVerifiedPurchase?: boolean
  orderId?: Uuidv7
  reviewerUserId?: Uuidv7
  status?: ReviewStatus
  subjectId?: Uuidv7
  subjectType?: ReviewSubjectType
}>

export interface ReviewRepository {
  create(input: CreateReviewInput): Promise<ReviewRecord>
  findById(id: Uuidv7): Promise<ReviewRecord | null>
  findByOrderAndReviewer(orderId: Uuidv7, reviewerUserId: Uuidv7): Promise<ReviewRecord | null>
  list(
    request: RepositoryListRequest<ReviewFilter, ReviewSortField>,
  ): Promise<RepositoryListPage<ReviewRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        ReviewRecord,
        | 'approvedMediaAssetIds'
        | 'helpfulCount'
        | 'moderatedAt'
        | 'moderatedBy'
        | 'moderationReason'
        | 'ratings'
        | 'reviewText'
        | 'sellerRespondedAt'
        | 'sellerRespondedBy'
        | 'sellerResponse'
        | 'status'
      >
    >,
  ): Promise<ReviewRecord>
}

// Rating projection (aggregate) for subjects
export type RatingProjectionRecord = Readonly<
  CanonicalRecord & {
    subjectType: ReviewSubjectType
    subjectId: Uuidv7
    verifiedReviewCount: number
    totalReviewCount: number
    averageOverallRating: number
    averageQualityRating: number
    averageCommunicationRating: number
    averageDeliveryRating: number
    averageValueRating: number
    ratingDistribution: Record<RatingValue, number>
    lastReviewedAt: UtcTimestamp | null
  }
>

export type CreateRatingProjectionInput = Readonly<{
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  subjectId: Uuidv7
  subjectType: ReviewSubjectType
  updatedBy?: Uuidv7 | null
}>

export type RatingProjectionFilter = Readonly<{
  subjectId?: Uuidv7
  subjectType?: ReviewSubjectType
}>

export interface RatingProjectionRepository {
  create(input: CreateRatingProjectionInput): Promise<RatingProjectionRecord>
  findById(id: Uuidv7): Promise<RatingProjectionRecord | null>
  findBySubject(
    subjectType: ReviewSubjectType,
    subjectId: Uuidv7,
  ): Promise<RatingProjectionRecord | null>
  list(
    request: RepositoryListRequest<RatingProjectionFilter, 'createdAt'>,
  ): Promise<RepositoryListPage<RatingProjectionRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        RatingProjectionRecord,
        | 'averageCommunicationRating'
        | 'averageDeliveryRating'
        | 'averageOverallRating'
        | 'averageQualityRating'
        | 'averageValueRating'
        | 'lastReviewedAt'
        | 'ratingDistribution'
        | 'totalReviewCount'
        | 'verifiedReviewCount'
      >
    >,
  ): Promise<RatingProjectionRecord>
}
