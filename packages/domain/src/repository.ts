import type { UtcTimestamp, Uuidv7 } from './index.js'

export type SortDirection = 'asc' | 'desc'

export type RepositoryCursor = string

export type RepositoryListRequest<TFilter, TSortField extends string> = Readonly<{
  cursor?: RepositoryCursor
  filter?: TFilter
  includeDeleted?: boolean
  limit: number
  sort: Readonly<{
    direction: SortDirection
    field: TSortField
  }>
}>

export type RepositoryListPage<TEntity> = Readonly<{
  items: readonly TEntity[]
  nextCursor: RepositoryCursor | null
}>

export type CanonicalRecord = Readonly<{
  createdAt: UtcTimestamp
  createdBy?: Uuidv7 | null
  deletedAt: UtcTimestamp | null
  id: Uuidv7
  schemaVersion: number
  updatedAt: UtcTimestamp
  updatedBy?: Uuidv7 | null
  version: number
}>

export class RepositoryConflictError extends Error {
  readonly actualVersion: number
  readonly code = 'RESOURCE_VERSION_CONFLICT'
  readonly entityId: Uuidv7
  readonly entityName: string
  readonly expectedVersion: number

  constructor(input: {
    actualVersion: number
    entityId: Uuidv7
    entityName: string
    expectedVersion: number
  }) {
    super(
      `${input.entityName} ${input.entityId} version conflict: expected ${input.expectedVersion}, received ${input.actualVersion}`,
    )
    this.name = 'RepositoryConflictError'
    this.entityName = input.entityName
    this.entityId = input.entityId
    this.expectedVersion = input.expectedVersion
    this.actualVersion = input.actualVersion
  }
}

export class RepositoryUniqueConstraintError extends Error {
  readonly code = 'UNIQUE_CONSTRAINT_VIOLATION'
  readonly constraintName: string
  readonly entityName: string

  constructor(input: {
    constraintName: string
    entityName: string
    value: string
  }) {
    super(
      `${input.entityName} violates unique constraint ${input.constraintName}: ${input.value}`,
    )
    this.name = 'RepositoryUniqueConstraintError'
    this.entityName = input.entityName
    this.constraintName = input.constraintName
  }
}

export const providerProfileStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'SUSPENDED'] as const
export const providerServiceStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'SUSPENDED'] as const
export const providerServiceTypes = [
  'DESIGN_ONLY',
  'PRINT_ONLY',
  'DESIGN_AND_PRINT',
] as const
export const userStatuses = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const
export const identityProviders = ['firebase'] as const
export const addressOwnerTypes = ['USER', 'ORGANIZATION'] as const
export const roleCodes = [
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
] as const
export const roleAssignmentStatuses = [
  'REQUESTED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'REJECTED',
] as const
export const roleScopeTypes = ['GLOBAL', 'USER', 'ORGANIZATION', 'PROVIDER_PROFILE'] as const
export const organizationTypes = ['BUSINESS'] as const
export const organizationStatuses = ['ACTIVE', 'SUSPENDED', 'REVOKED'] as const
export const organizationMemberRoleCodes = [
  'OWNER',
  'OPERATIONS_ADMIN',
  'FINANCE_ADMIN',
  'MEMBER',
] as const
export const organizationMembershipStatuses = [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
] as const
export const verificationSubjectTypes = ['USER', 'ORGANIZATION'] as const
export const verificationCaseTypes = ['ROLE_KYC', 'ORGANIZATION_KYC'] as const
export const verificationCaseStatuses = [
  'NOT_STARTED',
  'PENDING',
  'NEEDS_MORE_INFO',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
] as const
export const verificationDocumentSourceTypes = ['PRIVATE_ASSET', 'VENDOR_REFERENCE'] as const

