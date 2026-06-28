import { z } from 'zod'
import { publicProviderProfileSchema } from './provider.js'

const rfc3339UtcPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

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

const rfc3339UtcSchema = z.string().trim().regex(rfc3339UtcPattern)

export const capacitySlotStatusSchema = z.enum(['OPEN', 'PAUSED', 'CLOSED'])
export const capacityClosureStatusSchema = z.enum(['ACTIVE', 'RELEASED'])
export const capacityReservationStatusSchema = z.enum(['ACTIVE', 'RELEASED', 'EXPIRED'])
export const capacityReservationReleaseReasonSchema = z.enum(['MANUAL', 'EXPIRED', 'CANCELLED'])
export const capacityReservationManualReleaseReasonSchema = z.enum(['MANUAL', 'CANCELLED'])

export const capacitySlotSchema = z.object({
  endsAt: rfc3339UtcSchema,
  id: z.string().trim().min(1),
  printerId: z.string().trim().min(1),
  providerProfileId: z.string().trim().min(1),
  reservedUnits: z.number().int().nonnegative(),
  startsAt: rfc3339UtcSchema,
  status: capacitySlotStatusSchema,
  totalUnits: z.number().int().positive(),
  version: z.number().int().nonnegative(),
})

export const capacityClosureSchema = z.object({
  endsAt: rfc3339UtcSchema,
  id: z.string().trim().min(1),
  printerId: z.string().trim().min(1),
  providerProfileId: z.string().trim().min(1),
  reason: z.string().trim().min(1).nullable(),
  releasedAt: rfc3339UtcSchema.nullable(),
  slotId: z.string().trim().min(1),
  startsAt: rfc3339UtcSchema,
  status: capacityClosureStatusSchema,
  version: z.number().int().nonnegative(),
})

export const capacityReservationSchema = z.object({
  expiresAt: rfc3339UtcSchema,
  id: z.string().trim().min(1),
  printerId: z.string().trim().min(1),
  providerProfileId: z.string().trim().min(1),
  providerServiceId: z.string().trim().min(1),
  releaseReason: capacityReservationReleaseReasonSchema.nullable(),
  releasedAt: rfc3339UtcSchema.nullable(),
  slotId: z.string().trim().min(1),
  status: capacityReservationStatusSchema,
  units: z.number().int().positive(),
  version: z.number().int().nonnegative(),
})

export const capacityWorkspaceSchema = z.object({
  closures: z.array(capacityClosureSchema),
  profile: publicProviderProfileSchema,
  reservations: z.array(capacityReservationSchema),
  slots: z.array(capacitySlotSchema),
})

export const createCapacitySlotRequestSchema = z.object({
  endsAt: rfc3339UtcSchema,
  printerId: z.string().trim().min(1),
  providerProfileId: z.string().trim().min(1),
  startsAt: rfc3339UtcSchema,
  status: z.enum(['OPEN', 'PAUSED']).optional(),
  totalUnits: z.number().int().positive(),
})

export const updateCapacitySlotRequestSchema = z.object({
  endsAt: rfc3339UtcSchema.optional(),
  expectedVersion: z.number().int().nonnegative(),
  status: z.enum(['OPEN', 'PAUSED']).optional(),
  totalUnits: z.number().int().positive().optional(),
})

export const closeCapacitySlotRequestSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).nullable().optional(),
})

export const reopenCapacitySlotRequestSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
})

export const reserveCapacityRequestSchema = z.object({
  expiresAt: rfc3339UtcSchema,
  idempotencyKey: z.string().trim().min(1),
  providerServiceId: z.string().trim().min(1),
  units: z.number().int().positive(),
})

export const releaseCapacityReservationRequestSchema = z.object({
  reason: capacityReservationManualReleaseReasonSchema.optional(),
})

export const capacitySlotResponseSchema = createApiSuccessEnvelopeSchema(capacitySlotSchema)
export const capacityClosureResponseSchema = createApiSuccessEnvelopeSchema(capacityClosureSchema)
export const capacityReservationResponseSchema =
  createApiSuccessEnvelopeSchema(capacityReservationSchema)
export const capacityWorkspaceResponseSchema =
  createApiSuccessEnvelopeSchema(capacityWorkspaceSchema)
export const capacitySlotChangeResponseSchema = createApiSuccessEnvelopeSchema(
  z.object({
    closure: capacityClosureSchema,
    slot: capacitySlotSchema,
  }),
)
