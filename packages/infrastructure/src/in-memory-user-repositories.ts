import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type AddressOwnerType,
  type CreateUserAddressInput,
  type CreateUserIdentityInput,
  type CreateUserRoleInput,
  type CreateUserInput,
  type CreateOrganizationInput,
  type CreateOrganizationMembershipInput,
  type CreateVerificationCaseInput,
  type IdentityProvider,
  type OrganizationMembershipRecord,
  type OrganizationMembershipRepository,
  type OrganizationRecord,
  type OrganizationRepository,
  type OrganizationStatus,
  type RoleCode,
  type RoleScopeType,
  type UserAddressRecord,
  type UserAddressRepository,
  type UserIdentityRecord,
  type UserIdentityRepository,
  type UserNotificationPreferences,
  type UserPrivacyPreferences,
  type UserRoleRecord,
  type UserRoleRepository,
  type UserRecord,
  type UserRepository,
  type UtcTimestamp,
  type Uuidv7,
  type VerificationCaseRecord,
  type VerificationCaseRepository,
  type VerificationSubjectType,
} from '@pim/domain'

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

export type InMemoryUserRepository = UserRepository & Readonly<{
  snapshot(): readonly UserRecord[]
}>

export type InMemoryUserIdentityRepository = UserIdentityRepository & Readonly<{
  snapshot(): readonly UserIdentityRecord[]
}>

export type InMemoryUserAddressRepository = UserAddressRepository & Readonly<{
  snapshot(): readonly UserAddressRecord[]
}>

export type InMemoryUserRoleRepository = UserRoleRepository & Readonly<{
  snapshot(): readonly UserRoleRecord[]
}>

export type InMemoryOrganizationRepository = OrganizationRepository & Readonly<{
  snapshot(): readonly OrganizationRecord[]
}>

export type InMemoryOrganizationMembershipRepository = OrganizationMembershipRepository & Readonly<{
  snapshot(): readonly OrganizationMembershipRecord[]
}>

export type InMemoryVerificationCaseRepository = VerificationCaseRepository & Readonly<{
  snapshot(): readonly VerificationCaseRecord[]
}>

type UserRepositoryOptions = Readonly<{
  clock: ClockPort
  onBeforeCreate?: () => Promise<void> | void
}>

type UserIdentityRepositoryOptions = Readonly<{
  clock: ClockPort
}>

type UserAddressRepositoryOptions = Readonly<{
  clock: ClockPort
}>

type UserRoleRepositoryOptions = Readonly<{
  clock: ClockPort
}>

type OrganizationRepositoryOptions = Readonly<{
  clock: ClockPort
}>

type OrganizationMembershipRepositoryOptions = Readonly<{
  clock: ClockPort
}>

type VerificationCaseRepositoryOptions = Readonly<{
  clock: ClockPort
}>

const defaultNotificationPreferences: UserNotificationPreferences = Object.freeze({
  marketingEmail: false,
  marketingPush: false,
  orderStatusEmail: true,
  orderStatusPush: true,
})

const defaultPrivacyPreferences: UserPrivacyPreferences = Object.freeze({
  publicProfileVisible: true,
  shareAddressWithOrderParticipants: true,
  sharePhoneWithOrderParticipants: false,
  showProvince: true,
})

function cloneUser(user: UserRecord): UserRecord {
  return Object.freeze({ ...user })
}

function cloneIdentity(identity: UserIdentityRecord): UserIdentityRecord {
  return Object.freeze({ ...identity })
}

function cloneAddress(address: UserAddressRecord): UserAddressRecord {
  return Object.freeze({ ...address })
}

function cloneUserRole(role: UserRoleRecord): UserRoleRecord {
  return Object.freeze({ ...role })
}

function cloneOrganization(organization: OrganizationRecord): OrganizationRecord {
  return Object.freeze({ ...organization })
}

function cloneOrganizationMembership(
  membership: OrganizationMembershipRecord,
): OrganizationMembershipRecord {
  return Object.freeze({ ...membership })
}