export type ProviderProfileStatus = (typeof providerProfileStatuses)[number]
export type ProviderServiceStatus = (typeof providerServiceStatuses)[number]
export type ProviderServiceType = (typeof providerServiceTypes)[number]
export type ProviderProfileSortField = 'createdAt' | 'updatedAt'
export type ProviderServiceSortField = 'createdAt' | 'updatedAt'
export type UserStatus = (typeof userStatuses)[number]
export type IdentityProvider = (typeof identityProviders)[number]
export type AddressOwnerType = (typeof addressOwnerTypes)[number]
export type RoleCode = (typeof roleCodes)[number]
export type RoleAssignmentStatus = (typeof roleAssignmentStatuses)[number]
export type RoleScopeType = (typeof roleScopeTypes)[number]
export type OrganizationType = (typeof organizationTypes)[number]
export type OrganizationStatus = (typeof organizationStatuses)[number]
export type OrganizationMemberRoleCode = (typeof organizationMemberRoleCodes)[number]
export type OrganizationMembershipStatus = (typeof organizationMembershipStatuses)[number]
export type VerificationSubjectType = (typeof verificationSubjectTypes)[number]
export type VerificationCaseType = (typeof verificationCaseTypes)[number]
export type VerificationCaseStatus = (typeof verificationCaseStatuses)[number]
export type VerificationDocumentSourceType = (typeof verificationDocumentSourceTypes)[number]

export type UserNotificationPreferences = Readonly<{
  marketingEmail: boolean
  marketingPush: boolean
  orderStatusEmail: boolean
  orderStatusPush: boolean
}>

export type UserPrivacyPreferences = Readonly<{
  publicProfileVisible: boolean
  shareAddressWithOrderParticipants: boolean
  sharePhoneWithOrderParticipants: boolean
  showProvince: boolean
}>

export type ProviderProfileRecord = Readonly<
  CanonicalRecord & {
    ownerUserId: Uuidv7
    publicName: string
    serviceRegion: string | null
    status: ProviderProfileStatus
  }
>

export type CreateProviderProfileInput = Readonly<{
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  ownerUserId: Uuidv7
  publicName: string
  serviceRegion?: string | null
  status?: ProviderProfileStatus
  updatedBy?: Uuidv7 | null
}>

export type ProviderProfileFilter = Readonly<{
  ownerUserId?: Uuidv7
  serviceRegion?: string | null
  status?: ProviderProfileStatus
}>

export type ProviderServiceRecord = Readonly<
  CanonicalRecord & {
    instantOrderEnabled: boolean
    leadTimeDays: number
    providerProfileId: Uuidv7
    serviceDescription: string
    serviceName: string
    serviceRegion: string | null
    serviceType: ProviderServiceType
    status: ProviderServiceStatus
  }
>

export type CreateProviderServiceInput = Readonly<{
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  instantOrderEnabled?: boolean
  leadTimeDays: number
  providerProfileId: Uuidv7
  serviceDescription: string
  serviceName: string
  serviceRegion?: string | null
  serviceType: ProviderServiceType
  status?: ProviderServiceStatus
  updatedBy?: Uuidv7 | null
}>

export type ProviderServiceFilter = Readonly<{
  providerProfileId?: Uuidv7
  serviceType?: ProviderServiceType
  status?: ProviderServiceStatus
}>

export type UserRecord = Readonly<
  CanonicalRecord & {
    displayName: string | null
    countryCode: string | null
    onboardingCompletedAt: UtcTimestamp | null
    onboardingRoleCode: string | null
    locale: string | null
    phoneE164: string | null
    profileImageAssetId: Uuidv7 | null
    notificationPreferences: UserNotificationPreferences
    privacyPreferences: UserPrivacyPreferences
    status: UserStatus
  }
>

export type CreateUserInput = Readonly<{
  createdBy?: Uuidv7 | null
  displayName?: string | null
  countryCode?: string | null
  onboardingCompletedAt?: UtcTimestamp | null
  onboardingRoleCode?: string | null
  id?: Uuidv7
  locale?: string | null
  phoneE164?: string | null
  profileImageAssetId?: Uuidv7 | null
  notificationPreferences?: UserNotificationPreferences
  privacyPreferences?: UserPrivacyPreferences
  status?: UserStatus
  updatedBy?: Uuidv7 | null
}>

export type UserAddressRecord = Readonly<
  CanonicalRecord & {
    addressLine1: string
    addressLine2: string | null
    countryCode: string
    district: string
    isDefault: boolean
    label: string
    ownerId: Uuidv7
    ownerType: AddressOwnerType
    postalCode: string
    province: string
    recipientName: string
    phoneE164: string | null
    status: 'ACTIVE' | 'DELETED'
    subdistrict: string
  }
>

