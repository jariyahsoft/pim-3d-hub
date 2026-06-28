import {
  assertAuthorized,
  authorizeFinanceOperation,
  authorizeOrganizationOperation,
  authorizeVerificationCaseRead,
  authorizeVerificationCaseReview,
  createAuthorizationActor,
  roleRequiresKyc,
  type AuthorizationActor,
} from './authorization.js'
import {
  AuthorizationDeniedError,
  type AuditSinkPort,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'
import {
  RepositoryConflictError,
  type OrganizationMemberRoleCode,
  type OrganizationMembershipRecord,
  type OrganizationMembershipRepository,
  type OrganizationRecord,
  type OrganizationRepository,
  type OrganizationStatus,
  type RoleCode,
  type RoleScopeType,
  type UserRecord,
  type UserRepository,
  type UserRoleRecord,
  type UserRoleRepository,
  type UtcTimestamp,
  type Uuidv7,
  type VerificationCaseRecord,
  type VerificationCaseRepository,
  type VerificationCaseStatus,
  type VerificationDocumentReference,
  type VerificationDocumentSourceType,
} from '@pim/domain'

export type RoleAssignmentDto = Readonly<{
  id: Uuidv7
  kycRequired: boolean
  roleCode: RoleCode
  scopeId: Uuidv7 | null
  scopeType: RoleScopeType
  status: UserRoleRecord['status']
  verificationCaseId: Uuidv7 | null
  version: number
}>

export type VerificationDocumentDto = Readonly<{
  maskedLabel: string
  sourceType: VerificationDocumentSourceType
}>

export type VerificationCaseDto = Readonly<{
  decisionReason: string | null
  documents: readonly VerificationDocumentDto[]
  id: Uuidv7
  requestedRoleCode: RoleCode | null
  resubmissionCount: number
  reviewerUserId: Uuidv7 | null
  status: VerificationCaseStatus
  subjectId: Uuidv7
  subjectType: VerificationCaseRecord['subjectType']
  type: VerificationCaseRecord['type']
  version: number
}>

export type OrganizationMembershipDto = Readonly<{
  acceptedAt: UtcTimestamp | null
  id: Uuidv7
  invitedByUserId: Uuidv7
  memberRoleCode: OrganizationMemberRoleCode
  status: OrganizationMembershipRecord['status']
  userId: Uuidv7
  version: number
}>

export type OrganizationDto = Readonly<{
  id: Uuidv7
  members: readonly OrganizationMembershipDto[]
  name: string
  ownerUserId: Uuidv7
  status: OrganizationStatus
  type: OrganizationRecord['type']
  version: number
}>

export type TrustOverviewDto = Readonly<{
  organizations: readonly OrganizationDto[]
  roles: readonly RoleAssignmentDto[]
  verificationCases: readonly VerificationCaseDto[]
}>

export type TrustValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export class TrustNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'TrustNotFoundError'
  }
}

export type RoleRequestInput = Readonly<{
  actorUserId: Uuidv7
  roleCode: RoleCode
  scopeId?: Uuidv7 | null | undefined
  scopeType?: RoleScopeType | undefined
}>

export type SubmitVerificationCaseInput = Readonly<{
  actorUserId: Uuidv7
  caseId: Uuidv7
  documents: readonly VerificationDocumentReference[]
  expectedVersion: number
}>

export type ReviewVerificationCaseInput = Readonly<{
  actorUserId: Uuidv7
  caseId: Uuidv7
  decision: Exclude<VerificationCaseStatus, 'NOT_STARTED' | 'PENDING'>
  expectedVersion: number
  reason: string
}>

export type CreateOrganizationCommand = Readonly<{
  actorUserId: Uuidv7
  name: string
}>

export type InviteOrganizationMemberCommand = Readonly<{
  actorUserId: Uuidv7
  memberRoleCode: OrganizationMemberRoleCode
  organizationId: Uuidv7
  userId: Uuidv7
}>

export type AcceptOrganizationInvitationCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  membershipId: Uuidv7
}>

export type UpdateOrganizationMembershipCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  memberRoleCode?: OrganizationMemberRoleCode | undefined
  membershipId: Uuidv7
  reason: string
  status?: OrganizationMembershipRecord['status'] | undefined
}>

