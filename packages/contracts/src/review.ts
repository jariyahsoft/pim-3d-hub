import { z } from 'zod'

// Review schemas
export const reviewSubjectTypeSchema = z.enum(['PROVIDER_PROFILE', 'PRODUCT'])

export const reviewStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN', 'MODERATED'])

export const reviewRatingDimensionSchema = z.enum([
  'OVERALL',
  'QUALITY',
  'COMMUNICATION',
  'DELIVERY',
  'VALUE',
])

export const ratingValueSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])

export const createReviewRequestSchema = z.object({
  approvedMediaAssetIds: z.array(z.string().uuid()).max(10).optional(),
  orderId: z.string().uuid(),
  ratings: z.object({
    OVERALL: ratingValueSchema,
    QUALITY: ratingValueSchema,
    COMMUNICATION: ratingValueSchema,
    DELIVERY: ratingValueSchema,
    VALUE: ratingValueSchema,
  }),
  reviewText: z.string().min(1).max(5000).optional(),
  subjectId: z.string().uuid(),
  subjectType: reviewSubjectTypeSchema,
})

export const updateReviewRequestSchema = z.object({
  approvedMediaAssetIds: z.array(z.string().uuid()).max(10).optional(),
  ratings: z.object({
    OVERALL: ratingValueSchema,
    QUALITY: ratingValueSchema,
    COMMUNICATION: ratingValueSchema,
    DELIVERY: ratingValueSchema,
    VALUE: ratingValueSchema,
  }).optional(),
  reviewText: z.string().min(1).max(5000).optional(),
})

export const addSellerResponseRequestSchema = z.object({
  response: z.string().min(1).max(2000),
})

export const reviewResponseSchema = z.object({
  approvedMediaAssetIds: z.array(z.string().uuid()),
  createdAt: z.string(),
  helpfulCount: z.number().int().min(0),
  id: z.string().uuid(),
  isVerifiedPurchase: z.boolean(),
  moderatedAt: z.string().nullable(),
  orderId: z.string().uuid(),
  ratings: z.object({
    OVERALL: ratingValueSchema,
    QUALITY: ratingValueSchema,
    COMMUNICATION: ratingValueSchema,
    DELIVERY: ratingValueSchema,
    VALUE: ratingValueSchema,
  }),
  reviewText: z.string().nullable(),
  reviewerUserId: z.string().uuid(),
  sellerRespondedAt: z.string().nullable(),
  sellerRespondedBy: z.string().uuid().nullable(),
  sellerResponse: z.string().nullable(),
  status: reviewStatusSchema,
  subjectId: z.string().uuid(),
  subjectType: reviewSubjectTypeSchema,
  updatedAt: z.string(),
  version: z.number().int().min(1),
})

export const ratingProjectionResponseSchema = z.object({
  averageCommunicationRating: z.number().min(0).max(5),
  averageDeliveryRating: z.number().min(0).max(5),
  averageOverallRating: z.number().min(0).max(5),
  averageQualityRating: z.number().min(0).max(5),
  averageValueRating: z.number().min(0).max(5),
  createdAt: z.string(),
  id: z.string().uuid(),
  lastReviewedAt: z.string().nullable(),
  ratingDistribution: z.object({
    1: z.number().int().min(0),
    2: z.number().int().min(0),
    3: z.number().int().min(0),
    4: z.number().int().min(0),
    5: z.number().int().min(0),
  }),
  subjectId: z.string().uuid(),
  subjectType: reviewSubjectTypeSchema,
  totalReviewCount: z.number().int().min(0),
  updatedAt: z.string(),
  verifiedReviewCount: z.number().int().min(0),
  version: z.number().int().min(1),
})

export const listReviewsQuerySchema = z.object({
  cursor: z.string().optional(),
  isVerifiedPurchase: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  sortField: z.enum(['createdAt', 'updatedAt', 'helpfulCount']).default('createdAt'),
  status: reviewStatusSchema.optional(),
  subjectId: z.string().uuid().optional(),
  subjectType: reviewSubjectTypeSchema.optional(),
})

export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>
export type UpdateReviewRequest = z.infer<typeof updateReviewRequestSchema>
export type AddSellerResponseRequest = z.infer<typeof addSellerResponseRequestSchema>
export type ReviewResponse = z.infer<typeof reviewResponseSchema>
export type RatingProjectionResponse = z.infer<typeof ratingProjectionResponseSchema>
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>
