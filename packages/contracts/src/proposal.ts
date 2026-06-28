import { z } from 'zod'

const uuidv7Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const currencyCodePattern = /^[A-Z]{3}$/

export const uuidv7Schema = z.string().trim().regex(uuidv7Pattern)
export const currencyCodeSchema = z.string().trim().regex(currencyCodePattern)
export const utcTimestampSchema = z.string().trim().datetime({ offset: true })

export const moneyMinorSchema = z.object({
  currency: currencyCodeSchema,
  minorUnits: z.number().int().nonnegative(),
})

export const proposalStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'REVISED',
  'WITHDRAWN',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
])

export const proposalLineItemSchema = z.object({
  amount: moneyMinorSchema,
  description: z.string().min(1).max(1000),
  itemType: z.enum(['SERVICE', 'MATERIAL', 'SHIPPING', 'OTHER']),
  quantity: z.number().int().positive(),
})

export const proposalMilestoneSchema = z.object({
  id: uuidv7Schema,
  sequence: z.number().int().positive(),
  title: z.string().min(1).max(200),
  amount: moneyMinorSchema,
  deliverableDescription: z.string().min(1).max(2000).nullable(),
  dueOffsetDays: z.number().int().nonnegative().nullable(),
})

export const proposalResponseSchema = z.object({
  id: uuidv7Schema,
  serviceRequestId: uuidv7Schema,
  providerProfileId: uuidv7Schema,
  status: proposalStatusSchema,
  revisionNumber: z.number().int().positive(),
  currency: currencyCodeSchema,
  totalAmount: moneyMinorSchema,
  lineItems: z.array(proposalLineItemSchema).min(1),
  milestones: z.array(proposalMilestoneSchema),
  notes: z.string().max(5000).nullable(),
  exclusions: z.string().max(5000).nullable(),
  validUntil: utcTimestampSchema.nullable(),
  submittedAt: utcTimestampSchema.nullable(),
  expiresAt: utcTimestampSchema.nullable(),
  version: z.number().int().positive(),
})

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

export const proposalDetailEnvelopeSchema =
  createApiSuccessEnvelopeSchema(proposalResponseSchema)

export const proposalListEnvelopeSchema = createApiSuccessEnvelopeSchema(
  z.array(proposalResponseSchema),
)

export const submitProposalRequestSchema = z.object({
  serviceRequestId: uuidv7Schema,
  providerProfileId: uuidv7Schema,
  currency: currencyCodeSchema,
  lineItems: z.array(proposalLineItemSchema).min(1),
  milestones: z
    .array(
      z.object({
        sequence: z.number().int().positive(),
        title: z.string().min(1).max(200),
        amount: moneyMinorSchema,
        deliverableDescription: z.string().min(1).max(2000).nullable().optional(),
        dueOffsetDays: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .optional(),
  notes: z.string().max(5000).nullable().optional(),
  exclusions: z.string().max(5000).nullable().optional(),
  validUntil: utcTimestampSchema.nullable().optional(),
})

export const reviseProposalRequestSchema = z.object({
  currency: currencyCodeSchema,
  lineItems: z.array(proposalLineItemSchema).min(1),
  milestones: z
    .array(
      z.object({
        sequence: z.number().int().positive(),
        title: z.string().min(1).max(200),
        amount: moneyMinorSchema,
        deliverableDescription: z.string().min(1).max(2000).nullable().optional(),
        dueOffsetDays: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .optional(),
  notes: z.string().max(5000).nullable().optional(),
  exclusions: z.string().max(5000).nullable().optional(),
  validUntil: utcTimestampSchema.nullable().optional(),
  expectedVersion: z.number().int().positive(),
})

export const withdrawProposalRequestSchema = z.object({
  expectedVersion: z.number().int().positive(),
})

export const listProposalsQuerySchema = z.object({
  serviceRequestId: uuidv7Schema.optional(),
  providerProfileId: uuidv7Schema.optional(),
  status: proposalStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortField: z.enum(['createdAt', 'updatedAt', 'submittedAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
})

export type ProposalLineItem = z.infer<typeof proposalLineItemSchema>
export type ProposalMilestone = z.infer<typeof proposalMilestoneSchema>
export type Proposal = z.infer<typeof proposalResponseSchema>
export type SubmitProposalRequest = z.infer<typeof submitProposalRequestSchema>
export type ReviseProposalRequest = z.infer<typeof reviseProposalRequestSchema>
export type WithdrawProposalRequest = z.infer<typeof withdrawProposalRequestSchema>
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>
export type ProposalDetailEnvelope = z.infer<typeof proposalDetailEnvelopeSchema>
export type ProposalListEnvelope = z.infer<typeof proposalListEnvelopeSchema>
