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

export const serviceRequestStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED'])
export const serviceRequestVisibilitySchema = z.enum([
  'PUBLIC',
  'INVITE_ONLY',
  'PRIVATE_DIRECT',
  'ORGANIZATION_INTERNAL',
])
export const serviceRequestTypeSchema = z.enum([
  'DESIGN_ONLY',
  'PRINT_ONLY',
  'DESIGN_AND_PRINT',
])

export const moneyMinorSchema = z.object({
  currency: z.string().trim().regex(currencyCodePattern),
  minorUnits: z.number().int().nonnegative(),
})

export const serviceRequestAttachmentSchema = z.object({
  assetId: z.string().trim().regex(uuidv7Pattern),
  mimeType: z.string().trim().min(1).nullable(),
  originalFilename: z.string().trim().min(1).nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
})

export const serviceRequestStatusHistorySchema = z.object({
  changedAt: z.string().trim().datetime({ offset: true }),
  changedBy: z.string().trim().regex(uuidv7Pattern).nullable(),
  fromStatus: serviceRequestStatusSchema.nullable(),
  note: z.string().trim().min(1).nullable(),
  toStatus: serviceRequestStatusSchema,
})

export const serviceRequestSchema = z.object({
  attachments: z.array(serviceRequestAttachmentSchema),
  budget: moneyMinorSchema.nullable(),
  buyerUserId: z.string().trim().regex(uuidv7Pattern),
  category: z.string().trim().min(1).nullable(),
  closedAt: z.string().trim().datetime({ offset: true }).nullable(),
  description: z.string().trim().min(1).nullable(),
  dueAt: z.string().trim().datetime({ offset: true }).nullable(),
  id: z.string().trim().regex(uuidv7Pattern),
  objective: z.string().trim().min(1).nullable(),
  organizationId: z.string().trim().regex(uuidv7Pattern).nullable(),
  prohibitedWorkAcknowledged: z.boolean(),
  publishedAt: z.string().trim().datetime({ offset: true }).nullable(),
  quantity: z.number().int().positive().nullable(),
  serviceRegion: z.string().trim().min(1).nullable(),
  serviceType: serviceRequestTypeSchema.nullable(),
  status: serviceRequestStatusSchema,
  statusHistory: z.array(serviceRequestStatusHistorySchema),
  title: z.string().trim().min(1).nullable(),
  version: z.number().int().nonnegative(),
  visibility: serviceRequestVisibilitySchema,
})

const serviceRequestDraftWriteSchema = z.object({
  attachments: z.array(serviceRequestAttachmentSchema).optional(),
  budgetCurrency: z.string().trim().regex(currencyCodePattern).nullable().optional(),
  budgetMinor: z.number().int().nonnegative().nullable().optional(),
  category: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  dueAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
  objective: z.string().trim().nullable().optional(),
  organizationId: z.string().trim().regex(uuidv7Pattern).nullable().optional(),
  prohibitedWorkAcknowledged: z.boolean().optional(),
  quantity: z.number().int().positive().nullable().optional(),
  serviceRegion: z.string().trim().nullable().optional(),
  serviceType: serviceRequestTypeSchema.nullable().optional(),
  title: z.string().trim().nullable().optional(),
  visibility: serviceRequestVisibilitySchema.optional(),
})

export const createServiceRequestDraftRequestSchema = serviceRequestDraftWriteSchema
export const updateServiceRequestDraftRequestSchema = serviceRequestDraftWriteSchema.extend({
  expectedVersion: z.number().int().nonnegative(),
})
export const publishServiceRequestRequestSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
})
export const closeServiceRequestRequestSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  note: z.string().trim().min(1).nullable().optional(),
})

export const serviceRequestResponseSchema = createApiSuccessEnvelopeSchema(serviceRequestSchema)