function cloneVerificationCase(
  verificationCase: VerificationCaseRecord,
): VerificationCaseRecord {
  return Object.freeze({
    ...verificationCase,
    documents: verificationCase.documents.map((document) => Object.freeze({ ...document })),
  })
}

function createIdentityKey(provider: IdentityProvider, providerSubject: string): string {
  return `${provider}:${providerSubject}`
}

function createRoleScopeKey(
  userId: Uuidv7,
  roleCode: RoleCode,
  scopeType: RoleScopeType,
  scopeId: Uuidv7 | null,
): string {
  return `${userId}:${roleCode}:${scopeType}:${scopeId ?? 'GLOBAL'}`
}

function createOrganizationUserKey(organizationId: Uuidv7, userId: Uuidv7): string {
  return `${organizationId}:${userId}`
}

function createVerificationSubjectKey(
  subjectType: VerificationSubjectType,
  subjectId: Uuidv7,
): string {
  return `${subjectType}:${subjectId}`
}

export function createInMemoryUserRepository(
  input: UserRepositoryOptions,
): InMemoryUserRepository {
  const records = new Map<Uuidv7, UserRecord>()

  return Object.freeze({
    async create(createInput: CreateUserInput): Promise<UserRecord> {
      const id = createInput.id

      if (!id) {
        throw new TypeError('User id is required')
      }

      if (records.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'users.id',
          entityName: 'User',
          value: id,
        })
      }

      if (input.onBeforeCreate) {
        await input.onBeforeCreate()
      }

      const now = input.clock.now()
      const record: UserRecord = Object.freeze({
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        displayName: createInput.displayName ?? null,
        countryCode: createInput.countryCode ?? null,
        onboardingCompletedAt: createInput.onboardingCompletedAt ?? null,
        onboardingRoleCode: createInput.onboardingRoleCode ?? null,
        id,
        locale: createInput.locale ?? null,
        phoneE164: createInput.phoneE164 ?? null,
        profileImageAssetId: createInput.profileImageAssetId ?? null,
        notificationPreferences:
          createInput.notificationPreferences ?? defaultNotificationPreferences,
        privacyPreferences: createInput.privacyPreferences ?? defaultPrivacyPreferences,
        schemaVersion: 1,
        status: createInput.status ?? 'ACTIVE',
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        version: 1,
      })

      records.set(id, record)
      return cloneUser(record)
    },

    async findById(id: Uuidv7): Promise<UserRecord | null> {
      const record = records.get(id)
      return record ? cloneUser(record) : null
    },

    snapshot(): readonly UserRecord[] {
      return [...records.values()].map((record) => cloneUser(record))
    },

    async update(user: UserRecord, expectedVersion: number): Promise<UserRecord> {
      const current = records.get(user.id)

      if (!current) {
        throw new Error(`User ${user.id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'User',
          expectedVersion,
        })
      }

      const updated: UserRecord = Object.freeze({
        ...user,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        deletedAt: current.deletedAt,
        notificationPreferences:
          user.notificationPreferences ?? current.notificationPreferences,
        onboardingCompletedAt: user.onboardingCompletedAt ?? null,
        onboardingRoleCode: user.onboardingRoleCode ?? null,
        phoneE164: user.phoneE164 ?? null,
        privacyPreferences: user.privacyPreferences ?? current.privacyPreferences,
        countryCode: user.countryCode ?? null,
        profileImageAssetId: user.profileImageAssetId ?? null,
        schemaVersion: current.schemaVersion,
        updatedAt: input.clock.now(),
        updatedBy: user.updatedBy ?? null,
        version: current.version + 1,
      })

      records.set(updated.id, updated)
      return cloneUser(updated)
    },
  })
}

export function createInMemoryUserAddressRepository(
  input: UserAddressRepositoryOptions,
): InMemoryUserAddressRepository {
  const records = new Map<Uuidv7, UserAddressRecord>()

  return Object.freeze({
    async create(createInput: CreateUserAddressInput): Promise<UserAddressRecord> {
      const id = createInput.id

      if (!id) {
        throw new TypeError('UserAddress id is required')
      }

      if (records.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'user_addresses.id',
          entityName: 'UserAddress',
          value: id,
        })
      }

      const now = input.clock.now()
      const record: UserAddressRecord = Object.freeze({
        addressLine1: createInput.addressLine1,
        addressLine2: createInput.addressLine2 ?? null,
        countryCode: createInput.countryCode,
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        district: createInput.district,
        id,
        isDefault: createInput.isDefault ?? false,
        label: createInput.label,
        ownerId: createInput.ownerId,
        ownerType: createInput.ownerType ?? 'USER',
        phoneE164: createInput.phoneE164 ?? null,
        postalCode: createInput.postalCode,
        province: createInput.province,
        recipientName: createInput.recipientName,
        schemaVersion: 1,
        status: createInput.status ?? 'ACTIVE',
        subdistrict: createInput.subdistrict,
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        version: 1,
      })

      records.set(id, record)
      return cloneAddress(record)
    },

    async findById(
      id: Uuidv7,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<UserAddressRecord | null> {
      const record = records.get(id)

      if (!record) {
        return null
      }

      if (record.deletedAt && !options?.includeDeleted) {
        return null
      }

      return cloneAddress(record)
    },

    async listByOwner(
      ownerType: AddressOwnerType,
      ownerId: Uuidv7,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<readonly UserAddressRecord[]> {
      return [...records.values()]
        .filter((record) => record.ownerType === ownerType && record.ownerId === ownerId)
        .filter((record) => options?.includeDeleted || record.deletedAt === null)
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return Number(right.isDefault) - Number(left.isDefault)
          }

          return right.updatedAt.localeCompare(left.updatedAt)
        })
        .map((record) => cloneAddress(record))
    },

    snapshot(): readonly UserAddressRecord[] {
      return [...records.values()].map((record) => cloneAddress(record))
    },

    async softDelete(
      id: Uuidv7,
      expectedVersion: number,
      deletedBy?: Uuidv7 | null,
    ): Promise<UserAddressRecord> {
      const current = records.get(id)

      if (!current) {
        throw new Error(`UserAddress ${id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'UserAddress',
          expectedVersion,
        })
      }

      const updated: UserAddressRecord = Object.freeze({
        ...current,
        deletedAt: input.clock.now(),
        status: 'DELETED',
        updatedAt: input.clock.now(),
        updatedBy: deletedBy ?? current.updatedBy ?? null,
        version: current.version + 1,
      })

      records.set(updated.id, updated)
      return cloneAddress(updated)
    },

    async update(
      address: UserAddressRecord,
      expectedVersion: number,
    ): Promise<UserAddressRecord> {
      const current = records.get(address.id)

      if (!current) {
        throw new Error(`UserAddress ${address.id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'UserAddress',
          expectedVersion,
        })
      }

      const updated: UserAddressRecord = Object.freeze({
        ...address,
        addressLine2: address.addressLine2 ?? null,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        deletedAt: current.deletedAt,
        ownerId: current.ownerId,
        ownerType: current.ownerType,
        schemaVersion: current.schemaVersion,
        status: current.deletedAt ? 'DELETED' : address.status,
        updatedAt: input.clock.now(),
        updatedBy: address.updatedBy ?? null,
        version: current.version + 1,
      })

      records.set(updated.id, updated)
      return cloneAddress(updated)
    },
  })
}

export function createInMemoryUserIdentityRepository(
  input: UserIdentityRepositoryOptions,
): InMemoryUserIdentityRepository {
  const records = new Map<Uuidv7, UserIdentityRecord>()
  const recordsByProviderSubject = new Map<string, Uuidv7>()

  return Object.freeze({
    async create(createInput: CreateUserIdentityInput): Promise<UserIdentityRecord> {
      const id = createInput.id

      if (!id) {
        throw new TypeError('UserIdentity id is required')
      }

      if (records.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'user_identities.id',
          entityName: 'UserIdentity',
          value: id,
        })
      }

      const key = createIdentityKey(createInput.provider, createInput.providerSubject)

      if (recordsByProviderSubject.has(key)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'user_identities.provider_providerSubject',
          entityName: 'UserIdentity',
          value: key,
        })
      }

      const now = input.clock.now()
      const record: UserIdentityRecord = Object.freeze({
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        emailNormalized: createInput.emailNormalized ?? null,
        emailVerified: createInput.emailVerified,
        id,
        provider: createInput.provider,
        providerSubject: createInput.providerSubject,
        schemaVersion: 1,
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        userId: createInput.userId,
        version: 1,
      })

      records.set(id, record)
      recordsByProviderSubject.set(key, id)
      return cloneIdentity(record)
    },

    async findByProviderSubject(
      provider: IdentityProvider,
      providerSubject: string,
    ): Promise<UserIdentityRecord | null> {
      const id = recordsByProviderSubject.get(createIdentityKey(provider, providerSubject))

      if (!id) {
        return null
      }

      const record = records.get(id)
      return record ? cloneIdentity(record) : null
    },

    async listByUserId(userId: Uuidv7): Promise<readonly UserIdentityRecord[]> {
      return [...records.values()]
        .filter((record) => record.userId === userId)
        .map((record) => cloneIdentity(record))
    },

    snapshot(): readonly UserIdentityRecord[] {
      return [...records.values()].map((record) => cloneIdentity(record))
    },

    async update(
      identity: UserIdentityRecord,
      expectedVersion: number,
    ): Promise<UserIdentityRecord> {
      const current = records.get(identity.id)

      if (!current) {
        throw new Error(`UserIdentity ${identity.id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'UserIdentity',
          expectedVersion,
        })
      }

      const currentKey = createIdentityKey(current.provider, current.providerSubject)
      const nextKey = createIdentityKey(identity.provider, identity.providerSubject)
      const existingId = recordsByProviderSubject.get(nextKey)

      if (existingId && existingId !== identity.id) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'user_identities.provider_providerSubject',
          entityName: 'UserIdentity',
          value: nextKey,
        })
      }

      const updated: UserIdentityRecord = Object.freeze({
        ...identity,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        deletedAt: current.deletedAt,
        emailNormalized: identity.emailNormalized ?? null,
        schemaVersion: current.schemaVersion,
        updatedAt: identity.updatedAt,
        updatedBy: identity.updatedBy ?? null,
        version: expectedVersion + 1,
      })

      records.set(updated.id, updated)

      if (currentKey !== nextKey) {
        recordsByProviderSubject.delete(currentKey)
        recordsByProviderSubject.set(nextKey, updated.id)
      }

      return cloneIdentity(updated)
    },
  })
}

