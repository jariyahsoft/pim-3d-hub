import { describe, expect, it } from 'vitest'
import { AuthorizationDeniedError } from './identity.js'
import {
  TrustNotFoundError,
  createTrustService,
} from './trust.js'
import { parseUuidv7 } from '@pim/domain'
import {
  createInMemoryOrganizationMembershipRepository,
  createInMemoryOrganizationRepository,
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
  createInMemoryVerificationCaseRepository,
} from '../../infrastructure/src/in-memory-user-repositories.js'
import {
  createFakeClock,
  createFakeDomainEventCollector,
  createFakeUuidGenerator,
} from '../../testkit/src/repository-fakes.js'

function createRepositories() {
  const clock = createFakeClock('2026-06-27T12:00:00.000Z')
  const users = createInMemoryUserRepository({ clock })
  const userRoles = createInMemoryUserRoleRepository({ clock })
  const organizations = createInMemoryOrganizationRepository({ clock })
  const organizationMemberships = createInMemoryOrganizationMembershipRepository({ clock })
  const verificationCases = createInMemoryVerificationCaseRepository({ clock })
  const uuidGenerator = createFakeUuidGenerator([
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb101',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb102',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb103',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb104',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb105',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb106',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb107',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb108',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb109',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb10a',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb10b',
    '018f18b2-4c4f-7c7a-9e12-4c0b8a8fb10c',
  ])
  const auditCollector = createFakeDomainEventCollector()

  return {
    auditCollector,
    clock,
    organizationMemberships,
    organizations,
    service: createTrustService({
      auditSink: {
        async record(event) {
          auditCollector.record({
            aggregateId: event.userId ?? parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fbfff'),
            occurredAt: event.occurredAt,
            payload: event,
            type: event.type,
          })
        },
      },
      clock,
      organizationMemberships,
      organizations,
      userRoles,
      users,
      verificationCases,
      uuidGenerator,
    }),
    userRoles,
    users,
    verificationCases,
  }
}

