import { z } from 'zod'

const uuidv7Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export const expectedVersionSchema = z.number().int().nonnegative()
export const uuidv7Schema = z.string().trim().regex(uuidv7Pattern)

export const roleCodeSchema = z.enum([
  'BUYER',
  'DESIGN_PROVIDER',
  'PRINT_PROVIDER',
  'FULL_SERVICE_PROVIDER',
  'PRODUCT_SELLER',
  'CONTENT_CREATOR',
  'SUPPORT_AGENT',
  'KYC_REVIEWER',
  'FINANCE_ADMIN',
  'MODERATOR',
  'PLATFORM_ADMIN',
])

export const roleAssignmentStatusSchema = z.enum([
  'REQUESTED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'REJECTED',
])

export const roleScopeTypeSchema = z.enum([
  'GLOBAL',
  'USER',
  'ORGANIZATION',
  'PROVIDER_PROFILE',
])

export const organizationTypeSchema = z.enum(['BUSINESS'])
export const organizationStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED'])
export const organizationMemberRoleCodeSchema = z.enum([
  'OWNER',
  'OPERATIONS_ADMIN',
  'FINANCE_ADMIN',
  'MEMBER',
])
export const organizationMembershipStatusSchema = z.enum([
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
])

export const verificationCaseStatusSchema = z.enum([
  'NOT_STARTED',
  'PENDING',
  'NEEDS_MORE_INFO',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
])

export const verificationCaseReviewDecisionSchema = z.enum([
  'NEEDS_MORE_INFO',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
])

export const verificationCaseTypeSchema = z.enum(['ROLE_KYC', 'ORGANIZATION_KYC'])
export const verificationSubjectTypeSchema = z.enum(['USER', 'ORGANIZATION'])
export const verificationDocumentSourceTypeSchema = z.enum([
  'PRIVATE_ASSET',
  'VENDOR_REFERENCE',
])

export const roleAssignmentSchema = z.object({
  id: uuidv7Schema,
  kycRequired: z.boolean(),
  roleCode: roleCodeSchema,
  scopeId: uuidv7Schema.nullable(),
  scopeType: roleScopeTypeSchema,
  status: roleAssignmentStatusSchema,
  verificationCaseId: uuidv7Schema.nullable(),
  version: z.number().int().nonnegative(),
})

export const verificationDocumentSchema = z.object({
  maskedLabel: z.string().trim().min(1),
  sourceType: verificationDocumentSourceTypeSchema,
})

export const verificationCaseSchema = z.object({
  decisionReason: z.string().trim().min(1).nullable(),
  documents: z.array(verificationDocumentSchema),
  id: uuidv7Schema,
  requestedRoleCode: roleCodeSchema.nullable(),
  resubmissionCount: z.number().int().nonnegative(),
  reviewerUserId: uuidv7Schema.nullable(),
  status: verificationCaseStatusSchema,
  subjectId: uuidv7Schema,
  subjectType: verificationSubjectTypeSchema,
  type: verificationCaseTypeSchema,
  version: z.number().int().nonnegative(),
})

export const organizationMembershipSchema = z.object({
  acceptedAt: z.string().trim().datetime({ offset: true }).nullable(),
  id: uuidv7Schema,
  invitedByUserId: uuidv7Schema,
  memberRoleCode: organizationMemberRoleCodeSchema,
  status: organizationMembershipStatusSchema,
  userId: uuidv7Schema,
  version: z.number().int().nonnegative(),
})

export const organizationSchema = z.object({
  id: uuidv7Schema,
  members: z.array(organizationMembershipSchema),
  name: z.string().trim().min(1),
  ownerUserId: uuidv7Schema,
  status: organizationStatusSchema,
  type: organizationTypeSchema,
  version: z.number().int().nonnegative(),
})

export const trustOverviewSchema = z.object({
  organizations: z.array(organizationSchema),
  roles: z.array(roleAssignmentSchema),
  verificationCases: z.array(verificationCaseSchema),
})

export const requestRoleActivationRequestSchema = z.object({
  roleCode: roleCodeSchema,
  scopeId: uuidv7Schema.nullable().optional(),
  scopeType: roleScopeTypeSchema.optional(),
})

export const verificationDocumentInputSchema = z
  .object({
    assetId: uuidv7Schema.nullable().optional(),
    maskedLabel: z.string().trim().min(1),
    sourceType: verificationDocumentSourceTypeSchema,
    vendorReference: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.sourceType === 'PRIVATE_ASSET' && value.assetId == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'assetId is required for PRIVATE_ASSET',
        path: ['assetId'],
      })
    }

    if (value.sourceType === 'VENDOR_REFERENCE' && value.vendorReference == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'vendorReference is required for VENDOR_REFERENCE',
        path: ['vendorReference'],
      })
    }
  })

export const submitVerificationCaseRequestSchema = z.object({
  documents: z.array(verificationDocumentInputSchema).min(1),
  expectedVersion: expectedVersionSchema,
})

export const reviewVerificationCaseRequestSchema = z.object({
  decision: verificationCaseReviewDecisionSchema,
  expectedVersion: expectedVersionSchema,
  reason: z.string().trim().min(1),
})

export const createOrganizationRequestSchema = z.object({
  name: z.string().trim().min(1),
})

export const inviteOrganizationMemberRequestSchema = z.object({
  memberRoleCode: organizationMemberRoleCodeSchema,
  userId: uuidv7Schema,
})

export const acceptOrganizationInvitationRequestSchema = z.object({
  expectedVersion: expectedVersionSchema,
})

export const updateOrganizationMembershipRequestSchema = z.object({
  expectedVersion: expectedVersionSchema,
  memberRoleCode: organizationMemberRoleCodeSchema.optional(),
  reason: z.string().trim().min(1),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']).optional(),
})

export const roleAssignmentResponseSchema = createApiSuccessEnvelopeSchema(roleAssignmentSchema)
export const verificationCaseResponseSchema = createApiSuccessEnvelopeSchema(verificationCaseSchema)
export const organizationResponseSchema = createApiSuccessEnvelopeSchema(organizationSchema)
export const organizationMembershipResponseSchema =
  createApiSuccessEnvelopeSchema(organizationMembershipSchema)
export const trustOverviewResponseSchema = createApiSuccessEnvelopeSchema(trustOverviewSchema)
