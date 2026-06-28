import { AuthorizationDeniedError } from './identity.js'
import type {
  OrganizationMemberRoleCode,
  OrganizationMembershipRecord,
  RoleCode,
  UserRoleRecord,
  UserStatus,
  VerificationCaseRecord,
  Uuidv7,
} from '@pim/domain'

export const permissionCodes = [
  'users.profile.read.self',
  'users.profile.update.self',
  'users.roles.request.self',
  'users.roles.manage.platform',
  'providers.profile.manage.self',
  'organizations.create',
  'organizations.members.invite',
  'organizations.members.manage',
  'organizations.members.manage.finance',
  'organizations.members.read',
  'organizations.members.read.self',
  'kyc.case.create.self',
  'kyc.case.read.self',
  'kyc.case.read.review',
  'kyc.case.review',
  'payments.refund.execute',
  'audit.read',
  'platform.config.update',
] as const

export type PermissionCode = (typeof permissionCodes)[number]

export type AuthorizationDenyReason =
  | 'AUDIT_REASON_REQUIRED'
  | 'KYC_REVIEW_SELF_DENIED'
  | 'MEMBERSHIP_NOT_ACTIVE'
  | 'MISSING_PERMISSION'
  | 'ORGANIZATION_SCOPE_MISMATCH'
  | 'PRIVATE_PROFILE_SELF_ONLY'
  | 'ROLE_NOT_ACTIVE'
  | 'USER_NOT_ACTIVE'
  | 'VERIFICATION_CASE_SELF_ONLY'

export type AuthorizationActor = Readonly<{
  memberships: readonly OrganizationMembershipRecord[]
  roles: readonly UserRoleRecord[]
  userId: Uuidv7
  userStatus: UserStatus
}>

export type AuthorizationDecision = Readonly<{
  allowed: boolean
  permission?: PermissionCode
  reason?: AuthorizationDenyReason
}>

const rolePermissionMap: Readonly<Record<RoleCode, readonly PermissionCode[]>> = Object.freeze({
  BUYER: Object.freeze<readonly PermissionCode[]>([
    'users.profile.read.self',
    'users.profile.update.self',
    'users.roles.request.self',
    'organizations.create',
  ]),
  CONTENT_CREATOR: Object.freeze<readonly PermissionCode[]>([
    'users.profile.read.self',
    'users.profile.update.self',
    'users.roles.request.self',
    'organizations.create',
  ]),
  DESIGN_PROVIDER: Object.freeze<readonly PermissionCode[]>([
    'users.profile.read.self',
    'users.profile.update.self',
    'users.roles.request.self',
    'providers.profile.manage.self',
    'kyc.case.create.self',
    'organizations.create',
  ]),
  FINANCE_ADMIN: Object.freeze<readonly PermissionCode[]>([
    'payments.refund.execute',
    'audit.read',
  ]),
  FULL_SERVICE_PROVIDER: Object.freeze<readonly PermissionCode[]>([
    'users.profile.read.self',
    'users.profile.update.self',
    'users.roles.request.self',
    'providers.profile.manage.self',
    'kyc.case.create.self',
    'organizations.create',
  ]),
  KYC_REVIEWER: Object.freeze<readonly PermissionCode[]>([
    'kyc.case.read.review',
    'kyc.case.review',
    'audit.read',
  ]),
  MODERATOR: Object.freeze<readonly PermissionCode[]>(['audit.read']),
  PLATFORM_ADMIN: Object.freeze(permissionCodes),
  PRINT_PROVIDER: Object.freeze<readonly PermissionCode[]>([
    'users.profile.read.self',
    'users.profile.update.self',
    'users.roles.request.self',
    'providers.profile.manage.self',
    'kyc.case.create.self',
    'organizations.create',
  ]),
  PRODUCT_SELLER: Object.freeze<readonly PermissionCode[]>([
    'users.profile.read.self',
    'users.profile.update.self',
    'users.roles.request.self',
    'kyc.case.create.self',
    'organizations.create',
  ]),
  SUPPORT_AGENT: Object.freeze<readonly PermissionCode[]>(['organizations.members.read.self']),
})

const organizationMemberPermissionMap: Readonly<
  Record<OrganizationMemberRoleCode, readonly PermissionCode[]>