export type TrustService = Readonly<{
  acceptOrganizationInvitation(
    input: AcceptOrganizationInvitationCommand,
  ): Promise<OrganizationMembershipDto>
  createOrganization(input: CreateOrganizationCommand): Promise<OrganizationDto>
  getMyOverview(input: Readonly<{ userId: Uuidv7 }>): Promise<TrustOverviewDto>
  getOrganization(input: Readonly<{ actorUserId: Uuidv7; organizationId: Uuidv7 }>): Promise<OrganizationDto>
  getVerificationCase(
    input: Readonly<{ actorUserId: Uuidv7; auditReason?: string | null | undefined; caseId: Uuidv7 }>,
  ): Promise<VerificationCaseDto>
  inviteOrganizationMember(
    input: InviteOrganizationMemberCommand,
  ): Promise<OrganizationMembershipDto>
  requestRoleActivation(input: RoleRequestInput): Promise<RoleAssignmentDto>
  reviewVerificationCase(input: ReviewVerificationCaseInput): Promise<VerificationCaseDto>
  submitVerificationCase(input: SubmitVerificationCaseInput): Promise<VerificationCaseDto>
  updateOrganizationMembership(
    input: UpdateOrganizationMembershipCommand,
  ): Promise<OrganizationMembershipDto>
}>

type Dependencies = Readonly<{
  auditSink?: AuditSinkPort
  clock: ClockPort
  organizationMemberships: OrganizationMembershipRepository
  organizations: OrganizationRepository
  userRoles: UserRoleRepository
  users: UserRepository
  verificationCases: VerificationCaseRepository
  uuidGenerator: UuidGeneratorPort
}>

const noopAuditSink: AuditSinkPort = Object.freeze({
  record() {
    return undefined
  },
})

