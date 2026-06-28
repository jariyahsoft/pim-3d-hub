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

export const fileAssetVisibilitySchema = z.enum([
  'PRIVATE',
  'ORDER_PARTICIPANTS',
  'ORGANIZATION',
  'PUBLIC_PREVIEW',
])
export const fileAssetStatusSchema = z.enum([
  'PENDING_UPLOAD',
  'UPLOADED',
  'QUARANTINED',
  'SCANNING',
  'READY',
  'REJECTED',
  'DELETED',
])
export const fileAssetGrantContextTypeSchema = z.enum([
  'SERVICE_REQUEST_INVITE',
  'PROPOSAL_REVIEW',
  'ORDER_PARTICIPANT',
  'STAFF_AUDIT',
])
export const fileAssetGrantPermissionCodeSchema = z.enum(['READ'])

export const fileAssetAccessGrantSchema = z.object({
  assetId: z.string().trim().regex(uuidv7Pattern),
  contextId: z.string().trim().regex(uuidv7Pattern),
  contextType: fileAssetGrantContextTypeSchema,
  expiresAt: z.string().trim().datetime({ offset: true }),
  grantedByUserId: z.string().trim().regex(uuidv7Pattern),
  granteeUserId: z.string().trim().regex(uuidv7Pattern),
  id: z.string().trim().regex(uuidv7Pattern),
  permissionCode: fileAssetGrantPermissionCodeSchema,
  revokedAt: z.string().trim().datetime({ offset: true }).nullable(),
  revokedReason: z.string().trim().min(1).nullable(),
  version: z.number().int().nonnegative(),
})

export const createFileAssetAccessGrantRequestSchema = z.object({
  contextId: z.string().trim().regex(uuidv7Pattern),
  contextType: fileAssetGrantContextTypeSchema,
  expiresAt: z.string().trim().datetime({ offset: true }),
  granteeUserId: z.string().trim().regex(uuidv7Pattern),
  permissionCode: fileAssetGrantPermissionCodeSchema.optional(),
})

export const fileAssetDownloadAccessSchema = z.object({
  assetId: z.string().trim().regex(uuidv7Pattern),
  downloadUrl: z.string().trim().url(),
  expiresAt: z.string().trim().datetime({ offset: true }),
})

export const fileAssetAccessGrantResponseSchema = createApiSuccessEnvelopeSchema(
  fileAssetAccessGrantSchema,
)
export const fileAssetDownloadAccessResponseSchema = createApiSuccessEnvelopeSchema(
  fileAssetDownloadAccessSchema,
)
