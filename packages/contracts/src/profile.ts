import { z } from 'zod'

const uuidv7Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const localePattern = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/
const countryCodePattern = /^[A-Z]{2}$/
const phoneE164Pattern = /^\+[1-9]\d{7,14}$/
const postalCodePattern = /^\d{5}$/

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
export const localeCodeSchema = z.string().trim().regex(localePattern)
export const countryCodeSchema = z.string().trim().regex(countryCodePattern)
export const phoneE164Schema = z.string().trim().regex(phoneE164Pattern)
export const postalCodeSchema = z.string().trim().regex(postalCodePattern)
export const optionalUuidv7Schema = uuidv7Schema.nullable().optional()

export const notificationPreferencesSchema = z.object({
  marketingEmail: z.boolean(),
  marketingPush: z.boolean(),
  orderStatusEmail: z.boolean(),
  orderStatusPush: z.boolean(),
})

export const privacyPreferencesSchema = z.object({
  publicProfileVisible: z.boolean(),
  shareAddressWithOrderParticipants: z.boolean(),
  sharePhoneWithOrderParticipants: z.boolean(),
  showProvince: z.boolean(),
})

export const publicUserProfileSchema = z.object({
  displayName: z.string().trim().min(1).nullable(),
  id: uuidv7Schema,
  locale: localeCodeSchema.nullable(),
  onboardingCompletedAt: z.string().trim().datetime({ offset: true }).nullable(),
  onboardingRoleCode: z.string().trim().min(1).nullable(),
  profileImageAssetId: optionalUuidv7Schema,
  version: z.number().int().nonnegative(),
})

export const privateUserProfileSchema = z.object({
  countryCode: countryCodeSchema.nullable(),
  phoneE164: phoneE164Schema.nullable(),
})

export const userAddressSchema = z.object({
  addressLine1: z.string().trim().min(1),
  addressLine2: z.string().trim().min(1).nullable(),
  countryCode: countryCodeSchema,
  district: z.string().trim().min(1),
  id: uuidv7Schema,
  isDefault: z.boolean(),
  label: z.string().trim().min(1),
  ownerId: uuidv7Schema,
  ownerType: z.enum(['USER', 'ORGANIZATION']),
  phoneE164: phoneE164Schema.nullable(),
  postalCode: postalCodeSchema,
  province: z.string().trim().min(1),
  recipientName: z.string().trim().min(1),
  status: z.enum(['ACTIVE', 'DELETED']),
  subdistrict: z.string().trim().min(1),
  version: z.number().int().nonnegative(),
})

export const currentUserProfileSchema = z.object({
  addresses: z.array(userAddressSchema),
  notificationPreferences: notificationPreferencesSchema,
  privateProfile: privateUserProfileSchema,
  privacyPreferences: privacyPreferencesSchema,
  publicProfile: publicUserProfileSchema,
})

export const userAddressListDataSchema = z.object({
  items: z.array(userAddressSchema),
})

export const onboardingRequestSchema = z.object({
  countryCode: countryCodeSchema.nullable().optional(),
  displayName: z.string().trim().min(1).nullable().optional(),
  expectedVersion: expectedVersionSchema,
  locale: localeCodeSchema.nullable().optional(),
  onboardingRoleCode: z.string().trim().min(1).nullable().optional(),
  phoneE164: phoneE164Schema.nullable().optional(),
  profileImageAssetId: optionalUuidv7Schema,
})

export const updateCurrentUserProfileRequestSchema = onboardingRequestSchema.extend({
  expectedVersion: expectedVersionSchema,
})

export const createUserAddressRequestSchema = z.object({
  addressLine1: z.string().trim().min(1),
  addressLine2: z.string().trim().min(1).nullable().optional(),
  countryCode: countryCodeSchema,
  district: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
  label: z.string().trim().min(1),
  phoneE164: phoneE164Schema.nullable().optional(),
  postalCode: postalCodeSchema,
  province: z.string().trim().min(1),
  recipientName: z.string().trim().min(1),
  subdistrict: z.string().trim().min(1),
})

export const updateUserAddressRequestSchema = createUserAddressRequestSchema.extend({
  expectedVersion: expectedVersionSchema,
})

export const updateNotificationPreferencesRequestSchema = z.object({
  expectedVersion: expectedVersionSchema,
  marketingEmail: z.boolean(),
  marketingPush: z.boolean(),
  orderStatusEmail: z.boolean(),
  orderStatusPush: z.boolean(),
})

export const updatePrivacyPreferencesRequestSchema = z.object({
  expectedVersion: expectedVersionSchema,
  publicProfileVisible: z.boolean(),
  shareAddressWithOrderParticipants: z.boolean(),
  sharePhoneWithOrderParticipants: z.boolean(),
  showProvince: z.boolean(),
})

export const onboardingResponseSchema = createApiSuccessEnvelopeSchema(currentUserProfileSchema)
export const currentUserProfileResponseSchema = createApiSuccessEnvelopeSchema(currentUserProfileSchema)
export const userAddressResponseSchema = createApiSuccessEnvelopeSchema(userAddressSchema)
export const userAddressListResponseSchema = createApiSuccessEnvelopeSchema(userAddressListDataSchema)