> = Object.freeze({
  FINANCE_ADMIN: Object.freeze<readonly PermissionCode[]>([
    'organizations.members.read',
    'organizations.members.read.self',
    'organizations.members.manage.finance',
  ]),
  MEMBER: Object.freeze<readonly PermissionCode[]>(['organizations.members.read.self']),
  OPERATIONS_ADMIN: Object.freeze<readonly PermissionCode[]>([
    'organizations.members.read',
    'organizations.members.read.self',
    'organizations.members.invite',
    'organizations.members.manage',
  ]),
  OWNER: Object.freeze<readonly PermissionCode[]>([
    'organizations.members.read',
    'organizations.members.read.self',
    'organizations.members.invite',
    'organizations.members.manage',
    'organizations.members.manage.finance',
  ]),
})

const kycRequiredRoles = new Set<RoleCode>([
  'DESIGN_PROVIDER',
  'PRINT_PROVIDER',
  'FULL_SERVICE_PROVIDER',
  'PRODUCT_SELLER',
])

function createDeniedDecision(
  reason: AuthorizationDenyReason,
  permission?: PermissionCode,
): AuthorizationDecision {
  return Object.freeze({
    allowed: false,
    ...(permission ? { permission } : {}),
    reason,
  })
}

export class AuthorizationPolicyError extends AuthorizationDeniedError {
  readonly concealResource: boolean
  readonly reason: AuthorizationDenyReason

  constructor(input: Readonly<{
    concealResource?: boolean
    message?: string
    reason: AuthorizationDenyReason
  }>) {
    super(input.message ?? 'คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้')
    this.name = 'AuthorizationPolicyError'
    this.concealResource = input.concealResource ?? true
    this.reason = input.reason
  }
}

export function createAuthorizationActor(input: AuthorizationActor): AuthorizationActor {
  return Object.freeze({
    memberships: [...input.memberships],
    roles: [...input.roles],
    userId: input.userId,
    userStatus: input.userStatus,
  })
}

export function roleRequiresKyc(roleCode: RoleCode): boolean {
  return kycRequiredRoles.has(roleCode)
}

export function listPermissionsForRole(roleCode: RoleCode): readonly PermissionCode[] {
  return rolePermissionMap[roleCode]
}

export function listPermissionsForOrganizationMemberRole(
  roleCode: OrganizationMemberRoleCode,
): readonly PermissionCode[] {
  return organizationMemberPermissionMap[roleCode]
}

export function collectActorPermissions(
  actor: AuthorizationActor,
  organizationId?: Uuidv7,
): ReadonlySet<PermissionCode> {
  const permissions = new Set<PermissionCode>()

  for (const role of actor.roles) {
    if (role.status !== 'ACTIVE') {
      continue
    }

    if (role.scopeType === 'ORGANIZATION' && organizationId && role.scopeId !== organizationId) {
      continue
    }

    for (const permission of rolePermissionMap[role.roleCode]) {
      permissions.add(permission)
    }
  }

  for (const membership of actor.memberships) {
    if (membership.status !== 'ACTIVE') {
      continue
    }

    if (organizationId && membership.organizationId !== organizationId) {
      continue
    }

    for (const permission of organizationMemberPermissionMap[membership.memberRoleCode]) {
      permissions.add(permission)
    }
  }

  return permissions
}

function isPlatformAdmin(actor: AuthorizationActor): boolean {
  return actor.roles.some(
    (role) =>
      role.status === 'ACTIVE' &&
      role.scopeType === 'GLOBAL' &&
      role.roleCode === 'PLATFORM_ADMIN',
  )
}

function hasPermission(
  actor: AuthorizationActor,
  permission: PermissionCode,
  organizationId?: Uuidv7,
): boolean {
  return collectActorPermissions(actor, organizationId).has(permission)
}

function ensureActiveUser(actor: AuthorizationActor): AuthorizationDecision {
  return actor.userStatus === 'ACTIVE'
    ? Object.freeze({ allowed: true })
    : createDeniedDecision('USER_NOT_ACTIVE')
}

function normalizeAuditReason(reason: string | null | undefined): string | null {
  const normalized = reason?.trim().replace(/\s+/g, ' ')
  return normalized ? normalized : null
}

function ensurePermission(
  actor: AuthorizationActor,
  permission: PermissionCode,
  organizationId?: Uuidv7,
): AuthorizationDecision {
  const activeUser = ensureActiveUser(actor)
  if (!activeUser.allowed) {
    return activeUser
  }

  return hasPermission(actor, permission, organizationId)
    ? Object.freeze({ allowed: true, permission })
    : createDeniedDecision('MISSING_PERMISSION', permission)
}

export function authorizePrivateProfileRead(input: Readonly<{
  actor: AuthorizationActor
  targetUserId: Uuidv7
}>): AuthorizationDecision {
  const activeUser = ensureActiveUser(input.actor)
  if (!activeUser.allowed) {
    return activeUser
  }

  if (input.actor.userId === input.targetUserId || isPlatformAdmin(input.actor)) {
    return Object.freeze({
      allowed: true,
      permission: 'users.profile.read.self',
    })
  }

  return createDeniedDecision('PRIVATE_PROFILE_SELF_ONLY', 'users.profile.read.self')
}