export type CreateUserAddressInput = Readonly<{
  addressLine1: string
  addressLine2?: string | null
  createdBy?: Uuidv7 | null
  countryCode: string
  district: string
  id?: Uuidv7
  isDefault?: boolean
  label: string
  ownerId: Uuidv7
  ownerType?: AddressOwnerType
  phoneE164?: string | null
  postalCode: string
  province: string
  recipientName: string
  subdistrict: string
  status?: 'ACTIVE' | 'DELETED'
  updatedBy?: Uuidv7 | null
}>

export type UserIdentityRecord = Readonly<
  CanonicalRecord & {
    emailNormalized: string | null
    emailVerified: boolean
    provider: IdentityProvider
    providerSubject: string
    userId: Uuidv7
  }
>

export type CreateUserIdentityInput = Readonly<{
  createdBy?: Uuidv7 | null
  emailNormalized?: string | null
  emailVerified: boolean
  id?: Uuidv7
  provider: IdentityProvider
  providerSubject: string
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
}>

export type UserRoleRecord = Readonly<
  CanonicalRecord & {
    activatedAt: UtcTimestamp | null
    deactivatedAt: UtcTimestamp | null
    kycRequired: boolean
    requestedAt: UtcTimestamp
    roleCode: RoleCode
    scopeId: Uuidv7 | null
    scopeType: RoleScopeType
    status: RoleAssignmentStatus
    userId: Uuidv7
    verificationCaseId: Uuidv7 | null
  }
>

export type CreateUserRoleInput = Readonly<{
  activatedAt?: UtcTimestamp | null
  createdBy?: Uuidv7 | null
  deactivatedAt?: UtcTimestamp | null
  id?: Uuidv7
  kycRequired?: boolean
  requestedAt?: UtcTimestamp
  roleCode: RoleCode
  scopeId?: Uuidv7 | null
  scopeType?: RoleScopeType
  status?: RoleAssignmentStatus
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
  verificationCaseId?: Uuidv7 | null
}>

export type OrganizationRecord = Readonly<
  CanonicalRecord & {
    name: string
    ownerUserId: Uuidv7
    status: OrganizationStatus
    type: OrganizationType
  }
>

export type CreateOrganizationInput = Readonly<{
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  name: string
  ownerUserId: Uuidv7
  status?: OrganizationStatus
  type?: OrganizationType
  updatedBy?: Uuidv7 | null
}>

export type OrganizationMembershipRecord = Readonly<
  CanonicalRecord & {
    acceptedAt: UtcTimestamp | null
    invitedByUserId: Uuidv7
    memberRoleCode: OrganizationMemberRoleCode
    organizationId: Uuidv7
    status: OrganizationMembershipStatus
    userId: Uuidv7
  }
>

export type CreateOrganizationMembershipInput = Readonly<{
  acceptedAt?: UtcTimestamp | null
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  invitedByUserId: Uuidv7
  memberRoleCode: OrganizationMemberRoleCode
  organizationId: Uuidv7
  status?: OrganizationMembershipStatus
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
}>

export type VerificationDocumentReference = Readonly<{
  assetId: Uuidv7 | null
  maskedLabel: string
  sourceType: VerificationDocumentSourceType
  vendorReference: string | null
}>

export type VerificationCaseRecord = Readonly<
  CanonicalRecord & {
    decisionReason: string | null
    documents: readonly VerificationDocumentReference[]
    requestedRoleCode: RoleCode | null
    resubmissionCount: number
    reviewerUserId: Uuidv7 | null
    status: VerificationCaseStatus
    subjectId: Uuidv7
    subjectType: VerificationSubjectType
    type: VerificationCaseType
  }
>

export type CreateVerificationCaseInput = Readonly<{
  createdBy?: Uuidv7 | null
  decisionReason?: string | null
  documents?: readonly VerificationDocumentReference[]
  id?: Uuidv7
  requestedRoleCode?: RoleCode | null
  resubmissionCount?: number
  reviewerUserId?: Uuidv7 | null
  status?: VerificationCaseStatus
  subjectId: Uuidv7
  subjectType: VerificationSubjectType
  type: VerificationCaseType
  updatedBy?: Uuidv7 | null
}>