export function createInMemoryUserRoleRepository(
  input: UserRoleRepositoryOptions,
): InMemoryUserRoleRepository {
  const records = new Map<Uuidv7, UserRoleRecord>()
  const recordsByScope = new Map<string, Uuidv7>()

  return Object.freeze({
    async create(createInput: CreateUserRoleInput): Promise<UserRoleRecord> {
      const id = createInput.id

      if (!id) {
        throw new TypeError('UserRole id is required')
      }

      if (records.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'user_roles.id',
          entityName: 'UserRole',
          value: id,
        })
      }

      const scopeType = createInput.scopeType ?? 'GLOBAL'
      const scopeId = createInput.scopeId ?? null
      const key = createRoleScopeKey(createInput.userId, createInput.roleCode, scopeType, scopeId)

      if (recordsByScope.has(key)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'user_roles.user_role_scope',
          entityName: 'UserRole',
          value: key,
        })
      }

      const now = input.clock.now()
      const record: UserRoleRecord = Object.freeze({
        activatedAt: createInput.activatedAt ?? null,
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deactivatedAt: createInput.deactivatedAt ?? null,
        deletedAt: null,
        id,
        kycRequired: createInput.kycRequired ?? false,
        requestedAt: createInput.requestedAt ?? now,
        roleCode: createInput.roleCode,
        scopeId,
        scopeType,
        schemaVersion: 1,
        status: createInput.status ?? 'REQUESTED',
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        userId: createInput.userId,
        verificationCaseId: createInput.verificationCaseId ?? null,
        version: 1,
      })

      records.set(id, record)
      recordsByScope.set(key, id)
      return cloneUserRole(record)
    },

    async findById(id: Uuidv7): Promise<UserRoleRecord | null> {
      const record = records.get(id)
      return record ? cloneUserRole(record) : null
    },

    async findByUserRoleScope(
      userId: Uuidv7,
      roleCode: RoleCode,
      scopeType: RoleScopeType,
      scopeId: Uuidv7 | null,
    ): Promise<UserRoleRecord | null> {
      const id = recordsByScope.get(createRoleScopeKey(userId, roleCode, scopeType, scopeId))
      if (!id) {
        return null
      }

      const record = records.get(id)
      return record ? cloneUserRole(record) : null
    },

    async listByUserId(userId: Uuidv7): Promise<readonly UserRoleRecord[]> {
      return [...records.values()]
        .filter((record) => record.userId === userId)
        .map((record) => cloneUserRole(record))
    },

    snapshot(): readonly UserRoleRecord[] {
      return [...records.values()].map((record) => cloneUserRole(record))
    },

    async update(role: UserRoleRecord, expectedVersion: number): Promise<UserRoleRecord> {
      const current = records.get(role.id)

      if (!current) {
        throw new Error(`UserRole ${role.id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'UserRole',
          expectedVersion,
        })
      }

      const currentKey = createRoleScopeKey(
        current.userId,
        current.roleCode,
        current.scopeType,
        current.scopeId,
      )
      const nextKey = createRoleScopeKey(role.userId, role.roleCode, role.scopeType, role.scopeId)
      const existingId = recordsByScope.get(nextKey)

      if (existingId && existingId !== role.id) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'user_roles.user_role_scope',
          entityName: 'UserRole',
          value: nextKey,
        })
      }

      const updated: UserRoleRecord = Object.freeze({
        ...role,
        activatedAt: role.activatedAt ?? null,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        deactivatedAt: role.deactivatedAt ?? null,
        deletedAt: current.deletedAt,
        requestedAt: role.requestedAt,
        schemaVersion: current.schemaVersion,
        updatedAt: input.clock.now(),
        updatedBy: role.updatedBy ?? null,
        verificationCaseId: role.verificationCaseId ?? null,
        version: current.version + 1,
      })

      records.set(updated.id, updated)

      if (currentKey !== nextKey) {
        recordsByScope.delete(currentKey)
        recordsByScope.set(nextKey, updated.id)
      }

      return cloneUserRole(updated)
    },
  })
}

export function createInMemoryOrganizationRepository(
  input: OrganizationRepositoryOptions,
): InMemoryOrganizationRepository {
  const records = new Map<Uuidv7, OrganizationRecord>()

  return Object.freeze({
    async create(createInput: CreateOrganizationInput): Promise<OrganizationRecord> {
      const id = createInput.id

      if (!id) {
        throw new TypeError('Organization id is required')
      }

      if (records.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'organizations.id',
          entityName: 'Organization',
          value: id,
        })
      }

      const now = input.clock.now()
      const record: OrganizationRecord = Object.freeze({
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        id,
        name: createInput.name,
        ownerUserId: createInput.ownerUserId,
        schemaVersion: 1,
        status: createInput.status ?? 'ACTIVE',
        type: createInput.type ?? 'BUSINESS',
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        version: 1,
      })

      records.set(id, record)
      return cloneOrganization(record)
    },

    async findById(id: Uuidv7): Promise<OrganizationRecord | null> {
      const record = records.get(id)
      return record ? cloneOrganization(record) : null
    },

    async listByOwnerUserId(ownerUserId: Uuidv7): Promise<readonly OrganizationRecord[]> {
      return [...records.values()]
        .filter((record) => record.ownerUserId === ownerUserId)
        .map((record) => cloneOrganization(record))
    },

    snapshot(): readonly OrganizationRecord[] {
      return [...records.values()].map((record) => cloneOrganization(record))
    },

    async update(
      organization: OrganizationRecord,
      expectedVersion: number,
    ): Promise<OrganizationRecord> {
      const current = records.get(organization.id)

      if (!current) {
        throw new Error(`Organization ${organization.id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'Organization',
          expectedVersion,
        })
      }

      const updated: OrganizationRecord = Object.freeze({
        ...organization,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        deletedAt: current.deletedAt,
        schemaVersion: current.schemaVersion,
        updatedAt: input.clock.now(),
        updatedBy: organization.updatedBy ?? null,
        version: current.version + 1,
      })

      records.set(updated.id, updated)
      return cloneOrganization(updated)
    },
  })
}