export function authorizeVerificationCaseRead(input: Readonly<{
  actor: AuthorizationActor
  auditReason?: string | null | undefined
  organizationId?: Uuidv7 | null
  verificationCase: VerificationCaseRecord
}>): AuthorizationDecision {
  const activeUser = ensureActiveUser(input.actor)
  if (!activeUser.allowed) {
    return activeUser
  }

  const subjectMatchesUser =
    input.verificationCase.subjectType === 'USER' &&
    input.verificationCase.subjectId === input.actor.userId
  const subjectMatchesOrganization =
    input.verificationCase.subjectType === 'ORGANIZATION' &&
    input.organizationId !== null &&
    input.organizationId !== undefined &&
    input.verificationCase.subjectId === input.organizationId &&
    input.actor.memberships.some(
      (membership) =>
        membership.organizationId === input.organizationId && membership.status === 'ACTIVE',
    )

  if (subjectMatchesUser || subjectMatchesOrganization) {
    return Object.freeze({
      allowed: true,
      permission: 'kyc.case.read.self',
    })
  }

  const decision = ensurePermission(input.actor, 'kyc.case.read.review')
  if (!decision.allowed) {
    return decision
  }

  if (!normalizeAuditReason(input.auditReason)) {
    return createDeniedDecision('AUDIT_REASON_REQUIRED', 'kyc.case.read.review')
  }

  return decision
}

export function authorizeVerificationCaseReview(input: Readonly<{
  actor: AuthorizationActor
  auditReason?: string | null | undefined
  verificationCase: VerificationCaseRecord
}>): AuthorizationDecision {
  const decision = ensurePermission(input.actor, 'kyc.case.review')
  if (!decision.allowed) {
    return decision
  }

  if (!normalizeAuditReason(input.auditReason)) {
    return createDeniedDecision('AUDIT_REASON_REQUIRED', 'kyc.case.review')
  }

  if (
    input.verificationCase.subjectType === 'USER' &&
    input.verificationCase.subjectId === input.actor.userId
  ) {
    return createDeniedDecision('KYC_REVIEW_SELF_DENIED', 'kyc.case.review')
  }

  return decision
}

export function authorizeOrganizationOperation(input: Readonly<{
  actor: AuthorizationActor
  auditReason?: string | null | undefined
  organizationId: Uuidv7
  permission: PermissionCode
  requireAuditReason?: boolean
}>): AuthorizationDecision {
  const activeUser = ensureActiveUser(input.actor)
  if (!activeUser.allowed) {
    return activeUser
  }

  if (isPlatformAdmin(input.actor)) {
    if (input.requireAuditReason && !normalizeAuditReason(input.auditReason)) {
      return createDeniedDecision('AUDIT_REASON_REQUIRED', input.permission)
    }

    return Object.freeze({ allowed: true, permission: input.permission })
  }

  const membership = input.actor.memberships.find(
    (entry) => entry.organizationId === input.organizationId,
  )

  if (!membership) {
    return createDeniedDecision('ORGANIZATION_SCOPE_MISMATCH', input.permission)
  }

  if (membership.status !== 'ACTIVE') {
    return createDeniedDecision('MEMBERSHIP_NOT_ACTIVE', input.permission)
  }

  if (!hasPermission(input.actor, input.permission, input.organizationId)) {
    return createDeniedDecision('MISSING_PERMISSION', input.permission)
  }

  if (input.requireAuditReason && !normalizeAuditReason(input.auditReason)) {
    return createDeniedDecision('AUDIT_REASON_REQUIRED', input.permission)
  }

  return Object.freeze({ allowed: true, permission: input.permission })
}

export function authorizeFinanceOperation(input: Readonly<{
  actor: AuthorizationActor
  auditReason?: string | null | undefined
}>): AuthorizationDecision {
  const decision = ensurePermission(input.actor, 'payments.refund.execute')
  if (!decision.allowed) {
    return decision
  }

  return normalizeAuditReason(input.auditReason)
    ? decision
    : createDeniedDecision('AUDIT_REASON_REQUIRED', 'payments.refund.execute')
}

export function assertAuthorized(decision: AuthorizationDecision): void {
  if (decision.allowed) {
    return
  }

  throw new AuthorizationPolicyError({
    concealResource: decision.reason !== 'USER_NOT_ACTIVE',
    reason: decision.reason ?? 'MISSING_PERMISSION',
  })
}
