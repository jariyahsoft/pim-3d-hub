import { describe, expect, it } from 'vitest'
import {
  assertAuthorized,
  authorizeFinanceOperation,
  authorizeOrganizationOperation,
  authorizePrivateProfileRead,
  authorizeVerificationCaseRead,
  authorizeVerificationCaseReview,
  collectActorPermissions,
  createAuthorizationActor,
  listPermissionsForRole,
} from './authorization.js'
import {
  parseUtcTimestamp,
  parseUuidv7,
  roleCodes,
  type OrganizationMembershipRecord,
  type RoleCode,
  type UserRoleRecord,
  type VerificationCaseRecord,
} from '@pim/domain'

function createRole(
  roleCode: RoleCode,
  overrides?: Partial<UserRoleRecord>,
): UserRoleRecord {
  const now = parseUtcTimestamp('2026-06-27T12:00:00.000Z')

  return Object.freeze({
    activatedAt: now,
    createdAt: now,
    createdBy: null,
    deactivatedAt: null,
    deletedAt: null,
    id: parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${roleCode.length.toString(16).padStart(12, '0')}`),
    kycRequired: false,
    requestedAt: now,
    roleCode,
    scopeId: null,
    scopeType: 'GLOBAL',
    schemaVersion: 1,
    status: 'ACTIVE',
    updatedAt: now,
    updatedBy: null,
    userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa001'),
    verificationCaseId: null,
    version: 1,
    ...overrides,
  })
}

function createMembership(
  overrides?: Partial<OrganizationMembershipRecord>,
): OrganizationMembershipRecord {
  const now = parseUtcTimestamp('2026-06-27T12:00:00.000Z')

  return Object.freeze({
    acceptedAt: now,
    createdAt: now,
    createdBy: null,
    deletedAt: null,
    id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa101'),
    invitedByUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa002'),
    memberRoleCode: 'OPERATIONS_ADMIN',
    organizationId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa201'),
    schemaVersion: 1,
    status: 'ACTIVE',
    updatedAt: now,
    updatedBy: null,
    userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa001'),
    version: 1,
    ...overrides,
  })
}

function createVerificationCase(
  overrides?: Partial<VerificationCaseRecord>,
): VerificationCaseRecord {
  const now = parseUtcTimestamp('2026-06-27T12:00:00.000Z')

  return Object.freeze({
    createdAt: now,
    createdBy: null,
    decisionReason: null,
    deletedAt: null,
    documents: [Object.freeze({ assetId: null, maskedLabel: 'National ID ending 1234', sourceType: 'VENDOR_REFERENCE', vendorReference: 'ref-001' })],
    id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa301'),
    requestedRoleCode: 'DESIGN_PROVIDER',
    resubmissionCount: 0,
    reviewerUserId: null,
    schemaVersion: 1,
    status: 'PENDING',
    subjectId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa001'),
    subjectType: 'USER',
    type: 'ROLE_KYC',
    updatedAt: now,
    updatedBy: null,
    version: 1,
    ...overrides,
  })
}

describe('authorization policy', () => {
  it('covers every defined role with at least one mapped permission', () => {
    for (const roleCode of roleCodes) {
      expect(listPermissionsForRole(roleCode)).not.toHaveLength(0)
    }
  })

  it('builds permissions from active roles and memberships only', () => {
    const actor = createAuthorizationActor({
      memberships: [
        createMembership(),
        createMembership({
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa102'),
          memberRoleCode: 'FINANCE_ADMIN',
          organizationId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa202'),
          status: 'SUSPENDED',
        }),
      ],
      roles: [
        createRole('BUYER'),
        createRole('KYC_REVIEWER', {
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa401'),
          status: 'SUSPENDED',
        }),
      ],
      userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa001'),
      userStatus: 'ACTIVE',
    })

    const permissions = collectActorPermissions(
      actor,
      parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa201'),
    )

    expect(permissions.has('users.profile.read.self')).toBe(true)
    expect(permissions.has('organizations.members.invite')).toBe(true)
    expect(permissions.has('kyc.case.review')).toBe(false)
    expect(permissions.has('organizations.members.manage.finance')).toBe(false)
  })

  it('blocks a buyer from reading another buyer private profile', () => {
    const actor = createAuthorizationActor({
      memberships: [],
      roles: [createRole('BUYER')],
      userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa001'),
      userStatus: 'ACTIVE',
    })

    const selfDecision = authorizePrivateProfileRead({
      actor,
      targetUserId: actor.userId,
    })
    const otherDecision = authorizePrivateProfileRead({
      actor,
      targetUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa999'),
    })

    expect(selfDecision.allowed).toBe(true)
    expect(otherDecision).toMatchObject({
      allowed: false,
      reason: 'PRIVATE_PROFILE_SELF_ONLY',
    })
  })

  it('prevents provider organization scope from crossing organizations', () => {
    const organizationA = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa201')
    const organizationB = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa202')
    const actor = createAuthorizationActor({
      memberships: [createMembership({ organizationId: organizationA })],
      roles: [createRole('PRINT_PROVIDER')],
      userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa001'),
      userStatus: 'ACTIVE',
    })

    const allowed = authorizeOrganizationOperation({
      actor,
      organizationId: organizationA,
      permission: 'organizations.members.invite',
    })
    const denied = authorizeOrganizationOperation({
      actor,
      organizationId: organizationB,
      permission: 'organizations.members.invite',
    })

    expect(allowed.allowed).toBe(true)
    expect(denied).toMatchObject({
      allowed: false,
      reason: 'ORGANIZATION_SCOPE_MISMATCH',
    })
  })

  it('requires distinct staff permissions and audit reasons for KYC and finance actions', () => {
    const caseRecord = createVerificationCase()
    const kycActor = createAuthorizationActor({
      memberships: [],
      roles: [createRole('KYC_REVIEWER')],
      userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa777'),
      userStatus: 'ACTIVE',
    })
    const financeActor = createAuthorizationActor({
      memberships: [],
      roles: [createRole('FINANCE_ADMIN')],
      userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa778'),
      userStatus: 'ACTIVE',
    })

    expect(
      authorizeVerificationCaseReview({
        actor: kycActor,
        auditReason: '',
        verificationCase: caseRecord,
      }),
    ).toMatchObject({ allowed: false, reason: 'AUDIT_REASON_REQUIRED' })
    expect(
      authorizeVerificationCaseReview({
        actor: financeActor,
        auditReason: 'audit trail',
        verificationCase: caseRecord,
      }),
    ).toMatchObject({ allowed: false, reason: 'MISSING_PERMISSION' })
    expect(
      authorizeFinanceOperation({
        actor: kycActor,
        auditReason: 'refund request',
      }),
    ).toMatchObject({ allowed: false, reason: 'MISSING_PERMISSION' })
    expect(
      authorizeFinanceOperation({
        actor: financeActor,
        auditReason: 'refund request',
      }),
    ).toMatchObject({ allowed: true })
  })

  it('blocks support and self-review access to KYC material while allowing audited reviewer access', () => {
    const verificationCase = createVerificationCase()
    const supportActor = createAuthorizationActor({
      memberships: [],
      roles: [createRole('SUPPORT_AGENT')],
      userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa501'),
      userStatus: 'ACTIVE',
    })
    const reviewerActor = createAuthorizationActor({
      memberships: [],
      roles: [createRole('KYC_REVIEWER')],
      userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fa502'),
      userStatus: 'ACTIVE',
    })
    const selfReviewerActor = createAuthorizationActor({
      memberships: [],
      roles: [createRole('KYC_REVIEWER')],
      userId: verificationCase.subjectId,
      userStatus: 'ACTIVE',
    })

    expect(
      authorizeVerificationCaseRead({
        actor: supportActor,
        auditReason: 'support follow-up',
        verificationCase,
      }),
    ).toMatchObject({ allowed: false, reason: 'MISSING_PERMISSION' })

    expect(() =>
      assertAuthorized(
        authorizeVerificationCaseRead({
          actor: reviewerActor,
          auditReason: 'manual review queue',
          verificationCase,
        }),
      ),
    ).not.toThrow()

    expect(
      authorizeVerificationCaseReview({
        actor: selfReviewerActor,
        auditReason: 'self-review',
        verificationCase,
      }),
    ).toMatchObject({ allowed: false, reason: 'KYC_REVIEW_SELF_DENIED' })
  })
})