export type ProviderProfileRepository = Readonly<{
  create(input: CreateProviderProfileInput): Promise<ProviderProfileRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<ProviderProfileRecord | null>
  findByOwnerUserId(
    ownerUserId: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<ProviderProfileRecord | null>
  list(
    request: RepositoryListRequest<ProviderProfileFilter, ProviderProfileSortField>,
  ): Promise<RepositoryListPage<ProviderProfileRecord>>
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<ProviderProfileRecord>
  update(
    profile: ProviderProfileRecord,
    expectedVersion: number,
  ): Promise<ProviderProfileRecord>
}>

export type ProviderServiceRepository = Readonly<{
  create(input: CreateProviderServiceInput): Promise<ProviderServiceRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<ProviderServiceRecord | null>
  findByProviderProfileAndType(
    providerProfileId: Uuidv7,
    serviceType: ProviderServiceType,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<ProviderServiceRecord | null>
  list(
    request: RepositoryListRequest<ProviderServiceFilter, ProviderServiceSortField>,
  ): Promise<RepositoryListPage<ProviderServiceRecord>>
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<ProviderServiceRecord>
  update(
    service: ProviderServiceRecord,
    expectedVersion: number,
  ): Promise<ProviderServiceRecord>
}>

export type UserRepository = Readonly<{
  create(input: CreateUserInput): Promise<UserRecord>
  findById(id: Uuidv7): Promise<UserRecord | null>
  update(user: UserRecord, expectedVersion: number): Promise<UserRecord>
}>

export type UserAddressRepository = Readonly<{
  create(input: CreateUserAddressInput): Promise<UserAddressRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<UserAddressRecord | null>
  listByOwner(
    ownerType: AddressOwnerType,
    ownerId: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<readonly UserAddressRecord[]>
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<UserAddressRecord>
  update(
    address: UserAddressRecord,
    expectedVersion: number,
  ): Promise<UserAddressRecord>
}>

export type UserIdentityRepository = Readonly<{
  create(input: CreateUserIdentityInput): Promise<UserIdentityRecord>
  findByProviderSubject(
    provider: IdentityProvider,
    providerSubject: string,
  ): Promise<UserIdentityRecord | null>
  listByUserId(userId: Uuidv7): Promise<readonly UserIdentityRecord[]>
  update(
    identity: UserIdentityRecord,
    expectedVersion: number,
  ): Promise<UserIdentityRecord>
}>

export type UserRoleRepository = Readonly<{
  create(input: CreateUserRoleInput): Promise<UserRoleRecord>
  findById(id: Uuidv7): Promise<UserRoleRecord | null>
  findByUserRoleScope(
    userId: Uuidv7,
    roleCode: RoleCode,
    scopeType: RoleScopeType,
    scopeId: Uuidv7 | null,
  ): Promise<UserRoleRecord | null>
  listByUserId(userId: Uuidv7): Promise<readonly UserRoleRecord[]>
  update(role: UserRoleRecord, expectedVersion: number): Promise<UserRoleRecord>
}>

export type OrganizationRepository = Readonly<{
  create(input: CreateOrganizationInput): Promise<OrganizationRecord>
  findById(id: Uuidv7): Promise<OrganizationRecord | null>
  listByOwnerUserId(ownerUserId: Uuidv7): Promise<readonly OrganizationRecord[]>
  update(
    organization: OrganizationRecord,
    expectedVersion: number,
  ): Promise<OrganizationRecord>
}>

export type OrganizationMembershipRepository = Readonly<{
  create(
    input: CreateOrganizationMembershipInput,
  ): Promise<OrganizationMembershipRecord>
  findById(id: Uuidv7): Promise<OrganizationMembershipRecord | null>
  findByOrganizationAndUser(
    organizationId: Uuidv7,
    userId: Uuidv7,
  ): Promise<OrganizationMembershipRecord | null>
  listByOrganizationId(
    organizationId: Uuidv7,
  ): Promise<readonly OrganizationMembershipRecord[]>
  listByUserId(userId: Uuidv7): Promise<readonly OrganizationMembershipRecord[]>
  update(
    membership: OrganizationMembershipRecord,
    expectedVersion: number,
  ): Promise<OrganizationMembershipRecord>
}>

export type VerificationCaseRepository = Readonly<{
  create(input: CreateVerificationCaseInput): Promise<VerificationCaseRecord>
  findById(id: Uuidv7): Promise<VerificationCaseRecord | null>
  listBySubject(
    subjectType: VerificationSubjectType,
    subjectId: Uuidv7,
  ): Promise<readonly VerificationCaseRecord[]>
  update(
    verificationCase: VerificationCaseRecord,
    expectedVersion: number,
  ): Promise<VerificationCaseRecord>
}>
