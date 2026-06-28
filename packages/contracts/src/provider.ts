import { z } from 'zod'

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

export const providerProfileStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SUSPENDED'])
export const providerServiceStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SUSPENDED'])
export const providerServiceTypeSchema = z.enum([
  'DESIGN_ONLY',
  'PRINT_ONLY',
  'DESIGN_AND_PRINT',
])

export const publicProviderProfileSchema = z.object({
  id: z.string().trim().min(1),
  publicName: z.string().trim().min(1),
  serviceRegion: z.string().trim().min(1).nullable(),
  status: providerProfileStatusSchema,
  version: z.number().int().nonnegative(),
})

export const providerServiceSchema = z.object({
  id: z.string().trim().min(1),
  instantOrderEnabled: z.boolean(),
  leadTimeDays: z.number().int().positive(),
  providerProfileId: z.string().trim().min(1),
  serviceDescription: z.string().trim().min(1),
  serviceName: z.string().trim().min(1),
  serviceRegion: z.string().trim().min(1).nullable(),
  serviceType: providerServiceTypeSchema,
  status: providerServiceStatusSchema,
  version: z.number().int().nonnegative(),
})

export const providerWorkspaceSchema = z.object({
  profile: publicProviderProfileSchema,
  services: z.array(providerServiceSchema),
})

export const providerOnboardingStepCodeSchema = z.enum([
  'PROFILE',
  'SERVICES',
  'VERIFICATION',
  'PRINTER_SETUP',
  'MATERIAL_STOCK',
  'CAPACITY',
])

export const providerOnboardingStepStatusSchema = z.enum([
  'COMPLETE',
  'ACTION_REQUIRED',
  'OPTIONAL',
])

export const providerOnboardingStepSchema = z.object({
  code: providerOnboardingStepCodeSchema,
  detail: z.string().trim().min(1),
  label: z.string().trim().min(1),
  required: z.boolean(),
  status: providerOnboardingStepStatusSchema,
})

export const providerOnboardingOverviewSchema = z.object({
  approvedBadge: z.boolean(),
  canPublishDesignOnly: z.boolean(),
  canPublishInstantPrint: z.boolean(),
  profile: publicProviderProfileSchema,
  services: z.array(providerServiceSchema),
  steps: z.array(providerOnboardingStepSchema),
})

export const providerTrustProjectionSchema = z.object({
  completedJobsCount: z.number().int().nonnegative(),
  lowSampleSize: z.boolean(),
  onTimeRatePercent: z.number().int().min(0).max(100).nullable(),
  ratingAverage: z.number().min(1).max(5).nullable(),
  ratingCount: z.number().int().nonnegative(),
  sponsored: z.boolean(),
})

export const publicProviderCardSchema = z.object({
  approvedBadge: z.boolean(),
  id: z.string().trim().min(1),
  leadTimeDaysMin: z.number().int().positive().nullable(),
  lowSampleSize: z.boolean(),
  onTimeRatePercent: z.number().int().min(0).max(100).nullable(),
  portfolioPlaceholders: z.array(z.string().trim().min(1)),
  publicName: z.string().trim().min(1),
  ratingAverage: z.number().min(1).max(5).nullable(),
  ratingCount: z.number().int().nonnegative(),
  serviceRegion: z.string().trim().min(1).nullable(),
  serviceTypes: z.array(providerServiceTypeSchema),
  sponsored: z.boolean(),
  status: providerProfileStatusSchema,
})

export const createProviderProfileRequestSchema = z.object({
  publicName: z.string().trim().min(1),
  serviceRegion: z.string().trim().min(1).nullable().optional(),
  status: providerProfileStatusSchema.optional(),
})

export const updateProviderProfileRequestSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  publicName: z.string().trim().min(1).optional(),
  serviceRegion: z.string().trim().min(1).nullable().optional(),
  status: providerProfileStatusSchema.optional(),
})

export const createProviderServiceRequestSchema = z.object({
  instantOrderEnabled: z.boolean().optional(),
  leadTimeDays: z.number().int().positive(),
  providerProfileId: z.string().trim().min(1),
  serviceDescription: z.string().trim().min(1),
  serviceName: z.string().trim().min(1),
  serviceRegion: z.string().trim().min(1).nullable().optional(),
  serviceType: providerServiceTypeSchema,
  status: providerServiceStatusSchema.optional(),
})

export const updateProviderServiceRequestSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  instantOrderEnabled: z.boolean().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  serviceDescription: z.string().trim().min(1).optional(),
  serviceName: z.string().trim().min(1).optional(),
  serviceRegion: z.string().trim().min(1).nullable().optional(),
  status: providerServiceStatusSchema.optional(),
})

export const publicProviderProfileResponseSchema =
  createApiSuccessEnvelopeSchema(publicProviderProfileSchema)
export const providerServiceResponseSchema = createApiSuccessEnvelopeSchema(providerServiceSchema)
export const providerWorkspaceResponseSchema = createApiSuccessEnvelopeSchema(providerWorkspaceSchema)
export const providerOnboardingOverviewResponseSchema =
  createApiSuccessEnvelopeSchema(providerOnboardingOverviewSchema)
export const publicProviderCardResponseSchema =
  createApiSuccessEnvelopeSchema(publicProviderCardSchema)
