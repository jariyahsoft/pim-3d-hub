import {
  AuthorizationDeniedError,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'
import {
  RepositoryConflictError,
  type UserAddressRecord,
  type UserAddressRepository,
  type UserNotificationPreferences,
  type UserPrivacyPreferences,
  type UserRecord,
  type UserRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type PublicUserProfileDto = Readonly<{
  displayName: string | null
  id: Uuidv7
  locale: string | null
  onboardingCompletedAt: UtcTimestamp | null
  onboardingRoleCode: string | null
  profileImageAssetId: Uuidv7 | null
  version: number
}>

export type PrivateUserProfileDto = Readonly<{
  countryCode: string | null
  phoneE164: string | null
}>

export type UserAddressDto = Readonly<{
  addressLine1: string
  addressLine2: string | null
  countryCode: string
  district: string
  id: Uuidv7
  isDefault: boolean
  label: string
  ownerId: Uuidv7
  ownerType: 'USER' | 'ORGANIZATION'
  phoneE164: string | null
  postalCode: string
  province: string
  recipientName: string
  status: 'ACTIVE' | 'DELETED'
  subdistrict: string
  version: number
}>

export type CurrentUserProfileDto = Readonly<{
  addresses: readonly UserAddressDto[]
  notificationPreferences: UserNotificationPreferences
  privateProfile: PrivateUserProfileDto
  privacyPreferences: UserPrivacyPreferences
  publicProfile: PublicUserProfileDto
}>

export type ProfileValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export type CompleteOnboardingInput = Readonly<{
  countryCode?: string | null | undefined
  displayName?: string | null | undefined
  expectedVersion: number
  locale?: string | null | undefined
  onboardingRoleCode?: string | null | undefined
  phoneE164?: string | null | undefined
  profileImageAssetId?: Uuidv7 | null | undefined
  userId: Uuidv7
}>

export type UpdateUserProfileInput = Readonly<{
  countryCode?: string | null | undefined
  displayName?: string | null | undefined
  expectedVersion: number
  locale?: string | null | undefined
  onboardingRoleCode?: string | null | undefined
  phoneE164?: string | null | undefined
  profileImageAssetId?: Uuidv7 | null | undefined
  userId: Uuidv7
}>

export type CreateUserAddressCommand = Readonly<{
  addressLine1: string
  addressLine2?: string | null | undefined
  countryCode: string
  district: string
  isDefault?: boolean | undefined
  label: string
  phoneE164?: string | null | undefined
  postalCode: string
  province: string
  recipientName: string
  subdistrict: string
  userId: Uuidv7
}>

export type UpdateUserAddressCommand = Readonly<{
  addressLine1: string
  addressLine2?: string | null | undefined
  countryCode: string
  district: string
  expectedVersion: number
  id: Uuidv7
  isDefault?: boolean | undefined
  label: string
  phoneE164?: string | null | undefined
  postalCode: string
  province: string
  recipientName: string
  subdistrict: string
  userId: Uuidv7
}>

export type UpdateNotificationPreferencesInput = Readonly<{
  expectedVersion: number
  marketingEmail: boolean
  marketingPush: boolean
  orderStatusEmail: boolean
  orderStatusPush: boolean
  userId: Uuidv7
}>

export type UpdatePrivacyPreferencesInput = Readonly<{
  expectedVersion: number
  publicProfileVisible: boolean
  shareAddressWithOrderParticipants: boolean
  sharePhoneWithOrderParticipants: boolean
  showProvince: boolean
  userId: Uuidv7
}>

export type UserProfileService = Readonly<{
  completeOnboarding(input: CompleteOnboardingInput): Promise<CurrentUserProfileDto>
  createAddress(input: CreateUserAddressCommand): Promise<UserAddressDto>
  deleteAddress(input: Readonly<{ expectedVersion: number; id: Uuidv7; userId: Uuidv7 }>): Promise<UserAddressDto>
  getCurrentProfile(input: Readonly<{ userId: Uuidv7 }>): Promise<CurrentUserProfileDto>
  updateAddress(input: UpdateUserAddressCommand): Promise<UserAddressDto>
  updateNotificationPreferences(
    input: UpdateNotificationPreferencesInput,
  ): Promise<CurrentUserProfileDto>
  updatePrivacyPreferences(input: UpdatePrivacyPreferencesInput): Promise<CurrentUserProfileDto>
  updateProfile(input: UpdateUserProfileInput): Promise<CurrentUserProfileDto>
}>

type Dependencies = Readonly<{
  addresses: UserAddressRepository
  clock: ClockPort
  users: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

const countryCodePattern = /^[A-Z]{2}$/
const e164Pattern = /^\+[1-9]\d{7,14}$/
const postalCodePattern = /^\d{5}$/

export const defaultNotificationPreferences: UserNotificationPreferences = Object.freeze({
  marketingEmail: false,
  marketingPush: false,
  orderStatusEmail: true,
  orderStatusPush: true,
})

export const defaultPrivacyPreferences: UserPrivacyPreferences = Object.freeze({
  publicProfileVisible: true,
  shareAddressWithOrderParticipants: true,
  sharePhoneWithOrderParticipants: false,
  showProvince: true,
})

function createValidationError(fields: readonly string[], message: string): ProfileValidationError {
  const error = new Error(message) as Error & {
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }

  Object.assign(error, {
    code: 'VALIDATION_ERROR' as const,
    fields,
    name: 'ProfileValidationError',
    status: 400 as const,
  })

  return error as ProfileValidationError
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const sanitized = sanitizeText(value)
  return sanitized.length > 0 ? sanitized : null
}

function normalizeRequiredText(value: string, field: string): string {
  const sanitized = sanitizeText(value)

  if (!sanitized) {
    throw createValidationError([field], `${field} is required`)
  }

  return sanitized
}

export function normalizeLocaleCode(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const normalized = sanitizeText(value).replace(/_/g, '-')

  if (!normalized) {
    return null
  }

  try {
    return new Intl.Locale(normalized).toString()
  } catch {
    throw createValidationError(['locale'], 'locale must be a valid BCP 47 tag')
  }
}

export function normalizeCountryCode(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const normalized = sanitizeText(value).toUpperCase()

  if (!countryCodePattern.test(normalized)) {
    throw createValidationError(['countryCode'], 'countryCode must be a valid ISO-3166 alpha-2 code')
  }

  return normalized
}

export function normalizePhoneE164(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const normalized = sanitizeText(value).replace(/\s+/g, '')

  if (!e164Pattern.test(normalized)) {
    throw createValidationError(['phoneE164'], 'phoneE164 must be in E.164 format')
  }

  return normalized
}

function normalizePostalCode(value: string): string {
  const normalized = sanitizeText(value)

  if (!postalCodePattern.test(normalized)) {
    throw createValidationError(['postalCode'], 'postalCode must contain 5 digits')
  }

  return normalized
}

function ensureActiveUser(user: UserRecord): void {
  if (user.status === 'ACTIVE') {
    return
  }

  throw new AuthorizationDeniedError()
}

function toPublicProfile(user: UserRecord): PublicUserProfileDto {
  return Object.freeze({
    displayName: user.displayName,
    id: user.id,
    locale: user.locale,
    onboardingCompletedAt: user.onboardingCompletedAt,
    onboardingRoleCode: user.onboardingRoleCode,
    profileImageAssetId: user.profileImageAssetId,
    version: user.version,
  })
}

function toPrivateProfile(user: UserRecord): PrivateUserProfileDto {
  return Object.freeze({
    countryCode: user.countryCode,
    phoneE164: user.phoneE164,
  })
}

function toAddressDto(address: UserAddressRecord): UserAddressDto {
  return Object.freeze({
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    countryCode: address.countryCode,
    district: address.district,
    id: address.id,
    isDefault: address.isDefault,
    label: address.label,
    ownerId: address.ownerId,
    ownerType: address.ownerType,
    phoneE164: address.phoneE164,
    postalCode: address.postalCode,
    province: address.province,
    recipientName: address.recipientName,
    status: address.status,
    subdistrict: address.subdistrict,
    version: address.version,
  })
}

function createCurrentUserProfileDto(
  user: UserRecord,
  addresses: readonly UserAddressRecord[],
): CurrentUserProfileDto {
  return Object.freeze({
    addresses: addresses.map((address) => toAddressDto(address)),
    notificationPreferences: user.notificationPreferences,
    privateProfile: toPrivateProfile(user),
    privacyPreferences: user.privacyPreferences,
    publicProfile: toPublicProfile(user),
  })
}

function applyUserPatch(
  user: UserRecord,
  input: Readonly<{
    countryCode?: string | null | undefined
    displayName?: string | null | undefined
    locale?: string | null | undefined
    onboardingRoleCode?: string | null | undefined
    phoneE164?: string | null | undefined
    profileImageAssetId?: Uuidv7 | null | undefined
  }>,
  timestamp: UtcTimestamp,
  options?: Readonly<{
    markOnboardingCompleted?: boolean
  }>,
): UserRecord {
  const nextDisplayName = normalizeNullableText(input.displayName)
  const nextLocale = normalizeLocaleCode(input.locale)
  const nextPhoneE164 = normalizePhoneE164(input.phoneE164)
  const nextCountryCode = normalizeCountryCode(input.countryCode)
  const nextOnboardingRoleCode = normalizeNullableText(input.onboardingRoleCode)

  return Object.freeze({
    ...user,
    countryCode: nextCountryCode === undefined ? user.countryCode : nextCountryCode,
    displayName: nextDisplayName === undefined ? user.displayName : nextDisplayName,
    locale: nextLocale === undefined ? user.locale : nextLocale,
    onboardingCompletedAt:
      options?.markOnboardingCompleted === true ? timestamp : user.onboardingCompletedAt,
    onboardingRoleCode:
      nextOnboardingRoleCode === undefined ? user.onboardingRoleCode : nextOnboardingRoleCode,
    phoneE164: nextPhoneE164 === undefined ? user.phoneE164 : nextPhoneE164,
    profileImageAssetId:
      input.profileImageAssetId === undefined ? user.profileImageAssetId : input.profileImageAssetId,
    updatedAt: timestamp,
    updatedBy: user.id,
  })
}

function requireAddressBelongsToUser(address: UserAddressRecord, userId: Uuidv7): void {
  if (address.ownerType !== 'USER' || address.ownerId !== userId) {
    throw createValidationError(['id'], 'address does not belong to the authenticated user')
  }
}

function normalizeAddressInput(
  input: Readonly<{
    addressLine1: string
    addressLine2?: string | null | undefined
    countryCode: string
    district: string
    isDefault?: boolean | undefined
    label: string
    phoneE164?: string | null | undefined
    postalCode: string
    province: string
    recipientName: string
    subdistrict: string
  }>,
): Readonly<{
  addressLine1: string
  addressLine2: string | null
  countryCode: string
  district: string
  isDefault: boolean
  label: string
  phoneE164: string | null
  postalCode: string
  province: string
  recipientName: string
  subdistrict: string
}> {
  return Object.freeze({
    addressLine1: normalizeRequiredText(input.addressLine1, 'addressLine1'),
    addressLine2: normalizeNullableText(input.addressLine2) ?? null,
    countryCode: normalizeCountryCode(input.countryCode) ?? input.countryCode.trim().toUpperCase(),
    district: normalizeRequiredText(input.district, 'district'),
    isDefault: input.isDefault ?? false,
    label: normalizeRequiredText(input.label, 'label'),
    phoneE164: normalizePhoneE164(input.phoneE164) ?? null,
    postalCode: normalizePostalCode(input.postalCode),
    province: normalizeRequiredText(input.province, 'province'),
    recipientName: normalizeRequiredText(input.recipientName, 'recipientName'),
    subdistrict: normalizeRequiredText(input.subdistrict, 'subdistrict'),
  })
}

function mergeNotificationPreferences(
  user: UserRecord,
  input: UpdateNotificationPreferencesInput,
): UserRecord {
  return Object.freeze({
    ...user,
    notificationPreferences: Object.freeze({
      marketingEmail: input.marketingEmail,
      marketingPush: input.marketingPush,
      orderStatusEmail: input.orderStatusEmail,
      orderStatusPush: input.orderStatusPush,
    }),
    updatedBy: user.id,
  })
}

function mergePrivacyPreferences(
  user: UserRecord,
  input: UpdatePrivacyPreferencesInput,
): UserRecord {
  return Object.freeze({
    ...user,
    privacyPreferences: Object.freeze({
      publicProfileVisible: input.publicProfileVisible,
      shareAddressWithOrderParticipants: input.shareAddressWithOrderParticipants,
      sharePhoneWithOrderParticipants: input.sharePhoneWithOrderParticipants,
      showProvince: input.showProvince,
    }),
    updatedBy: user.id,
  })
}

function loadAddresses(addresses: UserAddressRepository, userId: Uuidv7): Promise<readonly UserAddressRecord[]> {
  return addresses.listByOwner('USER', userId)
}

function normalizeUserPatchInput(
  input: Readonly<{
    countryCode?: string | null | undefined
    displayName?: string | null | undefined
    locale?: string | null | undefined
    onboardingRoleCode?: string | null | undefined
    phoneE164?: string | null | undefined
    profileImageAssetId?: Uuidv7 | null | undefined
  }>,
): Readonly<{
  countryCode?: string | null | undefined
  displayName?: string | null | undefined
  locale?: string | null | undefined
  onboardingRoleCode?: string | null | undefined
  phoneE164?: string | null | undefined
  profileImageAssetId?: Uuidv7 | null | undefined
}> {
  const patch: {
    countryCode?: string | null | undefined
    displayName?: string | null | undefined
    locale?: string | null | undefined
    onboardingRoleCode?: string | null | undefined
    phoneE164?: string | null | undefined
    profileImageAssetId?: Uuidv7 | null | undefined
  } = {}

  const countryCode = normalizeCountryCode(input.countryCode)
  if (countryCode !== undefined) {
    patch.countryCode = countryCode
  }

  const displayName = normalizeNullableText(input.displayName)
  if (displayName !== undefined) {
    patch.displayName = displayName
  }

  const locale = normalizeLocaleCode(input.locale)
  if (locale !== undefined) {
    patch.locale = locale
  }

  const onboardingRoleCode = normalizeNullableText(input.onboardingRoleCode)
  if (onboardingRoleCode !== undefined) {
    patch.onboardingRoleCode = onboardingRoleCode
  }

  const phoneE164 = normalizePhoneE164(input.phoneE164)
  if (phoneE164 !== undefined) {
    patch.phoneE164 = phoneE164
  }

  if (input.profileImageAssetId !== undefined) {
    patch.profileImageAssetId = input.profileImageAssetId
  }

  return Object.freeze(patch)
}

function createAddressRecord(
  input: CreateUserAddressCommand,
  addressId: Uuidv7,
  normalized: ReturnType<typeof normalizeAddressInput>,
  timestamp: UtcTimestamp,
): UserAddressRecord {
  return Object.freeze({
    addressLine1: normalized.addressLine1,
    addressLine2: normalized.addressLine2,
    countryCode: normalized.countryCode,
    createdAt: timestamp,
    createdBy: null,
    deletedAt: null,
    district: normalized.district,
    id: addressId,
    isDefault: normalized.isDefault,
    label: normalized.label,
    ownerId: input.userId,
    ownerType: 'USER',
    phoneE164: normalized.phoneE164,
    postalCode: normalized.postalCode,
    province: normalized.province,
    recipientName: normalized.recipientName,
    schemaVersion: 1,
    status: 'ACTIVE',
    subdistrict: normalized.subdistrict,
    updatedAt: timestamp,
    updatedBy: null,
    version: 1,
  })
}

export function createUserProfileService(dependencies: Dependencies): UserProfileService {
  return Object.freeze({
    async completeOnboarding(input): Promise<CurrentUserProfileDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)

      const nextUser = applyUserPatch(
        user,
        normalizeUserPatchInput(input),
        dependencies.clock.now(),
        {
          markOnboardingCompleted: true,
        },
      )

      const updatedUser = await dependencies.users.update(nextUser, input.expectedVersion)
      const addresses = await loadAddresses(dependencies.addresses, input.userId)
      return createCurrentUserProfileDto(updatedUser, addresses)
    },

    async createAddress(input): Promise<UserAddressDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)

      const normalized = normalizeAddressInput(input)
      const address = await dependencies.addresses.create(
        createAddressRecord(input, dependencies.uuidGenerator.next(), normalized, dependencies.clock.now()),
      )

      return toAddressDto(address)
    },

    async deleteAddress(input): Promise<UserAddressDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)

      const address = await dependencies.addresses.findById(input.id, { includeDeleted: true })

      if (!address) {
        throw new Error(`UserAddress ${input.id} was not found`)
      }

      requireAddressBelongsToUser(address, input.userId)

      const deleted = await dependencies.addresses.softDelete(
        input.id,
        input.expectedVersion,
        input.userId,
      )

      return toAddressDto(deleted)
    },

    async getCurrentProfile(input): Promise<CurrentUserProfileDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)
      const addresses = await loadAddresses(dependencies.addresses, input.userId)
      return createCurrentUserProfileDto(user, addresses)
    },

    async updateAddress(input): Promise<UserAddressDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)

      const existing = await dependencies.addresses.findById(input.id, { includeDeleted: true })

      if (!existing) {
        throw new Error(`UserAddress ${input.id} was not found`)
      }

      requireAddressBelongsToUser(existing, input.userId)

      const normalized = normalizeAddressInput(input)
      const nextAddress: UserAddressRecord = Object.freeze({
        ...existing,
        addressLine1: normalized.addressLine1,
        addressLine2: normalized.addressLine2,
        countryCode: normalized.countryCode,
        district: normalized.district,
        isDefault: normalized.isDefault,
        label: normalized.label,
        phoneE164: normalized.phoneE164,
        postalCode: normalized.postalCode,
        province: normalized.province,
        recipientName: normalized.recipientName,
        status: existing.status,
        subdistrict: normalized.subdistrict,
        updatedAt: dependencies.clock.now(),
        updatedBy: input.userId,
      })

      const updated = await dependencies.addresses.update(nextAddress, input.expectedVersion)
      return toAddressDto(updated)
    },

    async updateNotificationPreferences(
      input,
    ): Promise<CurrentUserProfileDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)
      const updatedUser = await dependencies.users.update(
        mergeNotificationPreferences(user, input),
        input.expectedVersion,
      )
      const addresses = await loadAddresses(dependencies.addresses, input.userId)
      return createCurrentUserProfileDto(updatedUser, addresses)
    },

    async updatePrivacyPreferences(input): Promise<CurrentUserProfileDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)
      const updatedUser = await dependencies.users.update(
        mergePrivacyPreferences(user, input),
        input.expectedVersion,
      )
      const addresses = await loadAddresses(dependencies.addresses, input.userId)
      return createCurrentUserProfileDto(updatedUser, addresses)
    },

    async updateProfile(input): Promise<CurrentUserProfileDto> {
      const user = await dependencies.users.findById(input.userId)

      if (!user) {
        throw new Error(`User ${input.userId} was not found`)
      }

      ensureActiveUser(user)

      const nextUser = applyUserPatch(
        user,
        normalizeUserPatchInput(input),
        dependencies.clock.now(),
      )

      const updatedUser = await dependencies.users.update(nextUser, input.expectedVersion)
      const addresses = await loadAddresses(dependencies.addresses, input.userId)
      return createCurrentUserProfileDto(updatedUser, addresses)
    },
  })
}

export function assertProfileVersionConflict(
  error: unknown,
): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError
}
