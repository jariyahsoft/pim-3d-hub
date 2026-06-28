import { z } from 'zod'

const uuidv7Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const currencyCodePattern = /^[A-Z]{3}$/

function createApiMetaSchema() {
  return z.object({
    nextCursor: z.string().trim().min(1).nullable().optional(),
    requestId: z.string().trim().min(1),
  })
}

function createApiSuccessEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: createApiMetaSchema(),
  })
}

export const serviceRequestTypeSchema = z.enum([
  'DESIGN_ONLY',
  'PRINT_ONLY',
  'DESIGN_AND_PRINT',
])

export const serviceRequestStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED'])

export const serviceRequestVisibilitySchema = z.enum([
  'PUBLIC',
  'INVITE_ONLY',
  'PRIVATE_DIRECT',
  'ORGANIZATION_INTERNAL',
])

export const moneyMinorSchema = z.object({
  currency: z.string().trim().regex(currencyCodePattern),
  minorUnits: z.number().int().nonnegative(),
})

export const jobDiscoveryItemSchema = z.object({
  budget: moneyMinorSchema.nullable(),
  category: z.string().trim().min(1).nullable(),
  dueAt: z.string().trim().datetime({ offset: true }).nullable(),
  hasPrivateAssets: z.boolean(),
  id: z.string().trim().regex(uuidv7Pattern),
  publishedAt: z.string().trim().datetime({ offset: true }).nullable(),
  quantity: z.number().int().positive().nullable(),
  serviceRegion: z.string().trim().min(1).nullable(),
  serviceType: serviceRequestTypeSchema.nullable(),
  status: serviceRequestStatusSchema,
  title: z.string().trim().min(1).nullable(),
  visibility: serviceRequestVisibilitySchema,
})

export const discoverJobsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  cursor: z.string().trim().min(1).optional(),
  dueAtGte: z.string().trim().datetime({ offset: true }).optional(),
  dueAtLte: z.string().trim().datetime({ offset: true }).optional(),
  limit: z.number().int().positive().max(100).optional(),
  serviceRegion: z.string().trim().min(1).nullable().optional(),
  serviceType: serviceRequestTypeSchema.optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  sortField: z.enum(['publishedAt', 'dueAt', 'updatedAt']).optional(),
})

export const jobDiscoveryListResponseSchema = createApiSuccessEnvelopeSchema(
  z.object({
    items: z.array(jobDiscoveryItemSchema),
    nextCursor: z.string().trim().min(1).nullable(),
  }),
)

export const jobDiscoveryDetailResponseSchema = createApiSuccessEnvelopeSchema(
  jobDiscoveryItemSchema,
)
