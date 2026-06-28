import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type CreateUserIdentityInput,
  type CreateUserInput,
  type IdentityProvider,
  type UserIdentityRecord,
  type UserIdentityRepository,
  type UserRecord,
  type UserRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type SafeIdentityClaimValue = string | number | boolean

export type ExternalIdentity = Readonly<{
  email: string | null
  emailVerified: boolean
  provider: IdentityProvider
  providerSubject: string
  safeClaims: Readonly<Record<string, SafeIdentityClaimValue>>
}>

export type IdentityPort = Readonly<{
  verifyIdToken(idToken: string): Promise<ExternalIdentity>
}>

export type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

export type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export type AuditEvent = Readonly<{
  details: Readonly<Record<string, string | number | boolean | null>>
  occurredAt: UtcTimestamp
  type: string
  userId?: Uuidv7
}>

export type AuditSinkPort = Readonly<{
  record(event: AuditEvent): Promise<void> | void
}>

export type ResolveAuthenticatedUserResult = Readonly<{
  externalIdentity: ExternalIdentity
  identity: UserIdentityRecord
  isNewUser: boolean
  user: UserRecord
}>

export type ResolveAuthenticatedUserUseCase = Readonly<{
  execute(input: Readonly<{ idToken: string }>): Promise<ResolveAuthenticatedUserResult>
}>

type ResolveAuthenticatedUserDependencies = Readonly<{
  auditSink?: AuditSinkPort
  clock: ClockPort
  identityPort: IdentityPort
  userIdentities: UserIdentityRepository
  users: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

type ErrorMetadata = Readonly<{
  code: 'AUTHENTICATION_REQUIRED' | 'AUTHORIZATION_DENIED'
  status: 401 | 403
}>

const authenticationRequiredErrorMetadata: ErrorMetadata = Object.freeze({
  code: 'AUTHENTICATION_REQUIRED',
  status: 401,
})

const authorizationDeniedErrorMetadata: ErrorMetadata = Object.freeze({
  code: 'AUTHORIZATION_DENIED',
  status: 403,
})

export class AuthenticationRequiredError extends Error {
  readonly code = authenticationRequiredErrorMetadata.code
  readonly status = authenticationRequiredErrorMetadata.status

  constructor(message = 'กรุณาเข้าสู่ระบบก่อนดำเนินการ') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}

export class AuthorizationDeniedError extends Error {
  readonly code = authorizationDeniedErrorMetadata.code
  readonly status = authorizationDeniedErrorMetadata.status

  constructor(message = 'บัญชีผู้ใช้นี้ไม่สามารถใช้งานได้') {
    super(message)
    this.name = 'AuthorizationDeniedError'
  }
}

const noopAuditSink: AuditSinkPort = Object.freeze({
  record() {
    return undefined
  },
})

function normalizeEmail(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

async function recordAuditEvent(
  auditSink: AuditSinkPort,
  event: AuditEvent,
): Promise<void> {
  await auditSink.record(event)
}

function isUniqueProviderSubjectError(error: unknown): boolean {
  return error instanceof RepositoryUniqueConstraintError &&
    error.constraintName === 'user_identities.provider_providerSubject'
}

async function loadLinkedUser(
  input: ResolveAuthenticatedUserDependencies,
  externalIdentity: ExternalIdentity,
): Promise<Readonly<{
  identity: UserIdentityRecord
  user: UserRecord
}>> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const identity = await input.userIdentities.findByProviderSubject(
      externalIdentity.provider,
      externalIdentity.providerSubject,
    )

    if (!identity) {
      await Promise.resolve()
      continue
    }

    const user = await input.users.findById(identity.userId)

    if (!user) {
      await Promise.resolve()
      continue
    }

    return Object.freeze({
      identity,
      user,
    })
  }

  throw new Error('Unable to resolve internal user mapping for the external identity')
}

async function ensureActiveUser(
  input: ResolveAuthenticatedUserDependencies,
  user: UserRecord,
): Promise<UserRecord> {
  if (user.status === 'ACTIVE') {
    return user
  }

  await recordAuditEvent(input.auditSink ?? noopAuditSink, {
    details: {
      reason: user.status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_DELETED',
      status: user.status,
    },
    occurredAt: input.clock.now(),
    type: 'security.identity.access_denied',
    userId: user.id,
  })

  throw new AuthorizationDeniedError()
}