describe('trust service', () => {
  it('handles the KYC request, resubmission, and approval lifecycle without logging sensitive payloads', async () => {
    const deps = createRepositories()
    const applicantId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb001')
    const reviewerId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb002')

    await deps.users.create({ id: applicantId })
    await deps.users.create({ id: reviewerId })
    await deps.userRoles.create({
      activatedAt: deps.clock.now(),
      createdBy: reviewerId,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb201'),
      roleCode: 'KYC_REVIEWER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: reviewerId,
      userId: reviewerId,
    })

    const requestedRole = await deps.service.requestRoleActivation({
      actorUserId: applicantId,
      roleCode: 'DESIGN_PROVIDER',
    })

    expect(requestedRole.status).toBe('REQUESTED')
    expect(requestedRole.kycRequired).toBe(true)
    expect(requestedRole.verificationCaseId).not.toBeNull()

    const overviewAfterRequest = await deps.service.getMyOverview({ userId: applicantId })
    expect(overviewAfterRequest.verificationCases).toHaveLength(1)
    const initialCase = overviewAfterRequest.verificationCases[0]!
    expect(initialCase.status).toBe('NOT_STARTED')

    const submitted = await deps.service.submitVerificationCase({
      actorUserId: applicantId,
      caseId: initialCase.id,
      documents: [
        {
          assetId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb301'),
          maskedLabel: 'Thai ID ending 1234',
          sourceType: 'PRIVATE_ASSET',
          vendorReference: null,
        },
      ],
      expectedVersion: initialCase.version,
    })

    expect(submitted.status).toBe('PENDING')
    expect(submitted.documents).toEqual([
      { maskedLabel: 'Thai ID ending 1234', sourceType: 'PRIVATE_ASSET' },
    ])

    const needsMoreInfo = await deps.service.reviewVerificationCase({
      actorUserId: reviewerId,
      caseId: submitted.id,
      decision: 'NEEDS_MORE_INFO',
      expectedVersion: submitted.version,
      reason: 'photo is blurred',
    })

    expect(needsMoreInfo.status).toBe('NEEDS_MORE_INFO')
    expect(needsMoreInfo.decisionReason).toBe('photo is blurred')

    const resubmitted = await deps.service.submitVerificationCase({
      actorUserId: applicantId,
      caseId: submitted.id,
      documents: [
        {
          assetId: null,
          maskedLabel: 'Business registration ending 6789',
          sourceType: 'VENDOR_REFERENCE',
          vendorReference: 'vendor-secret-ref-999',
        },
      ],
      expectedVersion: needsMoreInfo.version,
    })

    expect(resubmitted.status).toBe('PENDING')
    expect(resubmitted.resubmissionCount).toBe(1)

    const approved = await deps.service.reviewVerificationCase({
      actorUserId: reviewerId,
      caseId: resubmitted.id,
      decision: 'APPROVED',
      expectedVersion: resubmitted.version,
      reason: 'identity verified',
    })

    expect(approved.status).toBe('APPROVED')

    const overviewAfterApproval = await deps.service.getMyOverview({ userId: applicantId })
    expect(overviewAfterApproval.roles).toMatchObject([
      {
        roleCode: 'DESIGN_PROVIDER',
        status: 'ACTIVE',
      },
    ])

    const auditPayload = JSON.stringify(
      deps.auditCollector.snapshot().map((event) => event.payload),
    )
    expect(auditPayload).toContain('trust.kyc.reviewed')
    expect(auditPayload).not.toContain('vendor-secret-ref-999')
  })

  it('blocks unauthorized KYC reads and self-review while allowing audited reviewer access', async () => {
    const deps = createRepositories()
    const applicantId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb011')
    const reviewerId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb012')
    const supportId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb013')
    const unrelatedId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb014')

    await deps.users.create({ id: applicantId })
    await deps.users.create({ id: reviewerId })
    await deps.users.create({ id: supportId })
    await deps.users.create({ id: unrelatedId })
    await deps.userRoles.create({
      activatedAt: deps.clock.now(),
      createdBy: reviewerId,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb221'),
      roleCode: 'KYC_REVIEWER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: reviewerId,
      userId: reviewerId,
    })
    await deps.userRoles.create({
      activatedAt: deps.clock.now(),
      createdBy: supportId,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb222'),
      roleCode: 'SUPPORT_AGENT',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: supportId,
      userId: supportId,
    })

    const requestedRole = await deps.service.requestRoleActivation({
      actorUserId: applicantId,
      roleCode: 'PRINT_PROVIDER',
    })
    const submitted = await deps.service.submitVerificationCase({
      actorUserId: applicantId,
      caseId: requestedRole.verificationCaseId!,
      documents: [
        {
          assetId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb321'),
          maskedLabel: 'Passport ending 4321',
          sourceType: 'PRIVATE_ASSET',
          vendorReference: null,
        },
      ],
      expectedVersion: 1,
    })

    await expect(
      deps.service.getVerificationCase({
        actorUserId: supportId,
        auditReason: 'support queue',
        caseId: submitted.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)

    await expect(
      deps.service.getVerificationCase({
        actorUserId: unrelatedId,
        caseId: submitted.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)

    await expect(
      deps.service.reviewVerificationCase({
        actorUserId: applicantId,
        caseId: submitted.id,
        decision: 'APPROVED',
        expectedVersion: submitted.version,
        reason: 'self approve',
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)

    await expect(
      deps.service.getVerificationCase({
        actorUserId: reviewerId,
        auditReason: 'manual queue review',
        caseId: submitted.id,
      }),
    ).resolves.toMatchObject({
      id: submitted.id,
      status: 'PENDING',
    })
  })

  it('handles organization invitation acceptance, replay protection, and immediate revocation loss of access', async () => {
    const deps = createRepositories()
    const ownerId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb021')
    const financeId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb022')

    await deps.users.create({ id: ownerId })
    await deps.users.create({ id: financeId })

    const organization = await deps.service.createOrganization({
      actorUserId: ownerId,
      name: 'Factory Guild Co.',
    })

    const invitation = await deps.service.inviteOrganizationMember({
      actorUserId: ownerId,
      memberRoleCode: 'FINANCE_ADMIN',
      organizationId: organization.id,
      userId: financeId,
    })

    expect(invitation.status).toBe('INVITED')

    const accepted = await deps.service.acceptOrganizationInvitation({
      actorUserId: financeId,
      expectedVersion: invitation.version,
      membershipId: invitation.id,
    })

    expect(accepted.status).toBe('ACTIVE')

    await expect(
      deps.service.acceptOrganizationInvitation({
        actorUserId: financeId,
        expectedVersion: accepted.version,
        membershipId: accepted.id,
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })

    await expect(
      deps.service.getOrganization({
        actorUserId: financeId,
        organizationId: organization.id,
      }),
    ).resolves.toMatchObject({
      id: organization.id,
    })

    const revoked = await deps.service.updateOrganizationMembership({
      actorUserId: ownerId,
      expectedVersion: accepted.version,
      membershipId: accepted.id,
      reason: 'Finance access removed after offboarding',
      status: 'REVOKED',
    })

    expect(revoked.status).toBe('REVOKED')

    await expect(
      deps.service.getOrganization({
        actorUserId: financeId,
        organizationId: organization.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)
  })

  it('raises not found when an organization or case does not exist', async () => {
    const deps = createRepositories()
    const userId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb031')

    await deps.users.create({ id: userId })

    await expect(
      deps.service.getOrganization({
        actorUserId: userId,
        organizationId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb032'),
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)

    await expect(
      deps.service.getVerificationCase({
        actorUserId: userId,
        caseId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fb033'),
      }),
    ).rejects.toBeInstanceOf(TrustNotFoundError)
  })
})