function createValidationError(fields: readonly string[], message: string): TrustValidationError {
  const error = new Error(message) as Error & {
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }

  Object.assign(error, {
    code: 'VALIDATION_ERROR' as const,
    fields,
    name: 'TrustValidationError',
    status: 400 as const,
  })

  return error as TrustValidationError
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeReason(value: string, field = 'reason'): string {
  const normalized = sanitizeText(value)
  if (!normalized) {
    throw createValidationError([field], `${field} is required`)
  }

  return normalized
}

function normalizeOrganizationName(value: string): string {
  const normalized = sanitizeText(value)
  if (!normalized) {
    throw createValidationError(['name'], 'name is required')
  }

  return normalized
}

function normalizeVerificationDocuments(
  documents: readonly VerificationDocumentReference[],
): readonly VerificationDocumentReference[] {
  if (documents.length === 0) {
    throw createValidationError(['documents'], 'documents are required')
  }

  return documents.map((document, index) => {
    const maskedLabel = sanitizeText(document.maskedLabel)

    if (!maskedLabel) {
      throw createValidationError([`documents.${index}.maskedLabel`], 'maskedLabel is required')
    }

    if (document.sourceType === 'PRIVATE_ASSET' && document.assetId === null) {
      throw createValidationError([`documents.${index}.assetId`], 'assetId is required for private assets')
    }

    if (
      document.sourceType === 'VENDOR_REFERENCE' &&
      !sanitizeText(document.vendorReference ?? '')
    ) {
      throw createValidationError(
        [`documents.${index}.vendorReference`],
        'vendorReference is required for vendor references',
      )
    }

    return Object.freeze({
      assetId: document.assetId ?? null,
      maskedLabel,
      sourceType: document.sourceType,
      vendorReference:
        document.vendorReference === null || document.vendorReference === undefined
          ? null
          : sanitizeText(document.vendorReference),
    })
  })
}

function toRoleAssignmentDto(role: UserRoleRecord): RoleAssignmentDto {
  return Object.freeze({
    id: role.id,
    kycRequired: role.kycRequired,
    roleCode: role.roleCode,
    scopeId: role.scopeId,
    scopeType: role.scopeType,
    status: role.status,
    verificationCaseId: role.verificationCaseId,
    version: role.version,
  })
}

function toVerificationCaseDto(verificationCase: VerificationCaseRecord): VerificationCaseDto {
  return Object.freeze({
    decisionReason: verificationCase.decisionReason,
    documents: verificationCase.documents.map((document) =>
      Object.freeze({
        maskedLabel: document.maskedLabel,
        sourceType: document.sourceType,
      }),
    ),
    id: verificationCase.id,
    requestedRoleCode: verificationCase.requestedRoleCode,
    resubmissionCount: verificationCase.resubmissionCount,
    reviewerUserId: verificationCase.reviewerUserId,
    status: verificationCase.status,
    subjectId: verificationCase.subjectId,
    subjectType: verificationCase.subjectType,
    type: verificationCase.type,
    version: verificationCase.version,
  })
}

function toOrganizationMembershipDto(
  membership: OrganizationMembershipRecord,
): OrganizationMembershipDto {
  return Object.freeze({
    acceptedAt: membership.acceptedAt,
    id: membership.id,
    invitedByUserId: membership.invitedByUserId,
    memberRoleCode: membership.memberRoleCode,
    status: membership.status,
    userId: membership.userId,
    version: membership.version,
  })
}

function toOrganizationDto(
  organization: OrganizationRecord,
  memberships: readonly OrganizationMembershipRecord[],
): OrganizationDto {
  return Object.freeze({
    id: organization.id,
    members: memberships.map((membership) => toOrganizationMembershipDto(membership)),
    name: organization.name,
    ownerUserId: organization.ownerUserId,
    status: organization.status,
    type: organization.type,
    version: organization.version,
  })
}

async function loadUser(
  users: UserRepository,
  userId: Uuidv7,
): Promise<UserRecord> {
  const user = await users.findById(userId)

  if (!user) {
    throw new TrustNotFoundError(`User ${userId} was not found`)
  }

  if (user.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError()
  }

  return user
}

async function loadActor(
  input: Dependencies,
  userId: Uuidv7,
): Promise<AuthorizationActor> {
  const user = await loadUser(input.users, userId)
  const [memberships, roles] = await Promise.all([
    input.organizationMemberships.listByUserId(userId),
    input.userRoles.listByUserId(userId),
  ])

  return createAuthorizationActor({
    memberships,
    roles,
    userId: user.id,
    userStatus: user.status,
  })
}

async function recordAudit(
  auditSink: AuditSinkPort | undefined,
  input: Readonly<{
    details: Readonly<Record<string, string | number | boolean | null>>
    occurredAt: UtcTimestamp
    type: string
    userId?: Uuidv7
  }>,
): Promise<void> {
  await (auditSink ?? noopAuditSink).record(input)
}

async function loadOrganizationOrThrow(
  organizations: OrganizationRepository,
  organizationId: Uuidv7,
): Promise<OrganizationRecord> {
  const organization = await organizations.findById(organizationId)

  if (!organization) {
    throw new TrustNotFoundError(`Organization ${organizationId} was not found`)
  }

  return organization
}

async function loadVerificationCaseOrThrow(
  verificationCases: VerificationCaseRepository,
  caseId: Uuidv7,
): Promise<VerificationCaseRecord> {
  const verificationCase = await verificationCases.findById(caseId)

  if (!verificationCase) {
    throw new TrustNotFoundError(`VerificationCase ${caseId} was not found`)
  }

  return verificationCase
}

async function loadMembershipOrThrow(
  memberships: OrganizationMembershipRepository,
  membershipId: Uuidv7,
): Promise<OrganizationMembershipRecord> {
  const membership = await memberships.findById(membershipId)

  if (!membership) {
    throw new TrustNotFoundError(`OrganizationMembership ${membershipId} was not found`)
  }

  return membership
}

async function syncRoleStatusForVerificationCase(
  input: Dependencies,
  verificationCase: VerificationCaseRecord,
): Promise<void> {
  if (verificationCase.subjectType !== 'USER') {
    return
  }

  const roles = await input.userRoles.listByUserId(verificationCase.subjectId)
  const matchingRole = roles.find((role) => role.verificationCaseId === verificationCase.id)

  if (!matchingRole) {
    return
  }

  let nextStatus = matchingRole.status
  let activatedAt = matchingRole.activatedAt
  let deactivatedAt = matchingRole.deactivatedAt

  switch (verificationCase.status) {
    case 'APPROVED':
      nextStatus = 'ACTIVE'
      activatedAt = input.clock.now()
      deactivatedAt = null
      break
    case 'NEEDS_MORE_INFO':
    case 'PENDING':
    case 'NOT_STARTED':
      nextStatus = 'REQUESTED'
      break
    case 'REJECTED':
      nextStatus = 'REJECTED'
      deactivatedAt = input.clock.now()
      break
    case 'SUSPENDED':
      nextStatus = 'SUSPENDED'
      deactivatedAt = input.clock.now()
      break
  }

  if (
    nextStatus === matchingRole.status &&
    activatedAt === matchingRole.activatedAt &&
    deactivatedAt === matchingRole.deactivatedAt
  ) {
    return
  }

  await input.userRoles.update(
    Object.freeze({
      ...matchingRole,
      activatedAt,
      deactivatedAt,
      status: nextStatus,
      updatedBy: verificationCase.reviewerUserId ?? verificationCase.subjectId,
    }),
    matchingRole.version,
  )
}

async function listOrganizationsForActor(
  input: Dependencies,
  actorUserId: Uuidv7,
): Promise<readonly OrganizationDto[]> {
  const memberships = await input.organizationMemberships.listByUserId(actorUserId)
  const organizationIds = [...new Set(memberships.map((membership) => membership.organizationId))]
  const organizations = await Promise.all(
    organizationIds.map(async (organizationId) => {
      const organization = await loadOrganizationOrThrow(input.organizations, organizationId)
      const members = await input.organizationMemberships.listByOrganizationId(organization.id)
      return toOrganizationDto(organization, members)
    }),
  )

  return organizations
}

export function createTrustService(input: Dependencies): TrustService {
  return Object.freeze({
    async acceptOrganizationInvitation(
      command,
    ): Promise<OrganizationMembershipDto> {
      const actor = await loadActor(input, command.actorUserId)
      const membership = await loadMembershipOrThrow(input.organizationMemberships, command.membershipId)

      if (membership.userId !== actor.userId) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์ตอบรับคำเชิญนี้')
      }

      if (membership.status !== 'INVITED') {
        throw createValidationError(['membershipId'], 'invitation is no longer available')
      }

      const updated = await input.organizationMemberships.update(
        Object.freeze({
          ...membership,
          acceptedAt: input.clock.now(),
          status: 'ACTIVE',
          updatedBy: actor.userId,
        }),
        command.expectedVersion,
      )

      await recordAudit(input.auditSink, {
        details: {
          membershipId: updated.id,
          organizationId: updated.organizationId,
          outcome: updated.status,
        },
        occurredAt: input.clock.now(),
        type: 'identity.organization.invitation_accepted',
        userId: actor.userId,
      })

      return toOrganizationMembershipDto(updated)
    },

    async createOrganization(command): Promise<OrganizationDto> {
      const actor = await loadActor(input, command.actorUserId)
      const organization = await input.organizations.create({
        createdBy: actor.userId,
        id: input.uuidGenerator.next(),
        name: normalizeOrganizationName(command.name),
        ownerUserId: actor.userId,
        type: 'BUSINESS',
        updatedBy: actor.userId,
      })

      const membership = await input.organizationMemberships.create({
        acceptedAt: input.clock.now(),
        createdBy: actor.userId,
        id: input.uuidGenerator.next(),
        invitedByUserId: actor.userId,
        memberRoleCode: 'OWNER',
        organizationId: organization.id,
        status: 'ACTIVE',
        updatedBy: actor.userId,
        userId: actor.userId,
      })

      await recordAudit(input.auditSink, {
        details: {
          organizationId: organization.id,
          type: organization.type,
        },
        occurredAt: input.clock.now(),
        type: 'identity.organization.created',
        userId: actor.userId,
      })

      return toOrganizationDto(organization, [membership])
    },

    async getMyOverview({ userId }): Promise<TrustOverviewDto> {
      await loadActor(input, userId)
      const [roles, verificationCases, organizations] = await Promise.all([
        input.userRoles.listByUserId(userId),
        input.verificationCases.listBySubject('USER', userId),
        listOrganizationsForActor(input, userId),
      ])

      return Object.freeze({
        organizations,
        roles: roles.map((role) => toRoleAssignmentDto(role)),
        verificationCases: verificationCases.map((verificationCase) =>
          toVerificationCaseDto(verificationCase),
        ),
      })
    },

    async getOrganization({
      actorUserId,
      organizationId,
    }): Promise<OrganizationDto> {
      const actor = await loadActor(input, actorUserId)
      assertAuthorized(
        authorizeOrganizationOperation({
          actor,
          organizationId,
          permission: 'organizations.members.read',
        }),
      )

      const organization = await loadOrganizationOrThrow(input.organizations, organizationId)
      const memberships = await input.organizationMemberships.listByOrganizationId(organizationId)
      return toOrganizationDto(organization, memberships)
    },

    async getVerificationCase({
      actorUserId,
      auditReason,
      caseId,
    }): Promise<VerificationCaseDto> {
      const actor = await loadActor(input, actorUserId)
      const verificationCase = await loadVerificationCaseOrThrow(input.verificationCases, caseId)
      const organizationId =
        verificationCase.subjectType === 'ORGANIZATION' ? verificationCase.subjectId : null

      assertAuthorized(
        authorizeVerificationCaseRead({
          actor,
          auditReason,
          organizationId,
          verificationCase,
        }),
      )

      if (actor.userId !== verificationCase.subjectId) {
        await recordAudit(input.auditSink, {
          details: {
            caseId: verificationCase.id,
            reason: normalizeReason(auditReason ?? ''),
          },
          occurredAt: input.clock.now(),
          type: 'trust.kyc.viewed_by_staff',
          userId: actor.userId,
        })
      }

      return toVerificationCaseDto(verificationCase)
    },

    async inviteOrganizationMember(
      command,
    ): Promise<OrganizationMembershipDto> {
      const actor = await loadActor(input, command.actorUserId)
      await loadUser(input.users, command.userId)
      await loadOrganizationOrThrow(input.organizations, command.organizationId)

      assertAuthorized(
        authorizeOrganizationOperation({
          actor,
          organizationId: command.organizationId,
          permission:
            command.memberRoleCode === 'FINANCE_ADMIN'
              ? 'organizations.members.manage.finance'
              : 'organizations.members.invite',
        }),
      )

      const membership = await input.organizationMemberships.create({
        createdBy: actor.userId,
        id: input.uuidGenerator.next(),
        invitedByUserId: actor.userId,
        memberRoleCode: command.memberRoleCode,
        organizationId: command.organizationId,
        status: 'INVITED',
        updatedBy: actor.userId,
        userId: command.userId,
      })

      await recordAudit(input.auditSink, {
        details: {
          membershipId: membership.id,
          organizationId: membership.organizationId,
          roleCode: membership.memberRoleCode,
        },
        occurredAt: input.clock.now(),
        type: 'identity.organization.member_invited',
        userId: actor.userId,
      })

      return toOrganizationMembershipDto(membership)
    },

    async requestRoleActivation(command): Promise<RoleAssignmentDto> {
      const actor = await loadActor(input, command.actorUserId)
      const scopeType = command.scopeType ?? 'GLOBAL'
      const scopeId = command.scopeId ?? null
      const existing = await input.userRoles.findByUserRoleScope(
        actor.userId,
        command.roleCode,
        scopeType,
        scopeId,
      )

      if (existing && existing.status !== 'REVOKED' && existing.status !== 'REJECTED') {
        return toRoleAssignmentDto(existing)
      }

      const needsKyc = roleRequiresKyc(command.roleCode)
      let verificationCaseId: Uuidv7 | null = null

      if (needsKyc) {
        verificationCaseId = input.uuidGenerator.next()
        await input.verificationCases.create({
          createdBy: actor.userId,
          id: verificationCaseId,
          requestedRoleCode: command.roleCode,
          status: 'NOT_STARTED',
          subjectId: actor.userId,
          subjectType: 'USER',
          type: 'ROLE_KYC',
          updatedBy: actor.userId,
        })
      }

      const role = await input.userRoles.create({
        activatedAt: needsKyc ? null : input.clock.now(),
        createdBy: actor.userId,
        id: input.uuidGenerator.next(),
        kycRequired: needsKyc,
        requestedAt: input.clock.now(),
        roleCode: command.roleCode,
        scopeId,
        scopeType,
        status: needsKyc ? 'REQUESTED' : 'ACTIVE',
        updatedBy: actor.userId,
        userId: actor.userId,
        verificationCaseId,
      })

      await recordAudit(input.auditSink, {
        details: {
          roleCode: role.roleCode,
          status: role.status,
          verificationCaseId: role.verificationCaseId,
        },
        occurredAt: input.clock.now(),
        type: needsKyc ? 'identity.role.requested' : 'identity.role.activated',
        userId: actor.userId,
      })

      return toRoleAssignmentDto(role)
    },

    async reviewVerificationCase(command): Promise<VerificationCaseDto> {
      const actor = await loadActor(input, command.actorUserId)
      const verificationCase = await loadVerificationCaseOrThrow(input.verificationCases, command.caseId)

      assertAuthorized(
        authorizeVerificationCaseReview({
          actor,
          auditReason: command.reason,
          verificationCase,
        }),
      )

      if (!['PENDING', 'NEEDS_MORE_INFO'].includes(verificationCase.status)) {
        throw createValidationError(['caseId'], 'verification case is not reviewable')
      }

      const updated = await input.verificationCases.update(
        Object.freeze({
          ...verificationCase,
          decisionReason: normalizeReason(command.reason),
          reviewerUserId: actor.userId,
          status: command.decision,
          updatedBy: actor.userId,
        }),
        command.expectedVersion,
      )

      await syncRoleStatusForVerificationCase(input, updated)

      await recordAudit(input.auditSink, {
        details: {
          caseId: updated.id,
          decision: updated.status,
          requestedRoleCode: updated.requestedRoleCode,
          reason: updated.decisionReason,
        },
        occurredAt: input.clock.now(),
        type: 'trust.kyc.reviewed',
        userId: actor.userId,
      })

      return toVerificationCaseDto(updated)
    },

    async submitVerificationCase(command): Promise<VerificationCaseDto> {
      const actor = await loadActor(input, command.actorUserId)
      const verificationCase = await loadVerificationCaseOrThrow(input.verificationCases, command.caseId)

      if (
        verificationCase.subjectType !== 'USER' ||
        verificationCase.subjectId !== actor.userId
      ) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์ส่งข้อมูลยืนยันนี้')
      }

      if (!['NOT_STARTED', 'NEEDS_MORE_INFO'].includes(verificationCase.status)) {
        throw createValidationError(['caseId'], 'verification case cannot be resubmitted')
      }

      const updated = await input.verificationCases.update(
        Object.freeze({
          ...verificationCase,
          decisionReason: null,
          documents: normalizeVerificationDocuments(command.documents),
          resubmissionCount:
            verificationCase.status === 'NEEDS_MORE_INFO'
              ? verificationCase.resubmissionCount + 1
              : verificationCase.resubmissionCount,
          reviewerUserId: null,
          status: 'PENDING',
          updatedBy: actor.userId,
        }),
        command.expectedVersion,
      )

      await syncRoleStatusForVerificationCase(input, updated)

      await recordAudit(input.auditSink, {
        details: {
          caseId: updated.id,
          documentCount: updated.documents.length,
          status: updated.status,
        },
        occurredAt: input.clock.now(),
        type: 'trust.kyc.submitted',
        userId: actor.userId,
      })

      return toVerificationCaseDto(updated)
    },

    async updateOrganizationMembership(
      command,
    ): Promise<OrganizationMembershipDto> {
      const actor = await loadActor(input, command.actorUserId)
      const membership = await loadMembershipOrThrow(input.organizationMemberships, command.membershipId)

      assertAuthorized(
        authorizeOrganizationOperation({
          actor,
          auditReason: command.reason,
          organizationId: membership.organizationId,
          permission:
            (command.memberRoleCode ?? membership.memberRoleCode) === 'FINANCE_ADMIN'
              ? 'organizations.members.manage.finance'
              : 'organizations.members.manage',
          requireAuditReason: true,
        }),
      )

      const nextStatus = command.status ?? membership.status
      const nextRoleCode = command.memberRoleCode ?? membership.memberRoleCode

      const updated = await input.organizationMemberships.update(
        Object.freeze({
          ...membership,
          acceptedAt:
            nextStatus === 'ACTIVE'
              ? membership.acceptedAt ?? input.clock.now()
              : membership.acceptedAt,
          memberRoleCode: nextRoleCode,
          status: nextStatus,
          updatedBy: actor.userId,
        }),
        command.expectedVersion,
      )

      await recordAudit(input.auditSink, {
        details: {
          membershipId: updated.id,
          organizationId: updated.organizationId,
          reason: normalizeReason(command.reason),
          roleCode: updated.memberRoleCode,
          status: updated.status,
        },
        occurredAt: input.clock.now(),
        type: 'identity.organization.member_updated',
        userId: actor.userId,
      })

      return toOrganizationMembershipDto(updated)
    },
  })
}

export function assertTrustVersionConflict(
  error: unknown,
): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError
}