async function updateIdentityIfNeeded(
  input: ResolveAuthenticatedUserDependencies,
  identity: UserIdentityRecord,
  externalIdentity: ExternalIdentity,
): Promise<UserIdentityRecord> {
  const emailNormalized = normalizeEmail(externalIdentity.email)

  if (
    identity.emailNormalized === emailNormalized &&
    identity.emailVerified === externalIdentity.emailVerified
  ) {
    return identity
  }

  const nextIdentity: UserIdentityRecord = Object.freeze({
    ...identity,
    emailNormalized,
    emailVerified: externalIdentity.emailVerified,
    updatedAt: input.clock.now(),
    updatedBy: null,
    version: identity.version + 1,
  })

  try {
    return await input.userIdentities.update(nextIdentity, identity.version)
  } catch (error) {
    if (error instanceof RepositoryConflictError) {
      const reloaded = await input.userIdentities.findByProviderSubject(
        identity.provider,
        identity.providerSubject,
      )

      if (reloaded) {
        return reloaded
      }
    }

    throw error
  }
}

function createUserInput(
  userId: Uuidv7,
): CreateUserInput {
  return Object.freeze({
    createdBy: null,
    displayName: null,
    countryCode: null,
    onboardingCompletedAt: null,
    onboardingRoleCode: null,
    id: userId,
    locale: null,
    phoneE164: null,
    profileImageAssetId: null,
    notificationPreferences: Object.freeze({
      marketingEmail: false,
      marketingPush: false,
      orderStatusEmail: true,
      orderStatusPush: true,
    }),
    privacyPreferences: Object.freeze({
      publicProfileVisible: true,
      shareAddressWithOrderParticipants: true,
      sharePhoneWithOrderParticipants: false,
      showProvince: true,
    }),
    status: 'ACTIVE' as const,
    updatedBy: null,
  })
}

function createUserIdentityInput(
  externalIdentity: ExternalIdentity,
  input: Readonly<{
    identityId: Uuidv7
    userId: Uuidv7
  }>,
): CreateUserIdentityInput {
  return Object.freeze({
    createdBy: null,
    emailNormalized: normalizeEmail(externalIdentity.email),
    emailVerified: externalIdentity.emailVerified,
    id: input.identityId,
    provider: externalIdentity.provider,
    providerSubject: externalIdentity.providerSubject,
    updatedBy: null,
    userId: input.userId,
  })
}

export function createResolveAuthenticatedUserUseCase(
  input: ResolveAuthenticatedUserDependencies,
): ResolveAuthenticatedUserUseCase {
  return Object.freeze({
    async execute(request): Promise<ResolveAuthenticatedUserResult> {
      let externalIdentity: ExternalIdentity

      try {
        externalIdentity = await input.identityPort.verifyIdToken(request.idToken)
      } catch (error) {
        if (error instanceof AuthenticationRequiredError) {
          await recordAuditEvent(input.auditSink ?? noopAuditSink, {
            details: {
              provider: 'firebase',
              reason: 'INVALID_TOKEN',
            },
            occurredAt: input.clock.now(),
            type: 'security.identity.authentication_failed',
          })
        }

        throw error
      }

      const existingMapping = await input.userIdentities.findByProviderSubject(
        externalIdentity.provider,
        externalIdentity.providerSubject,
      )

      if (existingMapping) {
        const updatedIdentity = await updateIdentityIfNeeded(
          input,
          existingMapping,
          externalIdentity,
        )
        const user = await input.users.findById(updatedIdentity.userId)

        if (!user) {
          const linkedUser = await loadLinkedUser(input, externalIdentity)

          return Object.freeze({
            externalIdentity,
            identity: linkedUser.identity,
            isNewUser: false,
            user: await ensureActiveUser(input, linkedUser.user),
          })
        }

        return Object.freeze({
          externalIdentity,
          identity: updatedIdentity,
          isNewUser: false,
          user: await ensureActiveUser(input, user),
        })
      }

      const userId = input.uuidGenerator.next()
      const identityId = input.uuidGenerator.next()
      let createdIdentity: UserIdentityRecord

      try {
        createdIdentity = await input.userIdentities.create(
          createUserIdentityInput(externalIdentity, { identityId, userId }),
        )
      } catch (error) {
        if (isUniqueProviderSubjectError(error)) {
          const linkedUser = await loadLinkedUser(input, externalIdentity)

          return Object.freeze({
            externalIdentity,
            identity: linkedUser.identity,
            isNewUser: false,
            user: await ensureActiveUser(input, linkedUser.user),
          })
        }

        throw error
      }

      const createdUser = await input.users.create(createUserInput(userId))

      await recordAuditEvent(input.auditSink ?? noopAuditSink, {
        details: {
          provider: externalIdentity.provider,
        },
        occurredAt: input.clock.now(),
        type: 'identity.user.onboarded',
        userId: createdUser.id,
      })

      return Object.freeze({
        externalIdentity,
        identity: createdIdentity,
        isNewUser: true,
        user: createdUser,
      })
    },
  })
}