export function createInMemoryOrganizationMembershipRepository(
  input: OrganizationMembershipRepositoryOptions,
): InMemoryOrganizationMembershipRepository {
  const records = new Map<Uuidv7, OrganizationMembershipRecord>()
  const recordsByOrganizationUser = new Map<string, Uuidv7>()

  return Object.freeze({
    async create(
      createInput: CreateOrganizationMembershipInput,
    ): Promise<OrganizationMembershipRecord> {
      const id = createInput.id

      if (!id) {
        throw new TypeError('OrganizationMembership id is required')
      }

      if (records.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'organization_members.id',
          entityName: 'OrganizationMembership',
          value: id,
        })
      }

      const key = createOrganizationUserKey(createInput.organizationId, createInput.userId)

      if (recordsByOrganizationUser.has(key)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'organization_members.organization_user',
          entityName: 'OrganizationMembership',
          value: key,
        })
      }

      const now = input.clock.now()
      const record: OrganizationMembershipRecord = Object.freeze({
        acceptedAt: createInput.acceptedAt ?? null,
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        id,
        invitedByUserId: createInput.invitedByUserId,
        memberRoleCode: createInput.memberRoleCode,
        organizationId: createInput.organizationId,
        schemaVersion: 1,
        status: createInput.status ?? 'INVITED',
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        userId: createInput.userId,
        version: 1,
      })

      records.set(id, record)
      recordsByOrganizationUser.set(key, id)
      return cloneOrganizationMembership(record)
    },

    async findById(id: Uuidv7): Promise<OrganizationMembershipRecord | null> {
      const record = records.get(id)
      return record ? cloneOrganizationMembership(record) : null
    },

    async findByOrganizationAndUser(
      organizationId: Uuidv7,
      userId: Uuidv7,
    ): Promise<OrganizationMembershipRecord | null> {
      const id = recordsByOrganizationUser.get(createOrganizationUserKey(organizationId, userId))
      if (!id) {
        return null
      }

      const record = records.get(id)
      return record ? cloneOrganizationMembership(record) : null
    },

    async listByOrganizationId(
      organizationId: Uuidv7,
    ): Promise<readonly OrganizationMembershipRecord[]> {
      return [...records.values()]
        .filter((record) => record.organizationId === organizationId)
        .map((record) => cloneOrganizationMembership(record))
    },

    async listByUserId(userId: Uuidv7): Promise<readonly OrganizationMembershipRecord[]> {
      return [...records.values()]
        .filter((record) => record.userId === userId)
        .map((record) => cloneOrganizationMembership(record))
    },

    snapshot(): readonly OrganizationMembershipRecord[] {
      return [...records.values()].map((record) => cloneOrganizationMembership(record))
    },

    async update(
      membership: OrganizationMembershipRecord,
      expectedVersion: number,
    ): Promise<OrganizationMembershipRecord> {
      const current = records.get(membership.id)

      if (!current) {
        throw new Error(`OrganizationMembership ${membership.id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'OrganizationMembership',
          expectedVersion,
        })
      }

      const updated: OrganizationMembershipRecord = Object.freeze({
        ...membership,
        acceptedAt: membership.acceptedAt ?? null,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        deletedAt: current.deletedAt,
        organizationId: current.organizationId,
        schemaVersion: current.schemaVersion,
        updatedAt: input.clock.now(),
        updatedBy: membership.updatedBy ?? null,
        userId: current.userId,
        version: current.version + 1,
      })

      records.set(updated.id, updated)
      return cloneOrganizationMembership(updated)
    },
  })
}

export function createInMemoryVerificationCaseRepository(
  input: VerificationCaseRepositoryOptions,
): InMemoryVerificationCaseRepository {
  const records = new Map<Uuidv7, VerificationCaseRecord>()

  return Object.freeze({
    async create(createInput: CreateVerificationCaseInput): Promise<VerificationCaseRecord> {
      const id = createInput.id

      if (!id) {
        throw new TypeError('VerificationCase id is required')
      }

      if (records.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'verification_cases.id',
          entityName: 'VerificationCase',
          value: id,
        })
      }

      const now = input.clock.now()
      const record: VerificationCaseRecord = Object.freeze({
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        decisionReason: createInput.decisionReason ?? null,
        deletedAt: null,
        documents: (createInput.documents ?? []).map((document) => Object.freeze({ ...document })),
        id,
        requestedRoleCode: createInput.requestedRoleCode ?? null,
        resubmissionCount: createInput.resubmissionCount ?? 0,
        reviewerUserId: createInput.reviewerUserId ?? null,
        schemaVersion: 1,
        status: createInput.status ?? 'NOT_STARTED',
        subjectId: createInput.subjectId,
        subjectType: createInput.subjectType,
        type: createInput.type,
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        version: 1,
      })

      records.set(id, record)
      return cloneVerificationCase(record)
    },

    async findById(id: Uuidv7): Promise<VerificationCaseRecord | null> {
      const record = records.get(id)
      return record ? cloneVerificationCase(record) : null
    },

    async listBySubject(
      subjectType: VerificationSubjectType,
      subjectId: Uuidv7,
    ): Promise<readonly VerificationCaseRecord[]> {
      const key = createVerificationSubjectKey(subjectType, subjectId)
      return [...records.values()]
        .filter((record) => createVerificationSubjectKey(record.subjectType, record.subjectId) === key)
        .map((record) => cloneVerificationCase(record))
    },

    snapshot(): readonly VerificationCaseRecord[] {
      return [...records.values()].map((record) => cloneVerificationCase(record))
    },

    async update(
      verificationCase: VerificationCaseRecord,
      expectedVersion: number,
    ): Promise<VerificationCaseRecord> {
      const current = records.get(verificationCase.id)

      if (!current) {
        throw new Error(`VerificationCase ${verificationCase.id} was not found`)
      }

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'VerificationCase',
          expectedVersion,
        })
      }

      const updated: VerificationCaseRecord = Object.freeze({
        ...verificationCase,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        decisionReason: verificationCase.decisionReason ?? null,
        deletedAt: current.deletedAt,
        documents: verificationCase.documents.map((document) => Object.freeze({ ...document })),
        requestedRoleCode: verificationCase.requestedRoleCode ?? null,
        reviewerUserId: verificationCase.reviewerUserId ?? null,
        schemaVersion: current.schemaVersion,
        updatedAt: input.clock.now(),
        updatedBy: verificationCase.updatedBy ?? null,
        version: current.version + 1,
      })

      records.set(updated.id, updated)
      return cloneVerificationCase(updated)
    },
  })
}
